import {
  PaginatedResponse,
  createPaginatedResponse,
} from '@app/common/dto/pagination.dto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, FindManyOptions, Repository } from 'typeorm';
import {
  CreateStudioDto,
  CreateStudioResponseDto,
  DeleteStudioResponseDto,
  GetStudiosQueryDto,
  StudioResponseDto,
  UpdateStudioDto,
  UpdateStudioResponseDto,
} from '../dto/studio.dto';
import { Studio } from '../entities/studio.entity';
import { SeatGenerationOptions, SeatService } from './seat.service';

@Injectable()
export class StudioService {
  constructor(
    @InjectRepository(Studio)
    private readonly studioRepository: Repository<Studio>,
    private readonly seatService: SeatService,
    private dataSource: DataSource,
  ) {}

  /**
   * Find studio by ID
   */
  async findById(id: number, withDeleted?: boolean): Promise<Studio> {
    const studio = await this.studioRepository.findOne({
      where: { id },
      withDeleted,
    });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }
    return studio;
  }

  /**
   * Find studio by studio number
   */
  async findByStudioNumber(studioNumber: number): Promise<Studio | null> {
    return await this.studioRepository.findOne({ where: { studioNumber } });
  }

  /**
   * Convert Studio entity to StudioResponseDto
   */
  private toStudioResponse(studio: Studio): StudioResponseDto {
    return {
      id: studio.id,
      studioNumber: studio.studioNumber,
      seatCapacity: studio.seatCapacity,
      hasImax: studio.hasImax,
      has3D: studio.has3D,
      isActive: studio.isActive,
      createdAt: studio.createdAt,
      updatedAt: studio.updatedAt,
      deletedAt: studio.deletedAt,
    };
  }

  /**
   * Get all studios with pagination and filtering
   */
  async findAll(
    query: GetStudiosQueryDto,
  ): Promise<PaginatedResponse<StudioResponseDto>> {
    const {
      page = 1,
      limit = 10,
      isActive,
      hasImax,
      has3D,
      minCapacity,
      maxCapacity,
      studioNumber,
      includeDeleted,
    } = query;

    const whereClause: any = {};

    // Apply filters
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    if (hasImax !== undefined) {
      whereClause.hasImax = hasImax;
    }

    if (has3D !== undefined) {
      whereClause.has3D = has3D;
    }

    if (studioNumber !== undefined) {
      whereClause.studioNumber = studioNumber;
    }

    // Handle capacity range
    if (minCapacity !== undefined || maxCapacity !== undefined) {
      const min = minCapacity || 0;
      const max = maxCapacity || 9999;
      whereClause.seatCapacity = Between(min, max);
    }

    const options: FindManyOptions<Studio> = {
      where: whereClause,
      order: { studioNumber: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
      withDeleted: includeDeleted,
    };

    const [studios, total] = await this.studioRepository.findAndCount(options);

    const studioResponseDtos = studios.map((studio) =>
      this.toStudioResponse(studio),
    );

    return createPaginatedResponse(studioResponseDtos, page, limit, total);
  }

  /**
   * Get studio by ID
   */
  async findOne(
    id: number,
    includeDeleted?: boolean,
  ): Promise<StudioResponseDto> {
    const studio = await this.findById(id, includeDeleted);
    return this.toStudioResponse(studio);
  }

  /**
   * Create a new studio with seats in a transaction
   */
  async create(
    createStudioDto: CreateStudioDto,
    seatOptions?: SeatGenerationOptions,
  ): Promise<CreateStudioResponseDto> {
    // Check if studio number already exists
    const existingStudio = await this.findByStudioNumber(
      createStudioDto.studioNumber,
    );
    if (existingStudio) {
      throw new ConflictException(
        `Studio with number ${createStudioDto.studioNumber} already exists`,
      );
    }

    // Use transaction to ensure studio and seats are created together
    const result = await this.dataSource.transaction(async (entityManager) => {
      // Create studio
      const studio = entityManager.create(Studio, createStudioDto);
      const savedStudio = await entityManager.save(Studio, studio);

      // Create seats in the same transaction
      await this.seatService.createSeatsForStudio(
        savedStudio.id,
        savedStudio.seatCapacity,
        seatOptions,
        entityManager,
      );

      return {
        message: 'Studio created successfully',
        studio: this.toStudioResponse(savedStudio),
      };
    });

    return result;
  }

  /**
   * Update studio and handle seat capacity changes in a transaction if needed
   */
  async update(
    id: number,
    updateStudioDto: UpdateStudioDto,
    seatOptions?: SeatGenerationOptions,
  ): Promise<UpdateStudioResponseDto> {
    const studio = await this.findById(id, updateStudioDto.recover);

    // Check if studio number is being updated and if it already exists
    if (
      updateStudioDto.studioNumber !== undefined &&
      updateStudioDto.studioNumber !== studio.studioNumber
    ) {
      const existingStudio = await this.findByStudioNumber(
        updateStudioDto.studioNumber,
      );
      if (existingStudio) {
        throw new ConflictException(
          `Studio with number ${updateStudioDto.studioNumber} already exists`,
        );
      }
    }

    const { recover, ...otherUpdateData } = updateStudioDto;

    // Prepare update data
    const updateData: Partial<Studio> = {
      ...otherUpdateData,
      updatedAt: new Date(),
    };

    if (recover) {
      updateData.deletedAt = null as any;
    }

    // If seat capacity is changing, we need to update seats too
    if (
      updateStudioDto.seatCapacity !== undefined &&
      updateStudioDto.seatCapacity !== studio.seatCapacity
    ) {
      // Use transaction to ensure studio and seats are updated atomically
      return await this.dataSource.transaction(async (entityManager) => {
        // Update studio first
        await entityManager.update(Studio, id, updateData);

        // Remove existing seats and create new ones based on new capacity
        await this.seatService.purgeAllSeatsForStudio(id, entityManager);
        await this.seatService.createSeatsForStudio(
          id,
          updateStudioDto.seatCapacity as number,
          seatOptions,
          entityManager,
        );

        // Fetch updated studio
        const updatedStudio = await entityManager.findOne(Studio, {
          where: { id },
        });

        return {
          message: 'Studio updated successfully with new seat capacity',
          studio: this.toStudioResponse(updatedStudio as Studio),
        };
      });
    } else {
      // Simple update without changing seats
      await this.studioRepository.update(id, updateData);

      // Fetch updated studio
      const updatedStudio = await this.findById(id);

      return {
        message: 'Studio updated successfully',
        studio: this.toStudioResponse(updatedStudio),
      };
    }
  }

  /**
   * Delete studio and its seats in a transaction
   */
  async remove(id: number): Promise<DeleteStudioResponseDto> {
    // Check if studio exists
    await this.findById(id);

    // Use transaction to ensure studio and seats are deleted together
    return await this.dataSource.transaction(async (entityManager) => {
      // Soft delete seats first
      await this.seatService.removeAllSeatsForStudio(id, entityManager);

      // Then soft delete the studio
      await entityManager.softDelete(Studio, id);

      return {
        message: 'Studio deleted successfully',
      };
    });
  }

  /**
   * Bulk delete studios and their seats in a transaction
   */
  async bulkRemove(ids: number[]): Promise<{ message: string; count: number }> {
    // Use transaction to ensure studios and seats are deleted together
    return await this.dataSource.transaction(async (entityManager) => {
      let totalDeleted = 0;

      // Soft delete seats for each studio
      for (const id of ids) {
        try {
          // Skip if studio doesn't exist instead of throwing error
          const studio = await entityManager.findOne(Studio, { where: { id } });
          if (studio) {
            await this.seatService.removeAllSeatsForStudio(id, entityManager);
            totalDeleted++;
          }
        } catch (error) {
          // Skip if there's an error with this studio
          console.error(`Error processing studio ID ${id}:`, error);
        }
      }

      // Then soft delete the studios
      await entityManager.softDelete(Studio, ids);

      return {
        message: 'Studios deleted successfully',
        count: totalDeleted,
      };
    });
  }

  /**
   * Get studio statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    withImax: number;
    with3D: number;
    totalCapacity: number;
    averageCapacity: number;
  }> {
    const [total, active, inactive, withImax, with3D, capacityStats] =
      await Promise.all([
        this.studioRepository.count(),
        this.studioRepository.count({ where: { isActive: true } }),
        this.studioRepository.count({ where: { isActive: false } }),
        this.studioRepository.count({ where: { hasImax: true } }),
        this.studioRepository.count({ where: { has3D: true } }),
        this.studioRepository
          .createQueryBuilder('studio')
          .select('SUM(studio.seatCapacity)', 'totalCapacity')
          .addSelect('AVG(studio.seatCapacity)', 'averageCapacity')
          .getRawOne(),
      ]);

    return {
      total,
      active,
      inactive,
      withImax,
      with3D,
      totalCapacity: parseInt(capacityStats.totalCapacity) || 0,
      averageCapacity: parseFloat(capacityStats.averageCapacity) || 0,
    };
  }
}
