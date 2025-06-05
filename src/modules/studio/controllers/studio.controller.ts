import {
  BulkDeleteDto,
  bulkDeleteSchema,
} from '@app/common/dto/bulk-delete.dto';
import {
  CommonErrorSchemas,
  StudioErrorSchemas,
  createErrorSchema,
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
  CreateStudioDto,
  CreateStudioResponseDto,
  CreateStudioSchema,
  DeleteStudioResponseDto,
  GetStudiosQueryDto,
  GetStudiosQuerySchema,
  StudioResponseDto,
  UpdateStudioDto,
  UpdateStudioResponseDto,
  UpdateStudioSchema,
} from '../dto/studio.dto';
import { StudioService } from '../services/studio.service';

@Controller('studios')
@ApiTags('Studios')
@RequireAdmin
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  /**
   * Get all studios with pagination and filtering
   */
  @Get()
  @ApiOperation({
    summary: 'Get all studios',
    description:
      'Retrieve a paginated list of studios with optional filtering. Only accessible by administrators.',
  })
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
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'isActive',
    type: Boolean,
    required: false,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'hasImax',
    type: Boolean,
    required: false,
    description: 'Filter by IMAX capability',
    example: true,
  })
  @ApiQuery({
    name: 'has3D',
    type: Boolean,
    required: false,
    description: 'Filter by 3D capability',
    example: true,
  })
  @ApiQuery({
    name: 'minCapacity',
    type: Number,
    required: false,
    description: 'Minimum seat capacity',
    example: 50,
  })
  @ApiQuery({
    name: 'maxCapacity',
    type: Number,
    required: false,
    description: 'Maximum seat capacity',
    example: 200,
  })
  @ApiQuery({
    name: 'studioNumber',
    type: Number,
    required: false,
    description: 'Filter by studio number',
    example: 1,
  })
  @ApiQuery({
    name: 'includeDeleted',
    type: Boolean,
    required: false,
    description: 'Include deleted studios in the results',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved studios',
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
              studioNumber: { type: 'number', example: 1 },
              seatCapacity: { type: 'number', example: 150 },
              hasImax: { type: 'boolean', example: true },
              has3D: { type: 'boolean', example: false },
              isActive: { type: 'boolean', example: true },
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
            totalItems: { type: 'number', example: 10 },
            currentPage: { type: 'number', example: 1 },
            itemsPerPage: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 1 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
    schema: CommonErrorSchemas.ValidationError,
  })
  async findAll(
    @Query(new ZodValidationPipe(GetStudiosQuerySchema))
    query: GetStudiosQueryDto,
  ): Promise<PaginatedResponse<StudioResponseDto>> {
    return await this.studioService.findAll(query);
  }

  /**
   * Get studio by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get studio by ID',
    description:
      'Retrieve a specific studio by its ID. Only accessible by administrators.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Studio ID' })
  @ApiQuery({
    name: 'includeDeleted',
    type: Boolean,
    required: false,
    description: 'Include deleted studios when retrieving by ID',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved studio',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OK' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            studioNumber: { type: 'number', example: 1 },
            seatCapacity: { type: 'number', example: 150 },
            hasImax: { type: 'boolean', example: true },
            has3D: { type: 'boolean', example: false },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            deletedAt: { type: 'string', format: 'date-time', nullable: true },
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
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeDeleted') includeDeleted?: string | boolean,
  ): Promise<StudioResponseDto> {
    // Simple coercion to boolean
    return await this.studioService.findOne(id, !!includeDeleted);
  }

  /**
   * Create a new studio
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new studio',
    description:
      'Create a new studio with the specified configuration. Only accessible by administrators.',
  })
  @ApiBody({
    description: 'Studio creation data',
    schema: {
      type: 'object',
      required: ['studioNumber', 'seatCapacity'],
      properties: {
        studioNumber: {
          type: 'number',
          minimum: 1,
          maximum: 999,
          description: 'Unique studio number',
          example: 1,
        },
        seatCapacity: {
          type: 'number',
          minimum: 10,
          maximum: 1000,
          description: 'Total seat capacity',
          example: 150,
        },
        hasImax: {
          type: 'boolean',
          description: 'IMAX capability (optional)',
          example: true,
        },
        has3D: {
          type: 'boolean',
          description: '3D projection capability (optional)',
          example: false,
        },
        isActive: {
          type: 'boolean',
          description: 'Studio active status (optional, default: true)',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Studio successfully created',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Studio created successfully' },
        data: {
          type: 'object',
          properties: {
            studio: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                studioNumber: { type: 'number', example: 1 },
                seatCapacity: { type: 'number', example: 150 },
                hasImax: { type: 'boolean', example: true },
                has3D: { type: 'boolean', example: false },
                isActive: { type: 'boolean', example: true },
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
    status: 409,
    description: 'Conflict - Studio number already exists',
    schema: createErrorSchema(
      StudioErrorSchemas.StudioNumberConflict,
      'Studio with number 1 already exists',
    ),
  })
  async create(
    @Body(new ZodValidationPipe(CreateStudioSchema))
    createStudioDto: CreateStudioDto,
  ): Promise<CreateStudioResponseDto> {
    return await this.studioService.create(createStudioDto);
  }

  /**
   * Update studio by ID
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update studio by ID',
    description:
      'Update the configuration of a specific studio by its ID. Only accessible by administrators.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Studio ID' })
  @ApiBody({
    description: 'Studio update data',
    schema: {
      type: 'object',
      properties: {
        studioNumber: {
          type: 'number',
          minimum: 1,
          maximum: 999,
          description: 'Unique studio number',
          example: 2,
        },
        seatCapacity: {
          type: 'number',
          minimum: 10,
          maximum: 1000,
          description: 'Total seat capacity',
          example: 200,
        },
        hasImax: {
          type: 'boolean',
          description: 'IMAX capability (optional)',
          example: false,
        },
        has3D: {
          type: 'boolean',
          description: '3D projection capability (optional)',
          example: true,
        },
        isActive: {
          type: 'boolean',
          description: 'Studio active status (optional)',
          example: true,
        },
        recover: {
          type: 'boolean',
          description: 'Whether to recover a deleted studio (optional)',
          example: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Studio successfully updated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Studio updated successfully' },
        data: {
          type: 'object',
          properties: {
            studio: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                studioNumber: { type: 'number', example: 2 },
                seatCapacity: { type: 'number', example: 200 },
                hasImax: { type: 'boolean', example: false },
                has3D: { type: 'boolean', example: true },
                isActive: { type: 'boolean', example: true },
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
    description: 'Conflict - Studio number already exists',
    schema: createErrorSchema(
      StudioErrorSchemas.StudioNumberConflict,
      'Studio with number 2 already exists',
    ),
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateStudioSchema))
    updateStudioDto: UpdateStudioDto,
  ): Promise<UpdateStudioResponseDto> {
    return await this.studioService.update(id, updateStudioDto);
  }

  /**
   * Delete studio by ID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete studio by ID',
    description:
      'Delete a specific studio by its ID. Only accessible by administrators.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Studio ID' })
  @ApiResponse({
    status: 200,
    description: 'Studio successfully deleted',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Studio deleted successfully' },
        data: {
          type: 'object',
          properties: {},
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Studio not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Studio not found' },
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DeleteStudioResponseDto> {
    return await this.studioService.remove(id);
  }

  /**
   * Bulk delete studios by IDs
   */
  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete studios',
    description:
      'Delete multiple studios by their IDs. Only accessible by administrators.',
  })
  @ApiBody({
    description: 'Studio IDs to delete',
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number', format: 'int32', minimum: 1 },
          description:
            'Array of studio IDs to delete. Must contain at least one ID.',
          example: [1, 2, 3],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Studios successfully deleted',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Studios deleted successfully' },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 3 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Invalid input data or At least one ID must be provided.',
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              path: {
                type: 'array',
                items: { type: 'string', example: 'ids' },
              },
            },
          },
        },
      },
    },
  })
  async bulkRemove(
    @Body(new ZodValidationPipe(bulkDeleteSchema))
    bulkDeleteDto: BulkDeleteDto,
  ): Promise<{ message: string; count: number }> {
    return await this.studioService.bulkRemove(bulkDeleteDto.ids);
  }

  /**
   * Get studio statistics
   */
  @Get('admin/stats')
  @ApiOperation({
    summary: 'Get studio statistics',
    description:
      'Retrieve comprehensive statistics about all studios. Only accessible by administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved studio statistics',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OK' },
        data: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              example: 10,
              description: 'Total number of studios',
            },
            active: {
              type: 'number',
              example: 8,
              description: 'Number of active studios',
            },
            inactive: {
              type: 'number',
              example: 2,
              description: 'Number of inactive studios',
            },
            withImax: {
              type: 'number',
              example: 3,
              description: 'Number of IMAX studios',
            },
            with3D: {
              type: 'number',
              example: 5,
              description: 'Number of 3D studios',
            },
            totalCapacity: {
              type: 'number',
              example: 1500,
              description: 'Total seat capacity',
            },
            averageCapacity: {
              type: 'number',
              example: 150,
              description: 'Average seat capacity',
            },
          },
        },
      },
    },
  })
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    withImax: number;
    with3D: number;
    totalCapacity: number;
    averageCapacity: number;
  }> {
    return await this.studioService.getStats();
  }
}
