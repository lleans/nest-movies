import {
  CommonErrorSchemas,
  MovieScheduleErrorSchemas,
} from '@app/common/dto/error-response.dto';
import { PaginatedResponse } from '@app/common/dto/pagination.dto';
import { ZodValidationPipe } from '@app/common/pipes/zod-validation/zod-validation.pipe';
import { AdminGuard } from '@app/modules/auth/guards/admin.guard';
import { JWTAccessGuard } from '@app/modules/auth/guards/jwt-access.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AvailableSeatsResponseDto,
  CreateMovieScheduleDto,
  GetAvailableSeatsParamsDto,
  MovieScheduleQueryDto,
  MovieScheduleResponseDto,
  UpdateMovieScheduleDto,
  createMovieScheduleSchema,
  getAvailableSeatsParamsSchema,
  movieScheduleQuerySchema,
  updateMovieScheduleSchema,
} from '../dto/movie-schedule.dto';
import { MovieScheduleService } from '../services/movie-schedule.service';

@ApiTags('Movie Schedules')
@Controller('movie-schedules')
@JWTAccessGuard
export class MovieScheduleController {
  constructor(private readonly movieScheduleService: MovieScheduleService) {}
  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Create a new movie schedule (Admin only)',
    description:
      'Create a new movie schedule with specified movie, studio, date, and time. Only accessible by administrators.',
  })
  @ApiBody({
    description: 'Movie schedule creation data',
    schema: {
      type: 'object',
      required: [
        'movieId',
        'studioId',
        'date',
        'startTime',
        'endTime',
        'price',
      ],
      properties: {
        movieId: {
          type: 'number',
          description: 'ID of the movie',
          example: 1,
          minimum: 1,
        },
        studioId: {
          type: 'number',
          description: 'ID of the studio',
          example: 1,
          minimum: 1,
        },
        date: {
          type: 'string',
          format: 'date',
          description: 'Schedule date in YYYY-MM-DD format',
          example: '2023-12-01',
        },
        startTime: {
          type: 'string',
          pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
          description: 'Start time in HH:MM format (24-hour)',
          example: '19:00',
        },
        endTime: {
          type: 'string',
          pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
          description: 'End time in HH:MM format (24-hour)',
          example: '21:30',
        },
        price: {
          type: 'number',
          description: 'Ticket price in smallest currency unit (e.g., cents)',
          example: 50000,
          minimum: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Movie schedule created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Movie schedule created successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            movieId: { type: 'number', example: 1 },
            studioId: { type: 'number', example: 1 },
            startTime: { type: 'string', example: '19:00' },
            endTime: { type: 'string', example: '21:30' },
            price: { type: 'number', example: 50000 },
            date: { type: 'string', example: '2023-12-01' },
            bookedSeats: { type: 'number', example: 0 },
            availableSeats: { type: 'number', example: 150 },
            movie: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                title: { type: 'string', example: 'The Matrix' },
                poster: {
                  type: 'string',
                  example: 'https://example.com/poster.jpg',
                },
                rating: { type: 'number', example: 8.7, nullable: true },
              },
            },
            studio: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                studioNumber: { type: 'number', example: 1 },
                seatCapacity: { type: 'number', example: 150 },
                hasImax: { type: 'boolean', example: true },
                has3D: { type: 'boolean', example: false },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:00:00Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation errors',
    schema: CommonErrorSchemas.ValidationError,
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
  @ApiResponse({
    status: 404,
    description: 'Movie or Studio not found',
    schema: MovieScheduleErrorSchemas.MovieNotFound,
  })
  @ApiResponse({
    status: 409,
    description: 'Schedule conflict with existing booking',
    schema: MovieScheduleErrorSchemas.ScheduleConflict,
  })
  async create(
    @Body(new ZodValidationPipe(createMovieScheduleSchema))
    createMovieScheduleDto: CreateMovieScheduleDto,
  ): Promise<MovieScheduleResponseDto> {
    return this.movieScheduleService.createSchedule(createMovieScheduleDto);
  }
  @Get()
  @ApiOperation({
    summary: 'Get all movie schedules with filtering',
    description:
      'Retrieve paginated list of movie schedules. Supports filtering by movie, studio, date range, and search.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'movieId',
    required: false,
    type: Number,
    description: 'Filter by movie ID',
    example: 1,
  })
  @ApiQuery({
    name: 'studioId',
    required: false,
    type: Number,
    description: 'Filter by studio ID',
    example: 1,
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: Date,
    description: 'Filter by specific date (YYYY-MM-DD)',
    example: '2023-12-01',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: Date,
    description: 'Filter schedules from this date (YYYY-MM-DD)',
    example: '2023-12-01',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: Date,
    description: 'Filter schedules until this date (YYYY-MM-DD)',
    example: '2023-12-31',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by movie title',
    example: 'Matrix',
  })
  @ApiResponse({
    status: 200,
    description: 'List of movie schedules retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Movie schedules retrieved successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              movieId: { type: 'number', example: 1 },
              studioId: { type: 'number', example: 1 },
              startTime: { type: 'string', example: '19:00' },
              endTime: { type: 'string', example: '21:30' },
              price: { type: 'number', example: 50000 },
              date: { type: 'string', example: '2023-12-01' },
              bookedSeats: { type: 'number', example: 25 },
              availableSeats: { type: 'number', example: 125 },
              movie: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  title: { type: 'string', example: 'The Matrix' },
                  poster: {
                    type: 'string',
                    example: 'https://example.com/poster.jpg',
                  },
                  rating: { type: 'number', example: 8.7, nullable: true },
                },
              },
              studio: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  studioNumber: { type: 'number', example: 1 },
                  seatCapacity: { type: 'number', example: 150 },
                  hasImax: { type: 'boolean', example: true },
                  has3D: { type: 'boolean', example: false },
                },
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-12-01T10:00:00Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-12-01T10:00:00Z',
              },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            totalItems: { type: 'number', example: 50 },
            currentPage: { type: 'number', example: 1 },
            itemsPerPage: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 5 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
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
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  async findAll(
    @Query(new ZodValidationPipe(movieScheduleQuerySchema))
    query: MovieScheduleQueryDto,
  ): Promise<PaginatedResponse<MovieScheduleResponseDto>> {
    return this.movieScheduleService.findAll(query);
  }
  @Get(':id')
  @ApiOperation({
    summary: 'Get movie schedule by ID',
    description:
      'Retrieve detailed information about a specific movie schedule including movie and studio details.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Movie schedule ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Movie schedule details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Movie schedule retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            movieId: { type: 'number', example: 1 },
            studioId: { type: 'number', example: 1 },
            startTime: { type: 'string', example: '19:00' },
            endTime: { type: 'string', example: '21:30' },
            price: { type: 'number', example: 50000 },
            date: { type: 'string', example: '2023-12-01' },
            bookedSeats: { type: 'number', example: 25 },
            availableSeats: { type: 'number', example: 125 },
            movie: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                title: { type: 'string', example: 'The Matrix' },
                poster: {
                  type: 'string',
                  example: 'https://example.com/poster.jpg',
                },
                rating: { type: 'number', example: 8.7, nullable: true },
              },
            },
            studio: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                studioNumber: { type: 'number', example: 1 },
                seatCapacity: { type: 'number', example: 150 },
                hasImax: { type: 'boolean', example: true },
                has3D: { type: 'boolean', example: false },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:00:00Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid schedule ID',
    schema: CommonErrorSchemas.ValidationError,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiResponse({
    status: 404,
    description: 'Movie schedule not found',
    schema: MovieScheduleErrorSchemas.ScheduleNotFound,
  })
  async findOne(@Param('id') id: string): Promise<MovieScheduleResponseDto> {
    return this.movieScheduleService.findOne(+id);
  }
  @Get(':scheduleId/available-seats')
  @ApiOperation({
    summary: 'Get available seats for a movie schedule',
    description:
      'Retrieve seat availability information for a specific movie schedule, including seat layout and reservation status.',
  })
  @ApiParam({
    name: 'scheduleId',
    type: Number,
    description: 'Movie schedule ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Available seats information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Available seats retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            scheduleId: { type: 'number', example: 1 },
            totalSeats: { type: 'number', example: 150 },
            bookedSeats: { type: 'number', example: 25 },
            availableSeats: { type: 'number', example: 125 },
            seats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  rowLabel: { type: 'string', example: 'A' },
                  seatNumber: { type: 'number', example: 1 },
                  isAvailable: { type: 'boolean', example: true },
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
    description: 'Bad Request - Invalid schedule ID',
    schema: CommonErrorSchemas.ValidationError,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiResponse({
    status: 404,
    description: 'Movie schedule not found',
    schema: MovieScheduleErrorSchemas.ScheduleNotFound,
  })
  async getAvailableSeats(
    @Param(new ZodValidationPipe(getAvailableSeatsParamsSchema))
    params: GetAvailableSeatsParamsDto,
  ): Promise<AvailableSeatsResponseDto> {
    return this.movieScheduleService.getAvailableSeats(params.scheduleId);
  }
  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Update movie schedule (Admin only)',
    description:
      'Update an existing movie schedule. Only accessible by administrators. Cannot update if schedule has existing bookings.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Movie schedule ID',
    example: 1,
  })
  @ApiBody({
    description: 'Movie schedule update data (all fields optional)',
    schema: {
      type: 'object',
      properties: {
        movieId: {
          type: 'number',
          description: 'ID of the movie',
          example: 1,
          minimum: 1,
        },
        studioId: {
          type: 'number',
          description: 'ID of the studio',
          example: 1,
          minimum: 1,
        },
        date: {
          type: 'string',
          format: 'date',
          description: 'Schedule date in YYYY-MM-DD format',
          example: '2023-12-01',
        },
        startTime: {
          type: 'string',
          pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
          description: 'Start time in HH:MM format (24-hour)',
          example: '19:00',
        },
        endTime: {
          type: 'string',
          pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
          description: 'End time in HH:MM format (24-hour)',
          example: '21:30',
        },
        price: {
          type: 'number',
          description: 'Ticket price in smallest currency unit',
          example: 50000,
          minimum: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Movie schedule updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Movie schedule updated successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            movieId: { type: 'number', example: 1 },
            studioId: { type: 'number', example: 1 },
            startTime: { type: 'string', example: '19:00' },
            endTime: { type: 'string', example: '21:30' },
            price: { type: 'number', example: 55000 },
            date: { type: 'string', example: '2023-12-01' },
            bookedSeats: { type: 'number', example: 25 },
            availableSeats: { type: 'number', example: 125 },
            movie: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                title: { type: 'string', example: 'The Matrix' },
                poster: {
                  type: 'string',
                  example: 'https://example.com/poster.jpg',
                },
                rating: { type: 'number', example: 8.7, nullable: true },
              },
            },
            studio: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                studioNumber: { type: 'number', example: 1 },
                seatCapacity: { type: 'number', example: 150 },
                hasImax: { type: 'boolean', example: true },
                has3D: { type: 'boolean', example: false },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:05:00Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Validation errors or cannot update with existing bookings',
    schema: CommonErrorSchemas.ValidationError,
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
  @ApiResponse({
    status: 404,
    description: 'Movie schedule not found',
    schema: MovieScheduleErrorSchemas.ScheduleNotFound,
  })
  @ApiResponse({
    status: 409,
    description: 'Schedule conflict with existing booking',
    schema: MovieScheduleErrorSchemas.ScheduleConflict,
  })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMovieScheduleSchema))
    updateMovieScheduleDto: UpdateMovieScheduleDto,
  ): Promise<MovieScheduleResponseDto> {
    return this.movieScheduleService.updateSchedule(
      +id,
      updateMovieScheduleDto,
    );
  }
  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Delete movie schedule (Admin only)',
    description:
      'Delete a movie schedule. Only accessible by administrators. Cannot delete if schedule has existing bookings.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Movie schedule ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Movie schedule deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Movie schedule deleted successfully',
        },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Cannot delete schedule with existing bookings',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Cannot delete schedule with existing bookings',
        },
      },
    },
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
  @ApiResponse({
    status: 404,
    description: 'Movie schedule not found',
    schema: MovieScheduleErrorSchemas.ScheduleNotFound,
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.movieScheduleService.remove(+id);
    return { message: 'Movie schedule deleted successfully' };
  }
}
