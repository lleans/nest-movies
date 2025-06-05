import {
  PaginatedResponse,
  createPaginationMetadata,
} from '@app/common/dto/pagination.dto';
import { Seat } from '@app/modules/studio/entities/seats.entity';
import { User } from '@app/modules/users/entities/users.entity';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  CreateOrderDto,
  OrderQueryDto,
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../dto/order.dto';
import { MovieSchedule } from '../entities/movies-schedule.entity';
import { OrderItem, SeatStatus } from '../entities/order-item.entity';
import { Order, OrderStatus } from '../entities/orders.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly DEFAULT_ORDER_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(MovieSchedule)
    private movieScheduleRepository: Repository<MovieSchedule>,
    @InjectRepository(Seat)
    private seatRepository: Repository<Seat>,
    @InjectQueue('order-expiry')
    private orderExpiryQueue: Queue,
    private dataSource: DataSource,
  ) {}

  // =================== PUBLIC API METHODS ===================

  async create(
    createOrderDto: CreateOrderDto,
    userId: number,
  ): Promise<OrderResponseDto> {
    return this.executeTransaction(async (manager) => {
      // Validate and get movie schedule
      const { movieSchedule, seats } = await this.validateOrderRequest(
        manager,
        createOrderDto,
      );

      // Create order record
      const orderData = await this.createOrderRecord(
        manager,
        createOrderDto,
        userId,
        movieSchedule,
        seats,
      );

      // Schedule order expiry
      await this.scheduleOrderExpiry(
        orderData.order.id,
        this.DEFAULT_ORDER_EXPIRY_MS,
      );

      this.logger.log(
        `Order ${orderData.order.orderNumber} created for user ${userId}`,
      );

      return this.mapToResponseDto(
        { ...orderData.order },
        orderData.orderItems,
        seats, // Pass seats to ensure they're included in response
      );
    });
  }

  async findAll(
    query: OrderQueryDto,
  ): Promise<PaginatedResponse<OrderResponseDto>> {
    const { page = 1, limit = 10 } = query;

    try {
      const queryBuilder = this.buildOrderQuery(query);

      // Add pagination
      queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .orderBy('order.createdAt', 'DESC');

      const [orders, totalItems] = await queryBuilder.getManyAndCount();

      // Fix: Ensure orders are properly loaded with all relations
      if (orders.length === 0 && totalItems > 0) {
        this.logger.warn('Orders found but failed to load with relations');
      }

      const data = orders.map((order) => this.mapToResponseDto(order));
      const metadata = createPaginationMetadata(page, limit, totalItems);

      return { data, metadata };
    } catch (error) {
      this.logger.error(`Error finding orders: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<OrderResponseDto> {
    const order = await this.findOrderWithRelations(id);
    return this.mapToResponseDto(order);
  }

  async findUserOrders(
    userId: number,
    query: OrderQueryDto,
  ): Promise<PaginatedResponse<OrderResponseDto>> {
    return this.findAll({ ...query, userId });
  }

  async updateStatus(
    id: number,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const { status } = updateOrderStatusDto;

    return this.executeTransaction(async (manager) => {
      // Get order with all necessary relations
      const order = await this.findOrderWithRelationsInTransaction(manager, id);

      // Validate status change is allowed
      await this.validateStatusChange(order, status);

      // Perform the status update
      const updatedOrder = await this.performStatusUpdate(
        manager,
        order,
        status,
      );

      this.logger.log(
        `Order ${order.orderNumber} status changed from ${order.status} to ${status}`,
      );

      return this.mapToResponseDto(updatedOrder);
    });
  }

  async expireOrder(orderId: number): Promise<void> {
    await this.executeTransaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId, status: OrderStatus.PENDING },
        relations: ['orderItems'],
      });

      if (!order) {
        this.logger.warn(
          `Order ${orderId} not found or not pending for expiry`,
        );
        return;
      }

      order.status = OrderStatus.EXPIRED;
      // Simplified to use consistent API style
      await manager.save(order);

      await this.freeOrderItemsSeats(manager, order);

      this.logger.log(`Order ${order.orderNumber} expired automatically`);
    });
  }

  // =================== PRIVATE HELPER METHODS ===================

  // ----- Validation methods ----

  private async validateOrderRequest(
    manager: EntityManager,
    createOrderDto: CreateOrderDto,
  ): Promise<{
    movieSchedule: MovieSchedule & { movie: any; studio: any };
    seats: Seat[];
  }> {
    const { movieScheduleId, seatIds } = createOrderDto;

    // Get movie schedule with studio information
    const movieSchedule = await manager.findOne(MovieSchedule, {
      where: { id: movieScheduleId },
      relations: ['movie', 'studio'],
    });

    if (!movieSchedule) {
      throw new NotFoundException('Movie schedule not found');
    }

    // Validate schedule is not expired
    this.validateScheduleNotExpired(movieSchedule);

    // Check if all seats exist and belong to the correct studio
    const seats = await manager.find(Seat, {
      where: { id: In(seatIds), studioId: movieSchedule.studioId },
    });

    // Convert both sets to strings and ensure consistent formatting
    const foundSeatIds = new Set(seats.map((seat) => String(seat.id)));
    const requestedSeatIdsAsStrings = seatIds.map((id) => String(id));

    // Find missing seats by checking which IDs don't exist in the found set
    const missingSeatIds = requestedSeatIdsAsStrings.filter(
      (id) => !foundSeatIds.has(id),
    );

    if (missingSeatIds.length > 0) {
      throw new BadRequestException(
        `Seats with IDs ${missingSeatIds.join(
          ', ',
        )} not found or do not belong to studio ${movieSchedule.studioId}`,
      );
    }

    // Check if seats are available
    await this.validateSeatsAvailable(manager, movieScheduleId, seatIds);

    // Check available capacity
    this.validateSufficientCapacity(movieSchedule, seatIds.length);

    return { movieSchedule, seats };
  }

  private validateScheduleNotExpired(movieSchedule: MovieSchedule): void {
    const now = new Date();
    const scheduleDateTime = new Date(
      `${movieSchedule.date}T${movieSchedule.startTime}`,
    );

    if (scheduleDateTime <= now) {
      throw new BadRequestException(
        'Cannot book tickets for past or ongoing shows',
      );
    }
  }

  private async validateSeatsAvailable(
    manager: EntityManager,
    movieScheduleId: number,
    seatIds: number[],
  ): Promise<void> {
    const existingReservations = await manager
      .createQueryBuilder(OrderItem, 'orderItem')
      .leftJoin('orderItem.order', 'order')
      .where('orderItem.seatId IN (:...seatIds)', { seatIds })
      .andWhere('orderItem.movieScheduleId = :movieScheduleId', {
        movieScheduleId,
      })
      .andWhere('order.status NOT IN (:...expiredStatuses)', {
        expiredStatuses: [OrderStatus.EXPIRED, OrderStatus.CANCELLED],
      })
      .getMany();

    if (existingReservations.length > 0) {
      const reservedSeatIds = existingReservations.map((r) => r.seatId);
      throw new BadRequestException(
        `Seats ${reservedSeatIds.join(', ')} are already reserved`,
      );
    }
  }

  private validateSufficientCapacity(
    movieSchedule: MovieSchedule,
    requestedSeats: number,
  ): void {
    const availableSeats =
      movieSchedule.studio.seatCapacity - movieSchedule.bookedSeats;
    if (requestedSeats > availableSeats) {
      throw new BadRequestException(`Only ${availableSeats} seats available`);
    }
  }

  // ----- Order creation methods ----

  private async createOrderRecord(
    manager: EntityManager,
    createOrderDto: CreateOrderDto,
    userId: number,
    movieSchedule: MovieSchedule,
    seats: Seat[],
  ): Promise<{
    order: Order;
    orderItems: OrderItem[];
    user: User;
  }> {
    const { seatIds, paymentMethod } = createOrderDto;

    // Create a map of seats by ID for faster lookup - convert keys to strings
    const seatMap = new Map<string, Seat>();
    seats.forEach((seat) => seatMap.set(String(seat.id), seat));

    // Generate order number
    const orderNumber = this.generateOrderNumber();

    // Calculate total price
    const totalPrice = Number(movieSchedule.price) * seatIds.length;

    // Set expiry time (using default 2 minutes)
    const expiresAt = new Date(Date.now() + this.DEFAULT_ORDER_EXPIRY_MS);

    // Create order
    const order = manager.create(Order, {
      userId,
      orderNumber,
      paymentMethod,
      totalItemPrice: totalPrice,
      status: OrderStatus.PENDING,
      expiresAt,
    });

    const savedOrder = await manager.save(order);

    // Create order items with seat information (one per seat)
    const orderItems: OrderItem[] = [];

    for (let i = 0; i < seatIds.length; i++) {
      const seatId = seatIds[i];
      const seat = seatMap.get(String(seatId));

      if (!seat) {
        // This should never happen due to our improved validation, but let's handle it just in case
        this.logger.error(
          `Seat with ID ${seatId} not found after validation passed`,
        );
        throw new BadRequestException(`Seat with ID ${seatId} not found`);
      }

      // Create order item with movie details snapshot and seat information
      const orderItem = await this.createOrderItem(
        manager,
        savedOrder.id,
        movieSchedule,
        seat,
      );

      orderItems.push(orderItem);
    }

    // Update booked seats count
    await this.incrementBookedSeats(manager, movieSchedule.id, seatIds.length);

    // Get user information for response
    const user = await this.getUserDetails(manager, userId);

    return { order: savedOrder, orderItems, user };
  }

  private async createOrderItem(
    manager: EntityManager,
    orderId: number,
    movieSchedule: MovieSchedule,
    seat: Seat,
  ): Promise<OrderItem> {
    // Create snapshots for order item
    const snapshots = {
      movieTitle: movieSchedule.movie.title,
      moviePoster: movieSchedule.movie.poster,
      studioNumber: movieSchedule.studio.studioNumber,
      startTime: new Date(movieSchedule.startTime).toISOString(),
      endTime: new Date(movieSchedule.endTime).toISOString(),
      date: new Date(movieSchedule.date).toISOString().split('T')[0],
      priceAtPurchase: Number(movieSchedule.price),
      seatLabel: `${seat.rowLabel}${seat.seatNumber}`,
    };

    // Create order item with seat information
    const orderItem = manager.create(OrderItem, {
      orderId,
      movieScheduleId: movieSchedule.id,
      seatId: seat.id,
      seat: seat, // Store the seat entity directly
      qty: 1,
      price: movieSchedule.price,
      subTotalPrice: movieSchedule.price,
      status: SeatStatus.PENDING,
      snapshots,
    });

    return manager.save(orderItem);
  }

  private async incrementBookedSeats(
    manager: EntityManager,
    movieScheduleId: number,
    quantity: number,
  ): Promise<void> {
    await manager.increment(
      MovieSchedule,
      { id: movieScheduleId },
      'bookedSeats',
      quantity,
    );
  }

  private async getUserDetails(
    manager: EntityManager,
    userId: number,
  ): Promise<User> {
    const user = await manager.findOne(User, {
      where: { id: userId },
      select: ['id', 'name', 'email'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // ----- Status update methods ----

  private async performStatusUpdate(
    manager: EntityManager,
    order: Order,
    newStatus: OrderStatus,
  ): Promise<Order> {
    try {
      // Prepare all changes in memory first
      order.status = newStatus;

      if (newStatus === OrderStatus.PAID) {
        order.paidAt = new Date();
      }

      // Save the order first to update its status
      await manager.save(order);

      // Then update related entities based on the new status
      if (newStatus === OrderStatus.PAID) {
        await this.confirmOrderItemsStatus(manager, order);
      } else if (
        newStatus === OrderStatus.CANCELLED ||
        newStatus === OrderStatus.EXPIRED
      ) {
        await this.freeOrderItemsSeats(manager, order);
      }

      // Re-fetch to get latest state with all changes
      return await this.findOrderWithRelationsInTransaction(manager, order.id);
    } catch (error) {
      this.logger.error(
        `Failed to update order ${order.id} status to ${newStatus}: ${error.message}`,
        error.stack,
      );
      // The executeTransaction wrapper will handle rollback
      throw error;
    }
  }

  private async confirmOrderItemsStatus(
    manager: EntityManager,
    order: Order,
  ): Promise<void> {
    // Fix: Query for all order items first, then update them individually
    const orderItems = await manager.find(OrderItem, {
      where: { orderId: order.id },
    });

    if (orderItems.length === 0) {
      this.logger.warn(`No order items found for order ${order.id}`);
      return;
    }

    // Update each item individually to ensure the status changes
    for (const item of orderItems) {
      item.status = SeatStatus.CONFIRMED;
    }

    await manager.save(orderItems);
  }

  private async freeOrderItemsSeats(
    manager: EntityManager,
    order: Order,
  ): Promise<void> {
    // Get all order items for this order
    const orderItems = await manager.find(OrderItem, {
      where: { orderId: order.id },
    });

    if (orderItems.length === 0) {
      this.logger.warn(`No order items found for order ${order.id}`);
      return;
    }

    // Update each item individually to ensure the status changes
    for (const item of orderItems) {
      item.status = SeatStatus.CANCELLED;
    }

    // Save the updated items
    await manager.save(orderItems);

    // Decrement booked seats count for each movie schedule
    const movieScheduleMap = new Map<number, number>();

    for (const item of orderItems) {
      const currentCount = movieScheduleMap.get(item.movieScheduleId) || 0;
      movieScheduleMap.set(item.movieScheduleId, currentCount + item.qty);
    }

    for (const [scheduleId, count] of movieScheduleMap.entries()) {
      await manager.decrement(
        MovieSchedule,
        { id: scheduleId },
        'bookedSeats',
        count,
      );
    }
  }

  // ----- Queue methods ----

  /**
   * Schedule an order to expire after the specified timeout
   * @param orderId The order ID to expire
   * @param timeoutMs Timeout in milliseconds (defaults to 2 minutes)
   */
  private async scheduleOrderExpiry(
    orderId: number,
    timeoutMs: number = this.DEFAULT_ORDER_EXPIRY_MS,
  ): Promise<void> {
    await this.orderExpiryQueue.add(
      'expire-order',
      { orderId },
      { delay: timeoutMs },
    );
  }

  // ----- Query methods ----

  private buildOrderQuery(query: OrderQueryDto) {
    const { status, userId, paymentMethod, orderNumber } = query;

    // Fix: Use a more explicit query to ensure all relations are loaded properly
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.orderItems', 'orderItem')
      .leftJoinAndSelect('orderItem.seat', 'seat');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('order.userId = :userId', { userId });
    }

    if (paymentMethod) {
      queryBuilder.andWhere('order.paymentMethod = :paymentMethod', {
        paymentMethod,
      });
    }

    // Fix: Use ILIKE for case-insensitive search and simplify the pattern match
    if (orderNumber) {
      queryBuilder.andWhere(
        'LOWER(order.orderNumber) LIKE LOWER(:orderNumber)',
        {
          orderNumber: `%${orderNumber}%`,
        },
      );
    }

    return queryBuilder;
  }

  private async findOrderWithRelations(id: number): Promise<Order> {
    // Fix: Use a more explicit query to ensure all relations are loaded properly
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.orderItems', 'orderItem')
      .leftJoinAndSelect('orderItem.seat', 'seat')
      .where('order.id = :id', { id })
      .getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private async findOrderWithRelationsInTransaction(
    manager: EntityManager,
    id: number,
  ): Promise<Order> {
    const order = await manager.findOne(Order, {
      where: { id },
      relations: ['user', 'orderItems', 'orderItems.seat'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // ----- Utility methods ----

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp.slice(-8)}-${random}`;
  }

  private async executeTransaction<T>(
    operation: (entityManager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transaction failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private mapToResponseDto(
    order: Order & { user?: User },
    orderItems?: OrderItem[],
    seats?: Seat[],
  ): OrderResponseDto {
    const items = orderItems || order.orderItems || [];

    // Create a map of seat objects by ID for quick lookup
    const seatMap = new Map<number, Seat>();
    if (seats && seats.length > 0) {
      seats.forEach((seat) => seatMap.set(seat.id, seat));
    }

    return {
      id: Number(order.id),
      userId: Number(order.userId),
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      totalItemPrice: Number(order.totalItemPrice),
      status: order.status,
      expiresAt: order.expiresAt.toISOString(),
      paidAt: order.paidAt?.toISOString(),
      user: order.user
        ? {
            id: Number(order.user.id),
            name: order.user.name,
            email: order.user.email,
          }
        : undefined,
      orderItems: items.map((item) => {
        // Get seat from the map or from the item
        const seat = seatMap.get(item.seatId) || item.seat;

        return {
          id: Number(item.id),
          orderId: Number(item.orderId),
          movieScheduleId: Number(item.movieScheduleId),
          seatId: Number(item.seatId),
          status: item.status,
          qty: Number(item.qty),
          price: Number(item.price),
          subTotalPrice: Number(item.subTotalPrice),
          snapshots: item.snapshots,
          seat: seat
            ? {
                id: Number(seat.id),
                rowLabel: seat.rowLabel,
                seatNumber: Number(seat.seatNumber),
              }
            : undefined,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        };
      }),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private async validateStatusChange(
    order: Order,
    newStatus: OrderStatus,
  ): Promise<void> {
    // Define allowed transitions
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [
        OrderStatus.PAID,
        OrderStatus.CANCELLED,
        OrderStatus.EXPIRED,
      ],
      [OrderStatus.PAID]: [OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED]: [], // No transitions allowed from CANCELLED
      [OrderStatus.EXPIRED]: [], // No transitions allowed from EXPIRED
      [OrderStatus.FAILED]: [OrderStatus.PENDING], // Allow retry from FAILED
    };

    // Check if the transition is allowed
    if (!allowedTransitions[order.status].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot change order status from ${order.status} to ${newStatus}`,
      );
    }

    // Additional validation for specific transitions
    if (newStatus === OrderStatus.PAID && order.expiresAt < new Date()) {
      throw new BadRequestException('Cannot pay for an expired order');
    }
  }
}
