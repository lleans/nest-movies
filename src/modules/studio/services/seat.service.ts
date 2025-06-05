import {
  PaginatedResponse,
  createPaginatedResponse,
} from '@app/common/dto/pagination.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateSeatDto, SeatResponseDto, UpdateSeatDto } from '../dto/seat.dto';
import { Seat } from '../entities/seats.entity';
import { Studio } from '../entities/studio.entity';

export interface SeatGenerationOptions {
  rowPattern?: string; // Default: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  seatsPerRow?: number; // If undefined, will be calculated based on capacity
  maxRowSize?: number; // Maximum seats in a row
  startSeatNumber?: number; // Default: 1
  customRowSizes?: Record<string, number>; // Specific size for each row, e.g. { 'A': 10, 'B': 12 }
}

@Injectable()
export class SeatService {
  constructor(
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(Studio)
    private readonly studioRepository: Repository<Studio>,
    private dataSource: DataSource,
  ) {}

  /**
   * Convert Seat entity to SeatResponseDto
   */
  private toSeatResponse(seat: Seat): SeatResponseDto {
    return {
      id: seat.id,
      studioId: seat.studioId,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      createdAt: seat.createdAt,
      updatedAt: seat.updatedAt,
      deletedAt: seat.deletedAt,
    };
  }

  /**
   * Find studio by ID
   */
  async findStudioById(id: number, withDeleted = false): Promise<Studio> {
    const studio = await this.studioRepository.findOne({
      where: { id },
      withDeleted,
    });
    if (!studio) {
      throw new NotFoundException(`Studio with ID ${id} not found`);
    }
    return studio;
  }

  /**
   * Find seat by ID
   */
  async findById(id: number, withDeleted = false): Promise<Seat> {
    const seat = await this.seatRepository.findOne({
      where: { id },
      relations: ['studio'],
      withDeleted,
    });
    if (!seat) {
      throw new NotFoundException('Seat not found');
    }
    return seat;
  }

  /**
   * Get all seats for a studio with pagination
   */
  async findAllByStudio(
    studioId: number,
    page: number = 1,
    limit: number = 50,
    includeDeleted = false,
  ): Promise<PaginatedResponse<SeatResponseDto>> {
    // Check if studio exists
    await this.findStudioById(studioId);

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get seats with pagination
    const [seats, total] = await this.seatRepository.findAndCount({
      where: { studioId },
      order: { rowLabel: 'ASC', seatNumber: 'ASC' },
      skip,
      take: limit,
      withDeleted: includeDeleted,
    });

    const seatResponseDtos = seats.map((seat) => this.toSeatResponse(seat));

    // Return paginated response
    return createPaginatedResponse(seatResponseDtos, page, limit, total);
  }

  /**
   * Generate seat entities based on studio capacity and options
   * This function doesn't save to DB, it just generates the entity objects
   */
  generateSeatEntities(
    studioId: number,
    seatCapacity: number,
    options: SeatGenerationOptions = {},
  ): Partial<Seat>[] {
    const {
      rowPattern = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      maxRowSize = 20,
      startSeatNumber = 1,
      customRowSizes,
    } = options;

    // Default calculation if seatsPerRow not provided
    let seatsPerRow = options.seatsPerRow;
    if (!seatsPerRow) {
      // Aim for roughly square layout if not specified
      seatsPerRow = Math.ceil(Math.sqrt(seatCapacity));
      // Cap at maxRowSize
      seatsPerRow = Math.min(seatsPerRow, maxRowSize);
    }

    const seatEntities: Partial<Seat>[] = [];
    let createdSeats = 0;
    let rowIndex = 0;

    while (createdSeats < seatCapacity && rowIndex < rowPattern.length) {
      const rowLabel = rowPattern[rowIndex];

      // Determine how many seats for this row
      const thisRowSize =
        customRowSizes && customRowSizes[rowLabel]
          ? customRowSizes[rowLabel]
          : seatsPerRow;

      // Create seats for this row
      for (
        let seatNum = startSeatNumber;
        createdSeats < seatCapacity && seatNum < startSeatNumber + thisRowSize;
        seatNum++
      ) {
        seatEntities.push({
          studioId,
          rowLabel,
          seatNumber: seatNum,
        });
        createdSeats++;
      }

      rowIndex++;
    }

    return seatEntities;
  }

  /**
   * Create seats for a studio - used within a transaction
   */
  async createSeatsForStudio(
    studioId: number,
    seatCapacity: number,
    options: SeatGenerationOptions = {},
    entityManager?: EntityManager,
  ): Promise<void> {
    const repo = entityManager
      ? entityManager.getRepository(Seat)
      : this.seatRepository;

    // Generate seat entities
    const seatEntities = this.generateSeatEntities(
      studioId,
      seatCapacity,
      options,
    );

    // Use bulk insert for better performance
    if (seatEntities.length > 0) {
      await repo
        .createQueryBuilder()
        .insert()
        .into(Seat)
        .values(seatEntities)
        .execute();
    }
  }

  /**
   * Create a single seat
   */
  async createSeat(createSeatDto: CreateSeatDto): Promise<SeatResponseDto> {
    const { studioId, rowLabel, seatNumber } = createSeatDto;

    // Check if studio exists
    await this.findStudioById(studioId);

    // Check for duplicate seat
    const existingSeat = await this.seatRepository.findOne({
      where: { studioId, rowLabel, seatNumber },
    });

    if (existingSeat) {
      throw new Error(
        `Seat ${rowLabel}${seatNumber} already exists in studio ${studioId}`,
      );
    }

    const seat = this.seatRepository.create(createSeatDto);
    const savedSeat = await this.seatRepository.save(seat);

    return this.toSeatResponse(savedSeat);
  }

  /**
   * Update a seat
   */
  async updateSeat(
    id: number,
    updateSeatDto: UpdateSeatDto,
  ): Promise<SeatResponseDto> {
    const seat = await this.findById(id);

    // If changing studio, verify the new studio exists
    if (updateSeatDto.studioId && updateSeatDto.studioId !== seat.studioId) {
      await this.findStudioById(updateSeatDto.studioId);
    }

    Object.assign(seat, updateSeatDto);
    const updatedSeat = await this.seatRepository.save(seat);

    return this.toSeatResponse(updatedSeat);
  }

  /**
   * Delete a seat (soft delete)
   */
  async removeSeat(id: number): Promise<{ message: string }> {
    await this.seatRepository.softDelete(id);

    return { message: 'Seat deleted successfully' };
  }

  /**
   * Delete all seats for a studio (soft delete)
   * Can be used within a transaction by passing entityManager
   */
  async removeAllSeatsForStudio(
    studioId: number,
    entityManager?: EntityManager,
  ): Promise<{ message: string; count: number }> {
    // First check if studio exists
    await this.findStudioById(studioId);

    const repo = entityManager
      ? entityManager.getRepository(Seat)
      : this.seatRepository;
    const result = await repo.softDelete({ studioId });

    return {
      message: 'Seats deleted successfully',
      count: result.affected || 0,
    };
  }

  /**
   * Permanently delete all seats for a studio
   * Used for regenerating seats completely
   * Can be used within a transaction by passing entityManager
   */
  async purgeAllSeatsForStudio(
    studioId: number,
    entityManager?: EntityManager,
  ): Promise<{ message: string; count: number }> {
    // First check if studio exists
    await this.findStudioById(studioId);

    const repo = entityManager
      ? entityManager.getRepository(Seat)
      : this.seatRepository;

    // First soft delete them all
    await repo.softDelete({ studioId });

    // Then permanently delete
    const result = await repo.delete({ studioId });

    return {
      message: 'Seats permanently removed',
      count: result.affected || 0,
    };
  }

  /**
   * Regenerate seats for a studio using a transaction
   */
  async regenerateSeatsForStudio(
    studioId: number,
    seatCapacity: number,
    options: SeatGenerationOptions = {},
  ): Promise<{ message: string }> {
    // Use a transaction to ensure consistency
    await this.dataSource.transaction(async (entityManager) => {
      // First purge all existing seats
      await this.purgeAllSeatsForStudio(studioId, entityManager);

      // Then create new seats
      await this.createSeatsForStudio(
        studioId,
        seatCapacity,
        options,
        entityManager,
      );
    });

    return {
      message: `Successfully regenerated ${seatCapacity} seats for studio ${studioId}`,
    };
  }

  /**
   * Bulk delete seats (soft delete)
   */
  async bulkRemoveSeats(
    ids: number[],
  ): Promise<{ message: string; count: number }> {
    const result = await this.seatRepository.softDelete(ids);

    return {
      message: 'Seats deleted successfully',
      count: result.affected || 0,
    };
  }
}
