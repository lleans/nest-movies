import { BulkDeleteDto } from '@app/common/dto/bulk-delete.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AdminUpdateUserDto,
  CreateUserDto,
  GetUsersQueryDto,
  UpdateAvatarDto,
  UpdatePasswordDto,
  UpdateProfileDto,
  UserResponseDto,
} from '../dto/users.dto';
import { UsersService } from '../services/users.service';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUserResponse: UserResponseDto = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://example.com/avatar.jpg',
    isAdmin: false,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  };

  const mockUsersService = {
    findAll: jest.fn(),
    getProfile: jest.fn(),
    create: jest.fn(),
    updatePassword: jest.fn(),
    updateAvatar: jest.fn(),
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
    updateUserByAdmin: jest.fn(),
    bulkDeleteAccounts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: 'UserRepository',
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const query: GetUsersQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'ASC',
      };

      const paginatedResponse = {
        data: [mockUserResponse],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
        },
      };

      mockUsersService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.getUsers(query);

      expect(result).toEqual(paginatedResponse);
      expect(mockUsersService.findAll).toHaveBeenCalledWith(query);
    });

    it('should apply filters when provided', async () => {
      const query: GetUsersQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        search: 'john',
        isAdmin: true,
        email: 'admin@example.com',
        name: 'Admin',
        includeDeleted: true,
      };

      mockUsersService.findAll.mockResolvedValue({
        data: [],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 0,
          totalPages: 0,
        },
      });

      await controller.getUsers(query);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getProfile', () => {
    it('should return the user profile', async () => {
      mockUsersService.getProfile.mockResolvedValue(mockUserResponse);

      const result = await controller.getProfile(1);

      expect(result).toEqual(mockUserResponse);
      expect(mockUsersService.getProfile).toHaveBeenCalledWith(1);
    });

    it('should handle not found errors', async () => {
      mockUsersService.getProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.getProfile(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserById', () => {
    it('should return the user when found', async () => {
      mockUsersService.getProfile.mockResolvedValue(mockUserResponse);

      const result = await controller.getUserById(1);

      expect(result).toEqual(mockUserResponse);
      expect(mockUsersService.getProfile).toHaveBeenCalledWith(1, undefined);
    });

    it('should include deleted users when includeDeleted is true', async () => {
      mockUsersService.getProfile.mockResolvedValue({
        ...mockUserResponse,
        deletedAt: new Date(),
      });

      await controller.getUserById(1, true);

      expect(mockUsersService.getProfile).toHaveBeenCalledWith(1, true);
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'Password123!',
        isAdmin: false,
      };

      mockUsersService.create.mockResolvedValue({
        id: 2,
        name: 'New User',
        email: 'newuser@example.com',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.createUser(createUserDto);

      expect(result.name).toBe('New User');
      expect(result.email).toBe('newuser@example.com');
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should handle email conflict', async () => {
      const createUserDto: CreateUserDto = {
        name: 'New User',
        email: 'existing@example.com',
        password: 'Password123!',
        isAdmin: false,
      };

      mockUsersService.create.mockRejectedValue(
        new ConflictException('Email already exists'),
      );

      await expect(controller.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const updatePasswordDto: UpdatePasswordDto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        password_confirmation: 'NewPassword123!',
      };

      mockUsersService.updatePassword.mockResolvedValue({
        message: 'Password updated successfully',
      });

      const result = await controller.updatePassword(1, updatePasswordDto);

      expect(result.message).toBe('Password updated successfully');
      expect(mockUsersService.updatePassword).toHaveBeenCalledWith(
        1,
        updatePasswordDto,
      );
    });
  });

  describe('updateAvatar', () => {
    it('should update avatar successfully', async () => {
      const updateAvatarDto: UpdateAvatarDto = {
        avatar: 'https://example.com/new-avatar.jpg',
      };

      mockUsersService.updateAvatar.mockResolvedValue({
        message: 'Avatar updated successfully',
        avatar: 'https://example.com/new-avatar.jpg',
      });

      const result = await controller.updateAvatar(1, updateAvatarDto);

      expect(result.message).toBe('Avatar updated successfully');
      expect(result.avatar).toBe('https://example.com/new-avatar.jpg');
      expect(mockUsersService.updateAvatar).toHaveBeenCalledWith(
        1,
        updateAvatarDto,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateProfileDto: UpdateProfileDto = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      mockUsersService.updateProfile.mockResolvedValue({
        message: 'Profile updated successfully',
        id: 1,
        name: 'Updated Name',
        email: 'updated@example.com',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.updateProfile(1, updateProfileDto);

      expect(result.message).toBe('Profile updated successfully');
      expect(result.name).toBe('Updated Name');
      expect(result.email).toBe('updated@example.com');
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        1,
        updateProfileDto,
      );
    });

    it('should handle email conflict', async () => {
      const updateProfileDto: UpdateProfileDto = {
        email: 'existing@example.com',
      };

      mockUsersService.updateProfile.mockRejectedValue(
        new ConflictException('Email already exists'),
      );

      await expect(
        controller.updateProfile(1, updateProfileDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateUser', () => {
    it('should update user by admin successfully', async () => {
      const adminUpdateUserDto: AdminUpdateUserDto = {
        name: 'Admin Updated',
        email: 'admin-updated@example.com',
        isAdmin: true,
        password: 'NewAdminPass123!',
        recover: false,
      };

      mockUsersService.updateUserByAdmin.mockResolvedValue({
        message: 'User updated successfully',
        id: 1,
        name: 'Admin Updated',
        email: 'admin-updated@example.com',
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.updateUser(1, adminUpdateUserDto);

      expect(result.message).toBe('User updated successfully');
      expect(result.name).toBe('Admin Updated');
      expect(result.isAdmin).toBe(true);
      expect(mockUsersService.updateUserByAdmin).toHaveBeenCalledWith(
        1,
        adminUpdateUserDto,
      );
    });

    it('should recover deleted user when recover is true', async () => {
      const recoverDto: AdminUpdateUserDto = {
        recover: true,
      };

      mockUsersService.updateUserByAdmin.mockResolvedValue({
        message: 'User updated successfully',
        id: 1,
        name: 'Recovered User',
        email: 'recovered@example.com',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const result = await controller.updateUser(1, recoverDto);

      expect(result.message).toBe('User updated successfully');
      expect(result.deletedAt).toBeNull();
      expect(mockUsersService.updateUserByAdmin).toHaveBeenCalledWith(
        1,
        recoverDto,
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockUsersService.deleteAccount.mockResolvedValue({
        message: 'Account deleted successfully',
      });

      const result = await controller.deleteUser(1);

      expect(result.message).toBe('Account deleted successfully');
      expect(mockUsersService.deleteAccount).toHaveBeenCalledWith(1);
    });
  });

  describe('bulkDeleteUsers', () => {
    it('should bulk delete users successfully', async () => {
      const bulkDeleteDto: BulkDeleteDto = {
        ids: [1, 2, 3],
      };

      mockUsersService.bulkDeleteAccounts.mockResolvedValue({
        message: 'Users deleted successfully',
        count: 3,
      });

      const result = await controller.bulkDeleteUsers(bulkDeleteDto);

      expect(result.message).toBe('Users deleted successfully');
      expect(result.count).toBe(3);
      expect(mockUsersService.bulkDeleteAccounts).toHaveBeenCalledWith([
        1, 2, 3,
      ]);
    });
  });
});
