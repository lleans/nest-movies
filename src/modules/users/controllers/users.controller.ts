import { GetCurrentUser } from '@app/common/decorator/current-user.decorator';

import {
  BulkDeleteDto,
  bulkDeleteSchema,
} from '@app/common/dto/bulk-delete.dto';
import {
  CommonErrorSchemas,
  UserErrorSchemas,
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
  Patch,
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
import {
  AdminUpdateUserDto,
  AdminUpdateUserSchema,
  CreateUserDto,
  CreateUserSchema,
  GetUsersQueryDto,
  GetUsersQuerySchema,
  UpdateAvatarDto,
  UpdateAvatarResponseDto,
  UpdateAvatarSchema,
  UpdatePasswordDto,
  UpdatePasswordResponseDto,
  UpdatePasswordSchema,
  UpdateProfileDto,
  UpdateProfileResponseDto,
  UpdateProfileSchema,
  UserResponseDto,
} from '../dto/users.dto';
import { UsersService } from '../services/users.service';

@Controller('users')
@ApiTags('Users')
@JWTAccessGuard
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users with pagination (admin only)
   */
  @Get()
  @RequireAdmin
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Retrieve a paginated list of all users. Only accessible by administrators.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Field to sort by (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (default: ASC)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter by name or email',
  })
  @ApiQuery({
    name: 'isAdmin',
    required: false,
    type: Boolean,
    description: 'Filter by admin status',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Filter by email',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filter by name',
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Include deleted users in the results',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved users',
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
              name: { type: 'string', example: 'John Doe' },
              email: { type: 'string', example: 'john.doe@example.com' },
              avatar: {
                type: 'string',
                nullable: true,
                example: 'https://example.com/avatar.jpg',
              },
              isAdmin: { type: 'boolean', example: false },
              lastLoginAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                example: '2023-01-01T12:00:00Z',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T10:00:00Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T11:00:00Z',
              },
              deletedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                example: null,
              },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            currentPage: { type: 'number', example: 1 },
            itemsPerPage: { type: 'number', example: 10 },
            totalItems: { type: 'number', example: 50 },
            totalPages: { type: 'number', example: 5 },
          },
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
  // Auth/permission responses handled by @JWTAccessGuard and @RequireAdmin
  async getUsers(
    @Query(new ZodValidationPipe(GetUsersQuerySchema)) query: GetUsersQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    return await this.usersService.findAll(query);
  }

  /**
   * Get current user profile
   */
  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieve the profile information of the currently authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user profile',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OK' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john.doe@example.com' },
            avatar: {
              type: 'string',
              nullable: true,
              example: 'https://example.com/avatar.jpg',
            },
            isAdmin: { type: 'boolean', example: false },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2023-01-01T12:00:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T11:00:00Z',
            },
            deletedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: null,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: UserErrorSchemas.UserNotFound,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  async getProfile(
    @GetCurrentUser('id') userId: number,
  ): Promise<UserResponseDto> {
    return await this.usersService.getProfile(userId);
  }

  /**
   * Get user by ID (admin only)
   */
  @Get(':id')
  @RequireAdmin
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Retrieve a specific user by their ID. Only accessible by administrators.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Include deleted users when retrieving by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OK' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john.doe@example.com' },
            avatar: {
              type: 'string',
              nullable: true,
              example: 'https://example.com/avatar.jpg',
            },
            isAdmin: { type: 'boolean', example: false },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2023-01-01T12:00:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T11:00:00Z',
            },
            deletedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: null,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: UserErrorSchemas.UserNotFound,
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
  // Auth/permission responses handled by @JWTAccessGuard and @RequireAdmin
  async getUserById(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeDeleted') includeDeleted?: boolean,
  ): Promise<UserResponseDto> {
    return await this.usersService.getProfile(id, includeDeleted);
  }

  /**
   * Create a new user (admin only)
   */
  @Post()
  @RequireAdmin
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Create a new user account. Only accessible by administrators.',
  })
  @ApiBody({
    description: 'User creation data',
    schema: {
      type: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: {
          type: 'string',
          minLength: 2,
          maxLength: 255,
          description: 'User full name',
          example: 'John Doe',
        },
        email: {
          type: 'string',
          format: 'email',
          maxLength: 255,
          description: 'User email address',
          example: 'john.doe@example.com',
        },
        password: {
          type: 'string',
          minLength: 8,
          description:
            'User password (must contain at least one lowercase letter, one uppercase letter, one number, and one special character)',
          example: 'StrongP@ssw0rd',
        },
        isAdmin: {
          type: 'boolean',
          default: false,
          description: 'Whether the user has admin privileges',
          example: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Created' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john.doe@example.com' },
            avatar: { type: 'string', nullable: true, example: null },
            isAdmin: { type: 'boolean', example: false },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: null,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T10:00:00Z',
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
    description: 'Conflict - Email already exists',
    schema: UserErrorSchemas.EmailConflict,
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
  // Auth/permission responses handled by @JWTAccessGuard and @RequireAdmin
  async createUser(
    @Body(new ZodValidationPipe(CreateUserSchema)) createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return await this.usersService.create(createUserDto);
  }

  /**
   * Update user password
   */
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user password',
    description: 'Update the password for the currently authenticated user.',
  })
  @ApiBody({
    description: 'Password update data',
    schema: {
      type: 'object',
      required: ['currentPassword', 'newPassword', 'password_confirmation'],
      properties: {
        currentPassword: {
          type: 'string',
          description: 'Current password for verification',
          example: 'OldP@ssw0rd',
        },
        newPassword: {
          type: 'string',
          minLength: 8,
          description:
            'New password (must contain at least one lowercase letter, one uppercase letter, one number, and one special character)',
          example: 'NewStrongP@ssw0rd',
        },
        password_confirmation: {
          type: 'string',
          description: 'Password confirmation (must match newPassword)',
          example: 'NewStrongP@ssw0rd',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password successfully updated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Password updated successfully' },
        data: {
          type: 'object',
          properties: {},
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or password mismatch',
    schema: CommonErrorSchemas.ValidationError,
  })
  // Auth response handled by @JWTAccessGuard
  async updatePassword(
    @GetCurrentUser('id') userId: number,
    @Body(new ZodValidationPipe(UpdatePasswordSchema))
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<UpdatePasswordResponseDto> {
    return await this.usersService.updatePassword(userId, updatePasswordDto);
  }

  /**
   * Update user avatar
   */
  @Patch('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user avatar',
    description: 'Update the avatar URL for the currently authenticated user.',
  })
  @ApiBody({
    description: 'Avatar update data',
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'uri',
          description: 'Avatar image URL',
          example: 'https://example.com/avatar.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar successfully updated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Avatar updated successfully' },
        data: {
          type: 'object',
          properties: {
            avatar: {
              type: 'string',
              example: 'https://example.com/avatar.jpg',
              description: 'Updated avatar URL',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid avatar URL',
    schema: CommonErrorSchemas.ValidationError,
  })
  // Auth response handled by @JWTAccessGuard
  async updateAvatar(
    @GetCurrentUser('id') userId: number,
    @Body(new ZodValidationPipe(UpdateAvatarSchema))
    updateAvatarDto: UpdateAvatarDto,
  ): Promise<UpdateAvatarResponseDto> {
    return await this.usersService.updateAvatar(userId, updateAvatarDto);
  }

  /**
   * Update user profile (name, email)
   */
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update the profile information (name, email) for the currently authenticated user.',
  })
  @ApiBody({
    description: 'Profile update data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 2,
          maxLength: 255,
          description: 'User full name',
          example: 'John Updated Doe',
        },
        email: {
          type: 'string',
          format: 'email',
          maxLength: 255,
          description: 'User email address',
          example: 'john.updated@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile successfully updated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Profile updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'John Updated Doe' },
            email: { type: 'string', example: 'john.updated@example.com' },
            avatar: {
              type: 'string',
              nullable: true,
              example: 'https://example.com/avatar.jpg',
            },
            isAdmin: { type: 'boolean', example: false },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2023-01-01T12:00:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T14:00:00Z',
            },
            message: {
              type: 'string',
              example: 'Profile updated successfully',
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
    description: 'Conflict - Email already exists',
    schema: UserErrorSchemas.EmailConflict,
  })
  // Auth response handled by @JWTAccessGuard
  async updateProfile(
    @GetCurrentUser('id') userId: number,
    @Body(new ZodValidationPipe(UpdateProfileSchema))
    updateProfileDto: UpdateProfileDto,
  ): Promise<UpdateProfileResponseDto> {
    return await this.usersService.updateProfile(userId, updateProfileDto);
  }

  /**
   * Update user by ID (admin only)
   */
  @Put(':id')
  @RequireAdmin
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user by ID',
    description:
      'Update the profile information of a specific user by their ID. Admins can update name, email, password, and admin status. Only accessible by administrators.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiBody({
    description: 'Admin user update data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 2,
          maxLength: 255,
          description: 'User full name',
          example: 'John Admin-Updated Doe',
        },
        email: {
          type: 'string',
          format: 'email',
          maxLength: 255,
          description: 'User email address',
          example: 'john.admin-updated@example.com',
        },
        password: {
          type: 'string',
          minLength: 8,
          description:
            'New password (must contain at least one lowercase letter, one uppercase letter, one number, and one special character)',
          example: 'AdminNewP@ssw0rd',
        },
        isAdmin: {
          type: 'boolean',
          description: 'Whether the user has admin privileges',
          example: true,
        },
        recover: {
          type: 'boolean',
          default: false,
          description:
            'Whether to recover a deleted user (set deletedAt to NULL)',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'John Admin-Updated Doe' },
            email: {
              type: 'string',
              example: 'john.admin-updated@example.com',
            },
            avatar: {
              type: 'string',
              nullable: true,
              example: 'https://example.com/avatar.jpg',
            },
            isAdmin: { type: 'boolean', example: true },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2023-01-01T12:00:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T15:00:00Z',
            },
            deletedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: null,
              description:
                'Date when user was deleted (null if active or recovered)',
            },
            message: { type: 'string', example: 'User updated successfully' },
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
    description: 'User not found',
    schema: UserErrorSchemas.UserNotFound,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists',
    schema: UserErrorSchemas.EmailConflict,
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
  // Auth/permission responses handled by @JWTAccessGuard and @RequireAdmin
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(AdminUpdateUserSchema))
    adminUpdateUserDto: AdminUpdateUserDto,
  ): Promise<UpdateProfileResponseDto> {
    return await this.usersService.updateUserByAdmin(id, adminUpdateUserDto);
  }

  /**
   * Delete user by ID (admin only)
   */
  @Delete(':id')
  @RequireAdmin
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete user by ID',
    description:
      'Delete a specific user account by their ID. Only accessible by administrators.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User successfully deleted',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Account deleted successfully' },
        data: {
          type: 'object',
          properties: {},
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: UserErrorSchemas.UserNotFound,
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
  // Auth/permission responses handled by @JWTAccessGuard and @RequireAdmin
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return await this.usersService.deleteAccount(id);
  }

  /**
   * Bulk delete users (admin only)
   */
  @Post('bulk-delete')
  @RequireAdmin
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete users',
    description:
      'Delete multiple user accounts by their IDs. Only accessible by administrators.',
  })
  @ApiBody({
    description: 'User IDs to delete',
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number', format: 'int32', minimum: 1 },
          description:
            'Array of user IDs to delete. Must contain at least one ID.',
          example: [1, 2, 3],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Users successfully deleted',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Users deleted successfully' },
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
  async bulkDeleteUsers(
    @Body(new ZodValidationPipe(bulkDeleteSchema))
    bulkDeleteDto: BulkDeleteDto,
  ): Promise<{ message: string; count: number }> {
    return await this.usersService.bulkDeleteAccounts(bulkDeleteDto.ids);
  }
}
