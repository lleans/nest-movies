import {
  BulkDeleteDto,
  bulkDeleteSchema,
} from '@app/common/dto/bulk-delete.dto';
import {
  CommonErrorSchemas,
  SeatErrorSchemas,
  StudioErrorSchemas,
} from '@app/common/dto/error-response.dto';
import { PaginatedResponse } from '@app/common/dto/pagination.dto';
import { ZodValidationPipe } from '@app/common/pipes/zod-validation/zod-validation.pipe';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAdmin } from '../../auth/guards/admin.guard';
import {
  BulkCreateSeatsDto,
  BulkCreateSeatsSchema,
  CreateSeatDto,
  CreateSeatSchema,
  GetSeatsQueryDto,
  GetSeatsQuerySchema,
  SeatResponseDto,
  UpdateSeatDto,
  UpdateSeatSchema,
} from '../dto/seat.dto';
import { SeatService } from '../services/seat.service';

@Controller('seats')
@ApiTags('Seats')
@RequireAdmin
export class SeatController {
  constructor(private readonly seatService: SeatService) {}

  /**
   * Get all seats for a studio with pagination
   */
  @Get('studio/:studioId')
  @ApiOperation({
    summary: 'Get all seats for a studio',
    description:
      'Retrieve all seats for a specific studio with pagination. Only accessible by administrators.',
  })
  @ApiParam({ name: 'studioId', type: Number, description: 'Studio ID' })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Items per page (default: 50, max: 200)',
    example: 50,
  })
  @ApiQuery({
    name: 'includeDeleted',
    type: Boolean,
    required: false,
    description: 'Include deleted seats in the results',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved seats',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OK' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              studioId: { type: 'number', example: 1 },
              rowLabel: { type: 'string', example: 'A' },
              seatNumber: { type: 'number', example: 1 },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              deletedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            totalItems: { type: 'number', example: 150 },
            currentPage: { type: 'number', example: 1 },
            itemsPerPage: { type: 'number', example: 50 },
            totalPages: { type: 'number', example: 3 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Studio not found',
    schema: StudioErrorSchemas.StudioNotFound,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    schema: CommonErrorSchemas.Forbidden,
  })
  async findAllByStudio(
    @Param('studioId', ParseIntPipe) studioId: number,
    @Query(new ZodValidationPipe(GetSeatsQuerySchema)) query: GetSeatsQueryDto,
  ): Promise<PaginatedResponse<SeatResponseDto>> {
    const { page = 1, limit = 50, includeDeleted = false } = query;
    return await this.seatService.findAllByStudio(
      studioId,
      page,
      limit,
      includeDeleted,
    );
  }

  /**
   * Create a single seat
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new seat',
    description:
      'Create a new seat in a studio. Only accessible by administrators.',
  })
  @ApiBody({
    description: 'Seat creation data',
    schema: {
      type: 'object',
      required: ['studioId', 'rowLabel', 'seatNumber'],
      properties: {
        studioId: {
          type: 'number',
          description: 'Studio ID',
          example: 1,
        },
        rowLabel: {
          type: 'string',
          description: 'Row label (e.g., A, B, C)',
          example: 'A',
        },
        seatNumber: {
          type: 'number',
          description: 'Seat number within the row',
          example: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Seat successfully created',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Seat created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            studioId: { type: 'number', example: 1 },
            rowLabel: { type: 'string', example: 'A' },
            seatNumber: { type: 'number', example: 1 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            deletedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: CommonErrorSchemas.ValidationError,
  })
  @ApiResponse({
    status: 404,
    description: 'Studio not found',
    schema: StudioErrorSchemas.StudioNotFound,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Seat already exists',
    schema: SeatErrorSchemas.SeatConflict,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    schema: CommonErrorSchemas.Forbidden,
  })
  async create(
    @Body(new ZodValidationPipe(CreateSeatSchema))
    createSeatDto: CreateSeatDto,
  ): Promise<SeatResponseDto> {
    return await this.seatService.createSeat(createSeatDto);
  }

  /**
   * Bulk create seats for a studio
   */
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk create seats for a studio',
    description:
      'Create all seats for a studio based on its capacity. Only accessible by administrators.',
  })
  @ApiBody({
    description: 'Bulk seat creation data',
    schema: {
      type: 'object',
      required: ['studioId'],
      properties: {
        studioId: {
          type: 'number',
          description: 'Studio ID',
          example: 1,
        },
        regenerate: {
          type: 'boolean',
          description: 'Whether to regenerate all seats (purges existing)',
          example: false,
        },
        options: {
          type: 'object',
          properties: {
            rowPattern: {
              type: 'string',
              description: 'Custom row labeling pattern',
              example: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            },
            seatsPerRow: {
              type: 'number',
              description: 'Fixed number of seats per row',
              example: 15,
            },
            maxRowSize: {
              type: 'number',
              description: 'Maximum seats in a row',
              example: 20,
            },
            startSeatNumber: {
              type: 'number',
              description: 'Starting seat number',
              example: 1,
            },
            customRowSizes: {
              type: 'object',
              description: 'Custom sizes for specific rows',
              example: { A: 10, B: 12, C: 14 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Seats successfully created',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Seats created successfully' },
        data: {
          type: 'object',
          properties: {},
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: CommonErrorSchemas.BulkOperationError,
  })
  @ApiResponse({
    status: 404,
    description: 'Studio not found',
    schema: StudioErrorSchemas.StudioNotFound,
  })
  async bulkCreate(
    @Body(new ZodValidationPipe(BulkCreateSeatsSchema))
    bulkCreateDto: BulkCreateSeatsDto,
  ): Promise<{ message: string }> {
    // Get the studio to access its capacity
    const studio = await this.seatService.findStudioById(
      bulkCreateDto.studioId,
    );

    if (bulkCreateDto.regenerate) {
      // Use the regeneration method which handles everything in a transaction
      return await this.seatService.regenerateSeatsForStudio(
        bulkCreateDto.studioId,
        studio.seatCapacity,
        bulkCreateDto.options,
      );
    } else {
      // Just create new seats without removing existing ones
      await this.seatService.createSeatsForStudio(
        bulkCreateDto.studioId,
        studio.seatCapacity,
        bulkCreateDto.options,
      );

      return { message: 'Seats created successfully' };
    }
  }

  /**
   * Update a seat
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a seat',
    description:
      'Update a specific seat by its ID. Only accessible by administrators.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Seat ID' })
  @ApiBody({
    description: 'Seat update data',
    schema: {
      type: 'object',
      properties: {
        studioId: {
          type: 'number',
          description: 'Studio ID',
          example: 1,
        },
        rowLabel: {
          type: 'string',
          description: 'Row label (e.g., A, B, C)',
          example: 'B',
        },
        seatNumber: {
          type: 'number',
          description: 'Seat number within the row',
          example: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Seat successfully updated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Seat updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            studioId: { type: 'number', example: 1 },
            rowLabel: { type: 'string', example: 'B' },
            seatNumber: { type: 'number', example: 2 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            deletedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: CommonErrorSchemas.ValidationError,
  })
  @ApiResponse({
    status: 404,
    description: 'Seat not found',
    schema: SeatErrorSchemas.SeatNotFound,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    schema: CommonErrorSchemas.Forbidden,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateSeatSchema))
    updateSeatDto: UpdateSeatDto,
  ): Promise<SeatResponseDto> {
    return await this.seatService.updateSeat(id, updateSeatDto);
  }

  /**
   * Delete a seat
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a seat',
    description:
      'Delete a specific seat by its ID. Only accessible by administrators.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Seat ID' })
  @ApiResponse({
    status: 200,
    description: 'Seat successfully deleted',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Seat deleted successfully' },
        data: {
          type: 'object',
          properties: {},
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Seat not found',
    schema: SeatErrorSchemas.SeatNotFound,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    schema: CommonErrorSchemas.Forbidden,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return await this.seatService.removeSeat(id);
  }

  /**
   * Delete all seats for a studio
   */
  @Delete('studio/:studioId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete all seats for a studio',
    description:
      'Delete all seats for a specific studio. Only accessible by administrators.',
  })
  @ApiParam({ name: 'studioId', type: Number, description: 'Studio ID' })
  @ApiResponse({
    status: 200,
    description: 'Seats successfully deleted',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Seats deleted successfully' },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 150 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Studio not found',
    schema: StudioErrorSchemas.StudioNotFound,
  })
  async removeAllForStudio(
    @Param('studioId', ParseIntPipe) studioId: number,
  ): Promise<{ message: string; count: number }> {
    return await this.seatService.removeAllSeatsForStudio(studioId);
  }

  /**
   * Bulk delete seats
   */
  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete seats',
    description:
      'Delete multiple seats by their IDs. Only accessible by administrators.',
  })
  @ApiBody({
    description: 'Seat IDs to delete',
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number', format: 'int32', minimum: 1 },
          description:
            'Array of seat IDs to delete. Must contain at least one ID.',
          example: [1, 2, 3, 4, 5],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Seats successfully deleted',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Seats deleted successfully' },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: CommonErrorSchemas.BulkOperationError,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    schema: CommonErrorSchemas.Forbidden,
  })
  async bulkRemove(
    @Body(new ZodValidationPipe(bulkDeleteSchema))
    bulkDeleteDto: BulkDeleteDto,
  ): Promise<{ message: string; count: number }> {
    return await this.seatService.bulkRemoveSeats(bulkDeleteDto.ids);
  }
}
