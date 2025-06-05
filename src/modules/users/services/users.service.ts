import {
  PaginatedResponse,
  createPaginatedResponse,
} from '@app/common/dto/pagination.dto';
import { CryptoService } from '@app/common/utils/crypto/crypto.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Like, Repository } from 'typeorm';
import {
  AdminUpdateUserDto,
  CreateUserDto,
  GetUsersQueryDto,
  UpdateAvatarDto,
  UpdateAvatarResponseDto,
  UpdatePasswordDto,
  UpdatePasswordResponseDto,
  UpdateProfileDto,
  UpdateProfileResponseDto,
  UserResponseDto,
} from '../dto/users.dto';
import { User } from '../entities/users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Find user by ID
   */
  async findById(id: number, withDeleted?: boolean): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  /**
   * Convert User entity to UserResponseDto
   */
  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  /**
   * Get user profile
   */
  async getProfile(
    userId: number,
    includeDeleted?: boolean,
  ): Promise<UserResponseDto> {
    const user = await this.findById(userId, includeDeleted);
    return this.toUserResponse(user);
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: number,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<UpdatePasswordResponseDto> {
    const user = await this.findById(userId);

    // Verify current password
    const isCurrentPasswordValid = await this.cryptoService.verifyPassword(
      updatePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await this.cryptoService.hashPassword(
      updatePasswordDto.newPassword,
    );

    // Update password
    await this.userRepository.update(userId, {
      password: hashedNewPassword,
      updatedAt: new Date(),
    });

    return {
      message: 'Password updated successfully',
    };
  }

  /**
   * Update user avatar
   */
  async updateAvatar(
    userId: number,
    updateAvatarDto: UpdateAvatarDto,
  ): Promise<UpdateAvatarResponseDto> {
    await this.findById(userId); // Ensure user exists

    await this.userRepository.update(userId, {
      avatar: updateAvatarDto.avatar,
      updatedAt: new Date(),
    });

    return {
      message: 'Avatar updated successfully',
      avatar: updateAvatarDto.avatar,
    };
  }

  /**
   * Update user profile (name and/or email)
   */
  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UpdateProfileResponseDto> {
    const user = await this.findById(userId);

    // Check if email is being updated and if it's already taken
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateProfileDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    // Update user
    // TypeORM's update method ignores undefined properties, so spreading the DTO is safe.
    await this.userRepository.update(userId, {
      ...updateProfileDto, // Contains name? and email?
      updatedAt: new Date(),
    });

    // Fetch updated user
    const updatedUser = await this.findById(userId);

    return {
      message: 'Profile updated successfully',
      ...this.toUserResponse(updatedUser),
    };
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: number): Promise<{ message: string }> {
    // Soft delete by setting deletedAt timestamp
    await this.userRepository.softDelete(userId);

    return {
      message: 'Account deleted successfully',
    };
  }

  /**
   * Get all users with pagination and filtering
   */
  async findAll(
    query: GetUsersQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const {
      page = 1,
      limit = 10,
      search,
      isAdmin,
      email,
      name,
      sortBy = 'createdAt',
      sortOrder = 'ASC',
      includeDeleted,
    } = query;

    const findOptions: FindManyOptions<User> = {
      skip: (page - 1) * limit,
      take: limit,
      order: { [sortBy]: sortOrder },
      withDeleted: includeDeleted,
    };

    // Build where conditions
    const whereConditions: any = {};

    if (isAdmin !== undefined) {
      whereConditions.isAdmin = isAdmin;
    }

    if (email) {
      whereConditions.email = Like(`%${email}%`);
    }

    if (name) {
      whereConditions.name = Like(`%${name}%`);
    }

    if (search) {
      // If search is provided, search in both name and email
      findOptions.where = [
        { ...whereConditions, name: Like(`%${search}%`) },
        { ...whereConditions, email: Like(`%${search}%`) },
      ];
    } else if (Object.keys(whereConditions).length > 0) {
      findOptions.where = whereConditions;
    }

    const [users, totalItems] =
      await this.userRepository.findAndCount(findOptions);

    const userResponses = users.map((user) => this.toUserResponse(user));

    return createPaginatedResponse(userResponses, page, limit, totalItems);
  }

  /**
   * Create a new user (admin only)
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if email already exists
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await this.cryptoService.hashPassword(
      createUserDto.password,
    );

    // Create user
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    return this.toUserResponse(savedUser);
  }

  /**
   * Update user by admin (includes password capability)
   */
  async updateUserByAdmin(
    userId: number,
    adminUpdateUserDto: AdminUpdateUserDto,
  ): Promise<UpdateProfileResponseDto> {
    const user = await this.findById(userId, adminUpdateUserDto.recover);

    // Check if email is being updated and if it's already taken
    if (adminUpdateUserDto.email && adminUpdateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(adminUpdateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    const { password, recover, ...otherUpdateData } = adminUpdateUserDto;

    const updateData: Partial<User> = {
      ...otherUpdateData, // Spreads name?, email?, isAdmin? if they are present in the DTO
      updatedAt: new Date(),
    };

    if (recover) {
      // Setting deletedAt to null will effectively "un-soft-delete" the user.
      updateData.deletedAt = null as any; // TypeORM requires a value for soft delete, so we use null
    }

    if (password !== undefined) {
      updateData.password = await this.cryptoService.hashPassword(password);
    }

    // Update user
    await this.userRepository.update(userId, updateData);

    // Fetch updated user
    const updatedUser = await this.findById(userId);

    return {
      message: 'User updated successfully',
      ...this.toUserResponse(updatedUser),
    };
  }

  /**
   * Bulk delete user accounts
   */
  async bulkDeleteAccounts(
    userIds: number[],
  ): Promise<{ message: string; count: number }> {
    // Soft delete users by setting deletedAt timestamp
    const result = await this.userRepository.softDelete(userIds);

    return {
      message: 'Users deleted successfully',
      count: result.affected || 0,
    };
  }
}
