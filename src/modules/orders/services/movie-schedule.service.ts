import {
  createPaginatedResponse,
  PaginatedResponse,
} from '@app/common/dto/pagination.dto';
import { Movie } from '@app/modules/movies/entities/movies.entity';
import { Seat } from '@app/modules/studio/entities/seats.entity';
import { Studio } from '@app/modules/studio/entities/studio.entity';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import {
  AvailableSeatsResponseDto,
  CreateMovieScheduleDto,
  MovieScheduleQueryDto,
  MovieScheduleResponseDto,
  SeatWithAvailabilityDto,
  UpdateMovieScheduleDto,
} from '../dto/movie-schedule.dto';
import { MovieSchedule } from '../entities/movies-schedule.entity';
import { OrderItem, SeatStatus } from '../entities/order-item.entity';
import { OrderStatus } from '../entities/orders.entity';

@Injectable()
export class MovieScheduleService {
  constructor(
    @InjectRepository(MovieSchedule)
    private readonly movieScheduleRepository: Repository<MovieSchedule>,
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Studio)
    private readonly studioRepository: Repository<Studio>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // =================== PUBLIC API METHODS ===================

  async createSchedule(
    createDto: CreateMovieScheduleDto,
  ): Promise<MovieScheduleResponseDto> {
    return this.executeTransaction(async (manager) => {
      // Validate dependencies
      await this.validateMovieExists(manager, createDto.movieId);
      await this.validateStudioExists(manager, createDto.studioId);

      // Parse and validate schedule times
      const scheduleDate = new Date(createDto.date);
      const { startTime, endTime } = this.parseAndValidateScheduleTimes(
        createDto.date,
        createDto.startTime,
        createDto.endTime,
      );

      // Check for overlapping schedules
      await this.checkScheduleOverlap(
        manager,
        createDto.studioId,
        scheduleDate,
        startTime,
        endTime,
      );

      // Create and save the schedule
      const schedule = manager.create(MovieSchedule, {
        ...createDto,
        startTime,
        endTime,
        date: scheduleDate,
      });

      const savedSchedule = await manager.save(MovieSchedule, schedule);

      // Load relations for response
      return this.loadScheduleWithRelations(manager, savedSchedule.id);
    });
  }

  async findAll(
    query: MovieScheduleQueryDto,
  ): Promise<PaginatedResponse<MovieScheduleResponseDto>> {
    const { page = 1, limit = 10, includeExpired = false } = query;

    const whereConditions = this.buildFindAllWhereConditions(query);

    // Handle special case when we need to combine date filters with "not expired" filter
    if (!includeExpired && this.hasDateFilters(query)) {
      return this.findAllWithComplexDateFilters(query, page, limit);
    }

    // Standard query path
    const [schedules, total] = await this.movieScheduleRepository.findAndCount({
      where: whereConditions,
      relations: ['movie', 'studio'],
      order: { date: 'ASC', startTime: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = await Promise.all(
      schedules.map((schedule) => this.toResponseDto(schedule)),
    );

    return createPaginatedResponse<MovieScheduleResponseDto>(
      data,
      page,
      limit,
      total,
    );
  }

  async findByMovieId(
    movieId: number,
    query: MovieScheduleQueryDto,
  ): Promise<PaginatedResponse<MovieScheduleResponseDto>> {
    return this.findAll({ ...query, movieId });
  }

  async findOne(id: number): Promise<MovieScheduleResponseDto> {
    const schedule = await this.movieScheduleRepository.findOne({
      where: { id },
      relations: ['movie', 'studio'],
    });

    if (!schedule) {
      throw new NotFoundException('Movie schedule not found');
    }

    return this.toResponseDto(schedule);
  }

  async updateSchedule(
    id: number,
    updateDto: UpdateMovieScheduleDto,
  ): Promise<MovieScheduleResponseDto> {
    return this.executeTransaction(async (manager) => {
      // Find the schedule
      const schedule = await this.findScheduleOrFail(manager, id);

      // Check for existing bookings
      await this.validateNoExistingBookings(manager, id);

      // Validate dependencies if updating
      if (updateDto.movieId) {
        await this.validateMovieExists(manager, updateDto.movieId);
      }

      if (updateDto.studioId) {
        await this.validateStudioExists(manager, updateDto.studioId);
      }

      // Handle time and date updates
      if (this.isUpdatingScheduleTiming(updateDto)) {
        await this.handleTimeAndDateUpdates(manager, schedule, updateDto, id);
      }

      // Apply direct property updates
      this.applyUpdatesToSchedule(schedule, updateDto);

      // Save and return
      const updatedSchedule = await manager.save(schedule);
      return this.loadScheduleWithRelations(manager, updatedSchedule.id);
    });
  }

  async remove(id: number): Promise<{ message: string }> {
    return this.executeTransaction(async (manager) => {
      const schedule = await this.findScheduleOrFail(manager, id);

      // Check for existing bookings
      await this.validateNoExistingBookings(manager, id);

      // Soft delete the schedule
      await manager.softDelete(MovieSchedule, id);

      // Also soft delete any pending reservations
      await this.cancelPendingReservations(manager, id);

      return { message: 'Movie schedule deleted successfully' };
    });
  }

  async getAvailableSeats(
    scheduleId: number,
  ): Promise<AvailableSeatsResponseDto> {
    return this.executeTransaction(async (manager) => {
      const schedule = await manager.findOne(MovieSchedule, {
        where: { id: scheduleId, deletedAt: null as any },
        relations: ['studio'],
      });

      if (!schedule) {
        throw new NotFoundException('Movie schedule not found');
      }

      // Validate schedule hasn't ended
      this.validateScheduleNotPast(schedule);

      // Get seats data
      const seats = await this.getSeatsWithAvailability(manager, schedule);

      return {
        scheduleId,
        totalSeats: schedule.studio.seatCapacity,
        bookedSeats: schedule.bookedSeats,
        availableSeats: schedule.studio.seatCapacity - schedule.bookedSeats,
        seats,
      };
    });
  }

  // =================== PRIVATE HELPER METHODS ===================

  // ----- Schedule validation methods -----

  private async checkScheduleOverlap(
    manager: EntityManager,
    studioId: number,
    date: Date,
    startTime: Date,
    endTime: Date,
    excludeScheduleId?: number,
  ): Promise<void> {
    const whereConditions: any = {
      studioId,
      date,
      deletedAt: IsNull(),
      startTime: LessThanOrEqual(endTime),
      endTime: MoreThanOrEqual(startTime),
    };

    if (excludeScheduleId) {
      whereConditions.id = Not(excludeScheduleId);
    }

    const overlappingSchedule = await manager.findOne(MovieSchedule, {
      where: whereConditions,
    });

    if (overlappingSchedule) {
      // Change from BadRequestException to ConflictException
      throw new ConflictException(
        'Schedule conflicts with existing schedule in this studio',
      );
    }
  }

  private async validateNoExistingBookings(
    manager: EntityManager,
    scheduleId: number,
  ): Promise<void> {
    const existingReservations = await manager.count(OrderItem, {
      where: {
        movieScheduleId: scheduleId,
        status: SeatStatus.CONFIRMED,
      },
    });

    if (existingReservations > 0) {
      throw new BadRequestException(
        'Cannot modify schedule with existing bookings',
      );
    }
  }

  private validateScheduleNotPast(schedule: MovieSchedule): void {
    const now = new Date();
    const scheduleDate = new Date(schedule.date);
    const scheduleTime = new Date(schedule.startTime);
    const scheduleDateTime = new Date(
      `${scheduleDate.toISOString().split('T')[0]}T${scheduleTime.toISOString().split('T')[1]}`,
    );

    if (scheduleDateTime < now) {
      throw new BadRequestException('Cannot book seats for past schedules');
    }
  }

  // ----- Entity validation methods -----

  private async validateMovieExists(
    manager: EntityManager,
    movieId: number,
  ): Promise<Movie> {
    const movie = await manager.findOne(Movie, {
      where: { id: movieId, deletedAt: null as any },
    });

    if (!movie) {
      throw new NotFoundException('Movie not found or has been deleted');
    }

    return movie;
  }

  private async validateStudioExists(
    manager: EntityManager,
    studioId: number,
  ): Promise<Studio> {
    const studio = await manager.findOne(Studio, {
      where: { id: studioId, deletedAt: null as any },
    });

    if (!studio) {
      throw new NotFoundException('Studio not found or has been deleted');
    }

    return studio;
  }

  private async findScheduleOrFail(
    manager: EntityManager,
    id: number,
  ): Promise<MovieSchedule> {
    const schedule = await manager.findOne(MovieSchedule, {
      where: { id, deletedAt: null as any },
    });

    if (!schedule) {
      throw new NotFoundException('Movie schedule not found');
    }

    return schedule;
  }

  // ----- Date and time handling methods -----

  private parseAndValidateScheduleTimes(
    dateStr: string,
    startTimeStr: string,
    endTimeStr: string,
  ): { startTime: Date; endTime: Date } {
    const startTime = new Date(`${dateStr}T${startTimeStr}:00`);
    const endTime = new Date(`${dateStr}T${endTimeStr}:00`);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid start time or end time format');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    return { startTime, endTime };
  }

  private isUpdatingScheduleTiming(updateDto: UpdateMovieScheduleDto): boolean {
    return !!(updateDto.startTime || updateDto.endTime || updateDto.date);
  }

  private async handleTimeAndDateUpdates(
    manager: EntityManager,
    schedule: MovieSchedule,
    updateDto: UpdateMovieScheduleDto,
    scheduleId: number,
  ): Promise<void> {
    // Get the date in YYYY-MM-DD format
    const dateStr =
      updateDto.date ||
      (schedule.date instanceof Date
        ? schedule.date.toISOString().split('T')[0]
        : new Date(schedule.date).toISOString().split('T')[0]);

    // Safely extract time strings
    const startTimeStr = this.getTimeStringSafely(
      updateDto.startTime,
      schedule.startTime,
    );
    const endTimeStr = this.getTimeStringSafely(
      updateDto.endTime,
      schedule.endTime,
    );

    // Create and validate the time objects
    const startTime = new Date(`${dateStr}T${startTimeStr}:00`);
    const endTime = new Date(`${dateStr}T${endTimeStr}:00`);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid time format');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for overlapping schedules if time/date/studio changed
    if (
      updateDto.startTime ||
      updateDto.endTime ||
      updateDto.date ||
      updateDto.studioId
    ) {
      const studioId = updateDto.studioId || schedule.studioId;
      const scheduleDate = new Date(dateStr);

      await this.checkScheduleOverlap(
        manager,
        studioId,
        scheduleDate,
        startTime,
        endTime,
        scheduleId, // Exclude current schedule
      );
    }

    // Update the schedule properties
    schedule.startTime = startTime;
    schedule.endTime = endTime;
    if (updateDto.date) {
      schedule.date = new Date(dateStr);
    }
  }

  private getTimeStringSafely(
    newTimeStr: string | undefined,
    existingTime: Date,
  ): string {
    if (newTimeStr) return newTimeStr;

    try {
      return existingTime instanceof Date
        ? existingTime.toTimeString().slice(0, 5)
        : new Date(existingTime).toTimeString().slice(0, 5);
    } catch (e) {
      throw new BadRequestException('Invalid existing time format');
    }
  }

  // ----- Query building methods -----

  private buildFindAllWhereConditions(query: MovieScheduleQueryDto): any {
    const {
      movieId,
      studioId,
      date,
      startDate,
      endDate,
      includeExpired = false,
    } = query;

    const whereConditions: any = {
      deletedAt: IsNull(),
      movie: { deletedAt: IsNull() },
      studio: { deletedAt: IsNull() },
    };

    if (movieId) whereConditions.movieId = movieId;
    if (studioId) whereConditions.studioId = studioId;
    if (date) whereConditions.date = date;

    if (startDate && endDate) {
      whereConditions.date = Between(startDate, endDate);
    } else if (startDate) {
      whereConditions.date = MoreThanOrEqual(startDate);
    } else if (endDate) {
      whereConditions.date = LessThanOrEqual(endDate);
    }

    // Add non-expired filter if needed
    if (!includeExpired && !this.hasDateFilters(query)) {
      const today = new Date().toISOString().split('T')[0];
      whereConditions.date = MoreThanOrEqual(today);
    }

    return whereConditions;
  }

  private hasDateFilters(query: MovieScheduleQueryDto): boolean {
    return !!(query.date || query.startDate || query.endDate);
  }

  private async findAllWithComplexDateFilters(
    query: MovieScheduleQueryDto,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<MovieScheduleResponseDto>> {
    const { movieId, studioId, date, startDate, endDate } = query;

    const today = new Date().toISOString().split('T')[0];

    // Use query builder for complex date conditions
    const qb = this.movieScheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.movie', 'movie')
      .leftJoinAndSelect('schedule.studio', 'studio')
      .where('schedule.deletedAt IS NULL')
      .andWhere('movie.deletedAt IS NULL')
      .andWhere('studio.deletedAt IS NULL');

    // Apply all non-date filters
    if (movieId) qb.andWhere('schedule.movieId = :movieId', { movieId });
    if (studioId) qb.andWhere('schedule.studioId = :studioId', { studioId });

    // Add date filter logic
    if (date) {
      qb.andWhere('schedule.date = :date', { date });
    } else if (startDate && endDate) {
      qb.andWhere('schedule.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      qb.andWhere('schedule.date >= :startDate', { startDate });
    } else if (endDate) {
      qb.andWhere('schedule.date <= :endDate', { endDate });
    }

    // Ensure we only show non-expired schedules
    qb.andWhere('schedule.date >= :today', { today });

    // Apply pagination
    qb.orderBy('schedule.date', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [schedules, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      schedules.map((schedule) => this.toResponseDto(schedule)),
    );

    return createPaginatedResponse<MovieScheduleResponseDto>(
      data,
      page,
      limit,
      total,
    );
  }

  // ----- Data transformation methods -----

  private applyUpdatesToSchedule(
    schedule: MovieSchedule,
    updateDto: UpdateMovieScheduleDto,
  ): void {
    if (updateDto.movieId !== undefined) {
      schedule.movieId = updateDto.movieId;
    }

    if (updateDto.studioId !== undefined) {
      schedule.studioId = updateDto.studioId;
    }

    if (updateDto.price !== undefined) {
      schedule.price = updateDto.price;
    }
  }

  private async loadScheduleWithRelations(
    manager: EntityManager,
    scheduleId: number,
  ): Promise<MovieScheduleResponseDto> {
    const scheduleWithRelations = await manager.findOne(MovieSchedule, {
      where: { id: scheduleId },
      relations: ['movie', 'studio'],
    });

    if (!scheduleWithRelations) {
      throw new NotFoundException('Movie schedule not found after saving');
    }

    return this.toResponseDto(scheduleWithRelations);
  }

  private async getSeatsWithAvailability(
    manager: EntityManager,
    schedule: MovieSchedule,
  ): Promise<SeatWithAvailabilityDto[]> {
    // Get all seats for the studio
    const allSeats = await manager.find(Seat, {
      where: { studioId: schedule.studioId, deletedAt: null as any },
      order: { rowLabel: 'ASC', seatNumber: 'ASC' },
    });

    // Get reserved seats for this schedule
    const reservedSeats = await manager
      .createQueryBuilder(OrderItem, 'orderItem')
      .leftJoin('orderItem.order', 'order')
      .where('orderItem.movieScheduleId = :scheduleId', {
        scheduleId: schedule.id,
      })
      .andWhere('orderItem.status = :status', {
        status: SeatStatus.CONFIRMED,
      })
      .andWhere('order.status != :expiredStatus', {
        expiredStatus: OrderStatus.EXPIRED,
      })
      .andWhere('order.status != :cancelledStatus', {
        cancelledStatus: OrderStatus.CANCELLED,
      })
      .getMany();

    const reservedSeatIds = new Set(reservedSeats.map((item) => item.seatId));

    return allSeats.map((seat) => ({
      id: seat.id,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      isAvailable: !reservedSeatIds.has(seat.id),
    }));
  }

  private async cancelPendingReservations(
    manager: EntityManager,
    scheduleId: number,
  ): Promise<void> {
    await manager.update(
      OrderItem,
      {
        movieScheduleId: scheduleId,
        status: SeatStatus.PENDING,
      },
      {
        deletedAt: new Date(),
      },
    );
  }

  // ----- Transaction helpers -----

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
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async toResponseDto(
    schedule: MovieSchedule,
  ): Promise<MovieScheduleResponseDto> {
    // Load relations if not already loaded
    if (!schedule.movie || !schedule.studio) {
      const loadedSchedule = await this.movieScheduleRepository.findOne({
        where: { id: schedule.id },
        relations: ['movie', 'studio'],
      });
      schedule = loadedSchedule || schedule;
    }

    const availableSeats = schedule.studio.seatCapacity - schedule.bookedSeats;
    const dateStr =
      schedule.date instanceof Date
        ? schedule.date.toISOString().split('T')[0]
        : new Date(schedule.date).toISOString().split('T')[0];

    return {
      id: Number(schedule.id),
      movieId: Number(schedule.movieId),
      studioId: Number(schedule.studioId),
      startTime: schedule.startTime.toISOString(),
      endTime: schedule.endTime.toISOString(),
      price: Number(schedule.price),
      date: dateStr,
      bookedSeats: Number(schedule.bookedSeats),
      availableSeats: Number(availableSeats),
      movie: {
        id: Number(schedule.movie.id),
        title: schedule.movie.title,
        poster: schedule.movie.poster,
        rating: schedule.movie.rating
          ? Number(schedule.movie.rating)
          : undefined,
      },
      studio: {
        id: Number(schedule.studio.id),
        studioNumber: Number(schedule.studio.studioNumber),
        seatCapacity: Number(schedule.studio.seatCapacity),
        hasImax: schedule.studio.hasImax,
        has3D: schedule.studio.has3D,
      },
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    };
  }
}
