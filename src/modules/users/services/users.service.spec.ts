import { CryptoService } from '@app/common/utils/crypto/crypto.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { GetUsersQueryDto } from '../dto/users.dto';
import { User } from '../entities/users.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let cryptoService: CryptoService;

  const mockUser: User = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword',
    avatar: 'https://example.com/avatar.jpg',
    isAdmin: false,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    tokens: [],
    deletedAt: undefined,
    orders: [],
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockCryptoService = {
    verifyPassword: jest.fn(),
    hashPassword: jest.fn(),
    createRefreshTokenHash: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    cryptoService = module.get<CryptoService>(CryptoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        withDeleted: undefined,
      });
    });

    it('should include deleted users when withDeleted is true', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await service.findById(1, true);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        withDeleted: true,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('john@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
    });

    it('should return null when user not found by email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        avatar: mockUser.avatar,
        isAdmin: mockUser.isAdmin,
        lastLoginAt: mockUser.lastLoginAt,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        deletedAt: mockUser.deletedAt,
      });
    });

    it('should include deleted profile when includeDeleted is true', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      mockUserRepository.findOne.mockResolvedValue(deletedUser);

      const result = await service.getProfile(1, true);

      expect(result.deletedAt).toBeDefined();
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        withDeleted: true,
      });
    });
  });

  describe('updatePassword', () => {
    const updatePasswordDto = {
      currentPassword: 'oldPassword',
      newPassword: 'newPassword123!',
      password_confirmation: 'newPassword123!',
    };

    it('should update password successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockCryptoService.verifyPassword.mockResolvedValue(true);
      mockCryptoService.hashPassword.mockResolvedValue('hashedNewPassword');
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updatePassword(1, updatePasswordDto);

      expect(result).toEqual({ message: 'Password updated successfully' });
      expect(mockCryptoService.verifyPassword).toHaveBeenCalledWith(
        'oldPassword',
        'hashedPassword',
      );
      expect(mockCryptoService.hashPassword).toHaveBeenCalledWith(
        'newPassword123!',
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        password: 'hashedNewPassword',
        updatedAt: expect.any(Date),
      });
    });

    it('should throw BadRequestException when current password is incorrect', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockCryptoService.verifyPassword.mockResolvedValue(false);

      await expect(
        service.updatePassword(1, updatePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateAvatar', () => {
    const updateAvatarDto = {
      avatar: 'https://example.com/new-avatar.jpg',
    };

    it('should update avatar successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateAvatar(1, updateAvatarDto);

      expect(result).toEqual({
        message: 'Avatar updated successfully',
        avatar: 'https://example.com/new-avatar.jpg',
      });
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        avatar: 'https://example.com/new-avatar.jpg',
        updatedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateAvatar(999, updateAvatarDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
    };

    it('should update profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateProfileDto };
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call for findById
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(updatedUser); // Final fetch after update
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateProfile(1, updateProfileDto);

      expect(result.message).toBe('Profile updated successfully');
      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@example.com');
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        ...updateProfileDto,
        updatedAt: expect.any(Date),
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      const anotherUser = { ...mockUser, id: 2 };
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call for findById
        .mockResolvedValueOnce(anotherUser); // Email check returns existing user

      await expect(service.updateProfile(1, updateProfileDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update name only without email conflict check', async () => {
      const nameOnlyDto = { name: 'Jane Doe' };
      const updatedUser = { ...mockUser, ...nameOnlyDto };
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call for findById
        .mockResolvedValueOnce(updatedUser); // Final fetch after update
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateProfile(1, nameOnlyDto);

      expect(result.message).toBe('Profile updated successfully');
      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('john@example.com'); // unchanged
      // Verify email conflict check was not called
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateLastLogin(1);

      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        lastLoginAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete account successfully', async () => {
      mockUserRepository.softDelete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteAccount(1);

      expect(result).toEqual({ message: 'Account deleted successfully' });
      expect(mockUserRepository.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('findAll', () => {
    it('should return paginated users with default params', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: 2, email: 'user2@example.com' },
      ];
      mockUserRepository.findAndCount.mockResolvedValue([users, 2]);

      const result = await service.findAll({
        limit: 10,
        page: 1,
        sortOrder: 'ASC',
      });

      expect(result.data.length).toBe(2);
      expect(result.metadata).toEqual({
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'ASC' },
        withDeleted: undefined,
      });
    });

    it('should apply search filter correctly', async () => {
      const users = [mockUser];
      mockUserRepository.findAndCount.mockResolvedValue([users, 1]);

      await service.findAll({
        limit: 10,
        page: 1,
        search: 'john',
        sortOrder: 'ASC',
      });

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'ASC' },
        withDeleted: undefined,
        where: [{ name: Like('%john%') }, { email: Like('%john%') }],
      });
    });

    it('should apply specific filters correctly', async () => {
      const users = [mockUser];
      mockUserRepository.findAndCount.mockResolvedValue([users, 1]);

      const query: GetUsersQueryDto = {
        limit: 10,
        page: 1,
        sortOrder: 'ASC',
        includeDeleted: true,
        isAdmin: true,
        name: 'Admin',
        email: 'admin@example.com',
      };

      await service.findAll(query);

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'ASC' },
        withDeleted: true,
        where: {
          isAdmin: true,
          name: Like('%Admin%'),
          email: Like('%admin@example.com%'),
        },
      });
    });

    it('should apply pagination correctly', async () => {
      const users = [{ ...mockUser, id: 3 }];
      mockUserRepository.findAndCount.mockResolvedValue([users, 5]);

      const result = await service.findAll({
        page: 2,
        limit: 2,
        sortBy: 'name',
        sortOrder: 'DESC',
      });

      expect(result.metadata).toEqual({
        currentPage: 2,
        itemsPerPage: 2,
        totalItems: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        skip: 2,
        take: 2,
        order: { name: 'DESC' },
        withDeleted: undefined,
      });
    });
  });

  describe('create', () => {
    const createUserDto = {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'Password123!',
      isAdmin: false,
    };

    it('should create a new user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // No existing user with that email
      mockCryptoService.hashPassword.mockResolvedValue('hashedPassword');
      mockUserRepository.create.mockReturnValue({
        ...createUserDto,
        password: 'hashedPassword',
      });
      mockUserRepository.save.mockResolvedValue({
        id: 3,
        ...createUserDto,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createUserDto);

      expect(result).toEqual({
        id: 3,
        name: 'New User',
        email: 'newuser@example.com',
        isAdmin: false,
        avatar: undefined,
        lastLoginAt: undefined,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        deletedAt: undefined,
      });
      expect(mockCryptoService.hashPassword).toHaveBeenCalledWith(
        'Password123!',
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashedPassword',
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser); // Email already exists

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateUserByAdmin', () => {
    const adminUpdateUserDto = {
      name: 'Updated by Admin',
      email: 'admin-update@example.com',
      password: 'AdminNewPass123!',
      isAdmin: true,
      recover: false,
    };

    it('should update user by admin successfully', async () => {
      const updatedUser = {
        ...mockUser,
        ...adminUpdateUserDto,
        password: 'hashedNewPassword',
      };
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call for findById
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(updatedUser); // Final fetch after update
      mockCryptoService.hashPassword.mockResolvedValue('hashedNewPassword');
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateUserByAdmin(1, adminUpdateUserDto);

      expect(result.message).toBe('User updated successfully');
      expect(result.name).toBe('Updated by Admin');
      expect(result.email).toBe('admin-update@example.com');
      expect(result.isAdmin).toBe(true);
      expect(mockCryptoService.hashPassword).toHaveBeenCalledWith(
        'AdminNewPass123!',
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        name: 'Updated by Admin',
        email: 'admin-update@example.com',
        isAdmin: true,
        password: 'hashedNewPassword',
        updatedAt: expect.any(Date),
      });
    });

    it('should recover a deleted user when recover is true', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      const recoverDto = { recover: true };
      mockUserRepository.findOne
        .mockResolvedValueOnce(deletedUser) // First call for findById with deleted user
        .mockResolvedValueOnce({ ...deletedUser, deletedAt: null }); // Final fetch after update
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateUserByAdmin(1, recoverDto);

      expect(result.message).toBe('User updated successfully');
      expect(result.deletedAt).toBeNull();
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        updatedAt: expect.any(Date),
        deletedAt: null,
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      const anotherUser = { ...mockUser, id: 2 };
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call for findById
        .mockResolvedValueOnce(anotherUser); // Email check returns existing user

      await expect(
        service.updateUserByAdmin(1, adminUpdateUserDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should update without password if not provided', async () => {
      const updateWithoutPasswordDto = {
        name: 'Updated Name Only',
        isAdmin: true,
        recover: false,
      };
      const updatedUser = { ...mockUser, ...updateWithoutPasswordDto };
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call for findById
        .mockResolvedValueOnce(updatedUser); // Final fetch after update
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateUserByAdmin(1, updateWithoutPasswordDto);

      expect(mockCryptoService.hashPassword).not.toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        name: 'Updated Name Only',
        isAdmin: true,
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('bulkDeleteAccounts', () => {
    it('should soft delete multiple accounts successfully', async () => {
      mockUserRepository.softDelete.mockResolvedValue({ affected: 3 });

      const result = await service.bulkDeleteAccounts([1, 2, 3]);

      expect(result).toEqual({
        message: 'Users deleted successfully',
        count: 3,
      });
      expect(mockUserRepository.softDelete).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should return zero count when no accounts affected', async () => {
      mockUserRepository.softDelete.mockResolvedValue({ affected: 0 });

      const result = await service.bulkDeleteAccounts([999, 998]);

      expect(result).toEqual({
        message: 'Users deleted successfully',
        count: 0,
      });
    });
  });
});
