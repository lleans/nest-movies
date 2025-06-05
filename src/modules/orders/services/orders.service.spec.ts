import { NotFoundException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus, PaymentMethod } from '../entities/orders.entity';
import { OrderItem, SeatStatus } from '../entities/order-item.entity';
import { MovieSchedule } from '../entities/movies-schedule.entity';
import { Seat } from '@app/modules/studio/entities/seats.entity';
import { User } from '@app/modules/users/entities/users.entity';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateOrderDto } from '../dto/order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let orderItemRepository: jest.Mocked<Repository<OrderItem>>;
  let movieScheduleRepository: jest.Mocked<Repository<MovieSchedule>>;
  let seatRepository: jest.Mocked<Repository<Seat>>;
  let dataSource: jest.Mocked<DataSource>;
  let orderExpiryQueue: jest.Mocked<Queue>;
  const mockEntityManager = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    count: jest.fn(),
    getRepository: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  } as unknown as jest.Mocked<EntityManager>;

  const mockMovieSchedule = {
    id: 1,
    movieId: 1,
    studioId: 1,
    startTime: new Date('2023-12-01T14:00:00'),
    endTime: new Date('2023-12-01T16:00:00'),
    price: 50,
    date: new Date('2023-12-01'),
    bookedSeats: 5,
    movie: {
      id: 1,
      title: 'Test Movie',
      poster: 'https://example.com/poster.jpg',
      rating: 8.5,
    },
    studio: {
      id: 1,
      studioNumber: 1,
      seatCapacity: 100,
      hasImax: true,
      has3D: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSeat = {
    id: 1,
    studioId: 1,
    rowLabel: 'A',
    seatNumber: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  };

  const mockOrder = {
    id: 1,
    userId: 1,
    orderNumber: 'ORD-12345678-ABCDEF',
    paymentMethod: PaymentMethod.DEBIT,
    totalItemPrice: 150,
    status: OrderStatus.PENDING,
    expiresAt: new Date(Date.now() + 120000),
    user: mockUser,
    orderItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrderItems = [
    {
      id: 1,
      orderId: 1,
      movieScheduleId: 1,
      seatId: 1,
      qty: 1,
      price: 50,
      subTotalPrice: 50,
      status: SeatStatus.PENDING,
      snapshots: {
        movieTitle: 'Test Movie',
        moviePoster: 'https://example.com/poster.jpg',
        studioNumber: 1,
        startTime: '2023-12-01T14:00:00.000Z',
        endTime: '2023-12-01T16:00:00.000Z',
        date: '2023-12-01',
        priceAtPurchase: 50,
        seatLabel: 'A1',
      },
      seat: mockSeat,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
              getOne: jest.fn(),
            }),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MovieSchedule),
          useValue: {
            findOne: jest.fn(),
            increment: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getQueueToken('order-expiry'),
          useValue: {
            add: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn().mockResolvedValue(undefined),
              startTransaction: jest.fn().mockResolvedValue(undefined),
              commitTransaction: jest.fn().mockResolvedValue(undefined),
              rollbackTransaction: jest.fn().mockResolvedValue(undefined),
              release: jest.fn().mockResolvedValue(undefined),
              manager: mockEntityManager,
            }),
            transaction: jest.fn((callback) => callback(mockEntityManager)),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
    movieScheduleRepository = module.get(getRepositoryToken(MovieSchedule));
    seatRepository = module.get(getRepositoryToken(Seat));
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;
    orderExpiryQueue = module.get(getQueueToken('order-expiry'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new order successfully', async () => {
      const createOrderDto: CreateOrderDto = {
        movieScheduleId: 1,
        seatIds: [1],
        paymentMethod: PaymentMethod.DEBIT,
      }; // Setup mocks for validation
      (mockEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockMovieSchedule) // for movie schedule
        .mockResolvedValueOnce(mockUser); // for user
      (mockEntityManager.find as jest.Mock).mockResolvedValue([mockSeat]); // for seats
      (
        mockEntityManager.createQueryBuilder().getMany as jest.Mock
      ).mockResolvedValue([]); // no existing reservations      // Setup mocks for order creation
      (mockEntityManager.create as jest.Mock)
        .mockReturnValueOnce(mockOrder) // order
        .mockReturnValueOnce(mockOrderItems[0]); // order item

      (mockEntityManager.save as jest.Mock)
        .mockResolvedValueOnce(mockOrder) // order
        .mockResolvedValueOnce(mockOrderItems[0]); // order item

      const result = await service.create(createOrderDto, 1);

      expect(result).toBeDefined();
      expect(result.orderNumber).toBe(mockOrder.orderNumber);
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.orderItems).toHaveLength(1);
      expect(mockEntityManager.increment).toHaveBeenCalledWith(
        MovieSchedule,
        { id: 1 },
        'bookedSeats',
        1,
      );
      expect(orderExpiryQueue.add).toHaveBeenCalledWith(
        'expire-order',
        { orderId: 1 },
        expect.any(Object),
      );
    });

    it('should throw an error if movie schedule does not exist', async () => {
      const createOrderDto: CreateOrderDto = {
        movieScheduleId: 999,
        seatIds: [1],
        paymentMethod: PaymentMethod.DEBIT,
      };

      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(null); // movie schedule not found

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw an error if seats are already reserved', async () => {
      const createOrderDto: CreateOrderDto = {
        movieScheduleId: 1,
        seatIds: [1],
        paymentMethod: PaymentMethod.DEBIT,
      };
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(
        mockMovieSchedule,
      );
      (mockEntityManager.find as jest.Mock).mockResolvedValueOnce([mockSeat]);

      // Mock existing reservations
      (
        mockEntityManager.createQueryBuilder().getMany as jest.Mock
      ).mockResolvedValueOnce([{ id: 1 }]);
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        'Seats  are already reserved',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const mockOrderWithItems = {
        ...mockOrder,
        orderItems: mockOrderItems,
      };
      (
        orderRepository.createQueryBuilder().getManyAndCount as jest.Mock
      ).mockResolvedValue([[mockOrderWithItems], 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        includeDeleted: false,
      });

      expect(result.data).toHaveLength(1);
      expect(result.metadata.totalItems).toBe(1);
      expect(result.metadata.currentPage).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const mockOrderWithItems = {
        ...mockOrder,
        orderItems: mockOrderItems,
      };
      (
        orderRepository.createQueryBuilder().getOne as jest.Mock
      ).mockResolvedValue(mockOrderWithItems);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.orderItems).toHaveLength(1);
    });

    it('should throw an error if order not found', async () => {
      (
        orderRepository.createQueryBuilder().getOne as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUserOrders', () => {
    it('should return orders for a specific user', async () => {
      const mockOrderWithItems = {
        ...mockOrder,
        orderItems: mockOrderItems,
      }; // Mock the findAll method since findUserOrders uses it internally
      jest.spyOn(service, 'findAll').mockResolvedValue({
        data: [
          {
            ...mockOrderWithItems,
            expiresAt: mockOrderWithItems.expiresAt.toISOString(),
            createdAt: mockOrderWithItems.createdAt.toISOString(),
            updatedAt: mockOrderWithItems.updatedAt.toISOString(),
            orderItems: mockOrderWithItems.orderItems.map((item) => ({
              ...item,
              createdAt: item.createdAt.toISOString(),
              updatedAt: item.updatedAt.toISOString(),
            })),
          },
        ],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const result = await service.findUserOrders(1, {
        page: 1,
        limit: 10,
        includeDeleted: false,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(1);
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1 }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update order status to PAID', async () => {
      const mockOrderWithItems = {
        ...mockOrder,
        orderItems: mockOrderItems,
      };
      (mockEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockOrderWithItems,
      );
      (mockEntityManager.save as jest.Mock).mockResolvedValue({
        ...mockOrderWithItems,
        status: OrderStatus.PAID,
        paidAt: expect.any(Date),
      });

      const result = await service.updateStatus(1, {
        status: OrderStatus.PAID,
      });

      expect(result.status).toBe(OrderStatus.PAID);
      expect(result.paidAt).toBeDefined();
    });

    it('should throw an error if order not found', async () => {
      (mockEntityManager.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStatus(999, { status: OrderStatus.PAID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw an error for invalid status transition', async () => {
      const expiredOrder = {
        ...mockOrder,
        status: OrderStatus.EXPIRED,
      };

      (mockEntityManager.findOne as jest.Mock).mockResolvedValue(expiredOrder);
      await expect(
        service.updateStatus(1, { status: OrderStatus.PAID }),
      ).rejects.toThrow('Cannot change order status from EXPIRED to PAID');
    });
  });

  describe('expireOrder', () => {
    it('should expire an order and free seats', async () => {
      const mockOrderWithItems = {
        ...mockOrder,
        orderItems: mockOrderItems,
      };
      (mockEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockOrderWithItems,
      );
      (mockEntityManager.find as jest.Mock).mockResolvedValue(mockOrderItems);
      (mockEntityManager.save as jest.Mock)
        .mockResolvedValueOnce({
          ...mockOrderWithItems,
          status: OrderStatus.EXPIRED,
        })
        .mockResolvedValueOnce(mockOrderItems);
      (mockEntityManager.decrement as jest.Mock).mockResolvedValue({
        affected: 1,
      });

      await service.expireOrder(1);

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.EXPIRED }),
      );
    });
    it('should do nothing if order is already paid', async () => {
      // Clear previous mock calls
      jest.clearAllMocks();

      // Mock findOne to return null because the service looks for PENDING orders only
      // When order is PAID, it won't be found by the query with status: PENDING
      (mockEntityManager.findOne as jest.Mock).mockResolvedValue(null);

      await service.expireOrder(1);

      // Should not call save at all since no order was found
      expect(mockEntityManager.save).not.toHaveBeenCalled();
      expect(mockEntityManager.decrement).not.toHaveBeenCalled();
    });
  });
});
