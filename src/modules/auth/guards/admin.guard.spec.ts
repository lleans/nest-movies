import { JwtPayload } from '@app/common/types/jwt.type';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let userRepository: Repository<User>;
  let reflector: Reflector;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    reflector = module.get<Reflector>(Reflector);

    // Mock the parent canActivate method
    jest.spyOn(Object.getPrototypeOf(AdminGuard.prototype), 'canActivate');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  const createMockExecutionContext = (user?: JwtPayload): ExecutionContext => {
    const mockRequest = {
      user,
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getType: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
  describe('canActivate', () => {
    it('should allow access for admin users', async () => {
      const mockUser = { id: 1, sub: 1 };
      const mockUserEntity = { id: 1, isAdmin: true };
      const context = createMockExecutionContext(mockUser);

      // Mock the parent canActivate method to return true
      const parentCanActivate = jest.spyOn(
        Object.getPrototypeOf(AdminGuard.prototype),
        'canActivate',
      );
      parentCanActivate.mockResolvedValue(true);

      // Mock user repository response
      mockUserRepository.findOne.mockResolvedValue(mockUserEntity);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['id', 'isAdmin'],
      });
      // The request.user should now be the user entity returned from the repository
      expect(context.switchToHttp().getRequest().user).toBe(mockUserEntity);
    });
    it('should deny access for non-admin users', async () => {
      const mockUser = { id: 1, sub: 1 };
      const mockUserEntity = { id: 1, isAdmin: false };
      const context = createMockExecutionContext(mockUser);

      // Mock the parent canActivate method to return true
      const parentCanActivate = jest.spyOn(
        Object.getPrototypeOf(AdminGuard.prototype),
        'canActivate',
      );
      parentCanActivate.mockResolvedValue(true);

      // Mock user repository response
      mockUserRepository.findOne.mockResolvedValue(mockUserEntity);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException(
          'Access denied. Administrator privileges required.',
        ),
      );

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['id', 'isAdmin'],
      });
    });
    it('should deny access when user is not found in database', async () => {
      const mockUser = {
        id: 999,
        sub: 999,
      };
      const context = createMockExecutionContext(mockUser);

      // Mock the parent canActivate method to return true
      const parentCanActivate = jest.spyOn(
        Object.getPrototypeOf(AdminGuard.prototype),
        'canActivate',
      );
      parentCanActivate.mockResolvedValue(true);

      // Mock user repository response - user not found
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
        select: ['id', 'isAdmin'],
      });
    });

    it('should deny access when user token is invalid', async () => {
      const context = createMockExecutionContext(undefined); // No user in request

      // Mock the parent canActivate method to return true
      const parentCanActivate = jest.spyOn(
        Object.getPrototypeOf(AdminGuard.prototype),
        'canActivate',
      );
      parentCanActivate.mockResolvedValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid user token'),
      );

      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });
    it('should deny access when JWT authentication fails', async () => {
      const mockUser = { sub: 1 };
      const context = createMockExecutionContext(mockUser);

      // Mock the parent canActivate method to return false
      const parentCanActivate = jest.spyOn(
        Object.getPrototypeOf(AdminGuard.prototype),
        'canActivate',
      );
      parentCanActivate.mockResolvedValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
