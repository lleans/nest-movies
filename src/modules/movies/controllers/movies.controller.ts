import {
  BulkDeleteDto,
  bulkDeleteSchema,
} from '@app/common/dto/bulk-delete.dto';
import {
  CommonErrorSchemas,
  MovieErrorSchemas,
} from '@app/common/dto/error-response.dto';
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
import { JWTAccessGuard } from '../../auth/guards/jwt-access.guard';
import { CreateMovieDto, createMovieSchema } from '../dto/create-movie.dto';
import { MovieQueryDto, movieQuerySchema } from '../dto/movie-query.dto';
import { UpdateMovieDto, updateMovieSchema } from '../dto/update-movie.dto';
import { MoviesService } from '../services/movies.service';

@ApiTags('Movies')
@Controller('movies')
@JWTAccessGuard
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @RequireAdmin
  @ApiOperation({ summary: 'Create a new movie' })
  @ApiResponse({
    status: 201,
    description: 'The movie has been successfully created.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Movie created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            overview: { type: 'string' },
            poster: { type: 'string' },
            playUntil: { type: 'string', format: 'date-time' },
            tmdbId: { type: 'number' },
            rating: { type: 'number' },
            searchKeywords: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            movieTags: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  tag: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                      slug: { type: 'string' },
                    },
                  },
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
    description: 'Bad request.',
    schema: CommonErrorSchemas.ValidationError,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'overview', 'poster', 'playUntil'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        overview: { type: 'string', minLength: 1 },
        poster: { type: 'string', format: 'url' },
        playUntil: { type: 'string', format: 'date-time' },
        tmdbId: { type: 'number' },
        rating: { type: 'number', minimum: 0, maximum: 10 },
        searchKeywords: { type: 'string', maxLength: 255 },
        tagIds: { type: 'array', items: { type: 'number' } },
      },
    },
  })
  create(
    @Body(new ZodValidationPipe(createMovieSchema))
    createMovieDto: CreateMovieDto,
  ) {
    return this.moviesService.create(createMovieDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all movies with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Return paginated movies.',
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
              id: { type: 'number' },
              title: { type: 'string' },
              overview: { type: 'string' },
              poster: { type: 'string' },
              playUntil: { type: 'string', format: 'date-time' },
              tmdbId: { type: 'number' },
              rating: { type: 'number' },
              searchKeywords: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              movieTags: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    tag: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            currentPage: { type: 'number' },
            itemsPerPage: { type: 'number' },
            totalItems: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for title, overview, or keywords',
    type: String,
  })
  @ApiQuery({
    name: 'tagIds',
    required: false,
    description: 'Filter by tag IDs',
    type: [Number],
  })
  @ApiQuery({
    name: 'rating',
    required: false,
    description: 'Minimum rating (0-10)',
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field (default: createdAt)',
    enum: ['title', 'rating', 'createdAt', 'playUntil'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (default: DESC)',
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({
    name: 'includeExpired',
    required: false,
    description: 'Include movies past playUntil date (default: false)',
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    description: 'Include soft-deleted movies (default: false)',
    type: Boolean,
  })
  findAll(
    @Query(new ZodValidationPipe(movieQuerySchema)) query: MovieQueryDto,
  ) {
    return this.moviesService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active movies' })
  @ApiResponse({
    status: 200,
    description: 'Return all active movies.',
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
              id: { type: 'number' },
              title: { type: 'string' },
              overview: { type: 'string' },
              poster: { type: 'string' },
              playUntil: { type: 'string', format: 'date-time' },
              movieTags: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    tag: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  getActiveMovies() {
    return this.moviesService.getActiveMovies();
  }

  @Get('by-tag/:tagId')
  @ApiOperation({ summary: 'Get movies by tag ID' })
  @ApiResponse({
    status: 200,
    description: 'Return movies with the specified tag.',
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
              id: { type: 'number' },
              title: { type: 'string' },
              overview: { type: 'string' },
              poster: { type: 'string' },
              playUntil: { type: 'string', format: 'date-time' },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            currentPage: { type: 'number' },
            itemsPerPage: { type: 'number' },
            totalItems: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Tag with ID 123 not found' },
      },
    },
  })
  @ApiParam({ name: 'tagId', description: 'Tag ID', type: Number })
  getMoviesByTag(
    @Param('tagId', ParseIntPipe) tagId: number,
    @Query(new ZodValidationPipe(movieQuerySchema)) query: MovieQueryDto,
  ) {
    return this.moviesService.getMoviesByTag(tagId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movie by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the movie.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OK' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            overview: { type: 'string' },
            poster: { type: 'string' },
            playUntil: { type: 'string', format: 'date-time' },
            tmdbId: { type: 'number' },
            rating: { type: 'number' },
            searchKeywords: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            movieTags: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  tag: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                      slug: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Movie not found.',
    schema: MovieErrorSchemas.MovieNotFound,
  })
  @ApiParam({ name: 'id', description: 'Movie ID', type: Number })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    description: 'Include soft-deleted movie (default: false)',
    type: Boolean,
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    return this.moviesService.findOne(id, includeDeleted);
  }

  @Put(':id')
  @RequireAdmin
  @ApiOperation({ summary: 'Update a movie' })
  @ApiResponse({
    status: 200,
    description: 'The movie has been successfully updated.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Movie updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            overview: { type: 'string' },
            poster: { type: 'string' },
            playUntil: { type: 'string', format: 'date-time' },
            tmdbId: { type: 'number' },
            rating: { type: 'number' },
            searchKeywords: { type: 'string' },
            movieTags: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tag: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                      slug: { type: 'string' },
                    },
                  },
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
    description: 'Bad request.',
    schema: CommonErrorSchemas.ValidationError,
  })
  @ApiResponse({
    status: 404,
    description: 'Movie not found.',
    schema: MovieErrorSchemas.MovieNotFound,
  })
  @ApiParam({ name: 'id', description: 'Movie ID', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        overview: { type: 'string', minLength: 1 },
        poster: { type: 'string', format: 'url' },
        playUntil: { type: 'string', format: 'date-time' },
        tmdbId: { type: 'number' },
        rating: { type: 'number', minimum: 0, maximum: 10 },
        searchKeywords: { type: 'string', maxLength: 255 },
        tagIds: { type: 'array', items: { type: 'number' } },
        recover: {
          type: 'boolean',
          default: false,
          description: 'Restore a soft-deleted movie',
        },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateMovieSchema))
    updateMovieDto: UpdateMovieDto,
  ) {
    return this.moviesService.update(id, updateMovieDto);
  }

  @Delete(':id')
  @RequireAdmin
  @ApiOperation({ summary: 'Delete a movie' })
  @ApiResponse({
    status: 200,
    description: 'The movie has been successfully deleted.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Movie deleted successfully' },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Movie not found.',
    schema: MovieErrorSchemas.MovieNotFound,
  })
  @ApiParam({ name: 'id', description: 'Movie ID', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.remove(id);
  }

  @Post(':id/tags')
  @RequireAdmin
  @ApiOperation({ summary: 'Add tags to a movie' })
  @ApiResponse({
    status: 200,
    description: 'Tags have been successfully added.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tags added successfully' },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'One or more tags not found' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Movie not found.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Movie with ID 123 not found' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Movie ID', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tagIds'],
      properties: {
        tagIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of tag IDs to add to the movie',
        },
      },
    },
  })
  addTags(
    @Param('id', ParseIntPipe) id: number,
    @Body('tagIds') tagIds: number[],
  ) {
    return this.moviesService.addTagsToMovie(id, tagIds);
  }

  @Delete(':id/tags')
  @RequireAdmin
  @ApiOperation({ summary: 'Remove tags from a movie' })
  @ApiResponse({
    status: 200,
    description: 'Tags have been successfully removed.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tags removed successfully' },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Movie or tag not found.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Movie with ID 123 not found' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Movie ID', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tagIds'],
      properties: {
        tagIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of tag IDs to remove from the movie',
        },
      },
    },
  })
  removeTags(
    @Param('id', ParseIntPipe) id: number,
    @Body('tagIds') tagIds: number[],
  ) {
    return this.moviesService.removeTagsFromMovie(id, tagIds);
  }

  @Post('bulk-delete')
  @RequireAdmin
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete movies' })
  @ApiResponse({
    status: 200,
    description: 'Movies successfully deleted.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Movies deleted successfully' },
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
    description: 'Bad request.',
    schema: CommonErrorSchemas.BulkOperationError,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number', format: 'int32', minimum: 1 },
          description:
            'Array of movie IDs to delete. Must contain at least one ID.',
          example: [1, 2, 3],
        },
      },
    },
  })
  async bulkDelete(
    @Body(new ZodValidationPipe(bulkDeleteSchema))
    bulkDeleteDto: BulkDeleteDto,
  ) {
    return this.moviesService.bulkRemove(bulkDeleteDto.ids);
  }
}
