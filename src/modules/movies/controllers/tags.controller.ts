import {
  BulkDeleteDto,
  bulkDeleteSchema,
} from '@app/common/dto/bulk-delete.dto';
import {
  CommonErrorSchemas,
  TagErrorSchemas,
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
import { CreateTagDto, createTagSchema } from '../dto/create-tag.dto';
import { TagQueryDto, tagQuerySchema } from '../dto/tag-query.dto';
import { UpdateTagDto, updateTagSchema } from '../dto/update-tag.dto';
import { TagsService } from '../services/tags.service';

@ApiTags('Tags')
@Controller('tags')
@JWTAccessGuard
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @RequireAdmin
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({
    status: 201,
    description: 'The tag has been successfully created.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tag created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Action' },
            slug: { type: 'string', example: 'action' },
            usageCount: { type: 'number', example: 0 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
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
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    schema: CommonErrorSchemas.Forbidden,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        slug: { type: 'string', minLength: 1, maxLength: 50 },
      },
    },
  })
  create(
    @Body(new ZodValidationPipe(createTagSchema)) createTagDto: CreateTagDto,
  ) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Return paginated tags.',
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
              name: { type: 'string' },
              slug: { type: 'string' },
              usageCount: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
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
    description: 'Search term for name or slug',
    type: String,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field (default: usageCount)',
    enum: ['name', 'usageCount', 'createdAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (default: DESC)',
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    description: 'Include soft-deleted tags (default: false)',
    type: Boolean,
  })
  findAll(@Query(new ZodValidationPipe(tagQuerySchema)) query: TagQueryDto) {
    return this.tagsService.findAll(query);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular tags' })
  @ApiResponse({
    status: 200,
    description: 'Return popular tags.',
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
              name: { type: 'string' },
              slug: { type: 'string' },
              usageCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit number of tags returned (default: 10)',
    type: Number,
  })
  getPopularTags(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.tagsService.getPopularTags(limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tags by name or slug' })
  @ApiResponse({
    status: 200,
    description: 'Return tags matching search query.',
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
              name: { type: 'string' },
              slug: { type: 'string' },
              usageCount: { type: 'number' },
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
    name: 'q',
    required: true,
    description: 'Search query',
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit number of tags returned',
    type: Number,
  })
  searchTags(
    @Query('q') query: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.tagsService.searchTags(query, limit);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get tag by slug' })
  @ApiResponse({
    status: 200,
    description: 'Return the tag.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OK' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            slug: { type: 'string' },
            usageCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found.',
    schema: TagErrorSchemas.TagNotFound,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiParam({ name: 'slug', description: 'Tag slug', type: String })
  findBySlug(@Param('slug') slug: string) {
    return this.tagsService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the tag.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OK' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            slug: { type: 'string' },
            usageCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found.',
    schema: TagErrorSchemas.TagNotFound,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiParam({ name: 'id', description: 'Tag ID', type: Number })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    description: 'Include soft-deleted tag (default: false)',
    type: Boolean,
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    return this.tagsService.findOne(id, includeDeleted);
  }

  @Put(':id')
  @RequireAdmin
  @ApiOperation({ summary: 'Update a tag' })
  @ApiResponse({
    status: 200,
    description: 'The tag has been successfully updated.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tag updated successfully' },
        data: {
          type: 'object',
          properties: {
            tag: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                slug: { type: 'string' },
                usageCount: { type: 'number' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
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
    description: 'Tag not found.',
    schema: TagErrorSchemas.TagNotFound,
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
  @ApiParam({ name: 'id', description: 'Tag ID', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        slug: { type: 'string', minLength: 1, maxLength: 50 },
        recover: {
          type: 'boolean',
          default: false,
          description: 'Restore a soft-deleted tag',
        },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateTagSchema)) updateTagDto: UpdateTagDto,
  ) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @RequireAdmin
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiResponse({
    status: 200,
    description: 'The tag has been successfully deleted.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tag deleted successfully' },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete tag that is in use.',
    schema: TagErrorSchemas.TagInUse,
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found.',
    schema: TagErrorSchemas.TagNotFound,
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
  @ApiParam({ name: 'id', description: 'Tag ID', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tagsService.remove(id);
  }

  @Post('bulk-delete')
  @RequireAdmin
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete tags' })
  @ApiResponse({
    status: 200,
    description: 'Tags have been successfully deleted.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tags deleted successfully' },
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
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number', format: 'int32', minimum: 1 },
          description:
            'Array of tag IDs to delete. Must contain at least one ID.',
          example: [1, 2, 3],
        },
      },
    },
  })
  bulkRemove(
    @Body(new ZodValidationPipe(bulkDeleteSchema))
    bulkDeleteDto: BulkDeleteDto,
  ) {
    return this.tagsService.bulkRemove(bulkDeleteDto.ids);
  }
}
