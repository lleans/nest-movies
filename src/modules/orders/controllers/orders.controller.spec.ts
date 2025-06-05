import { PaginatedResponse } from '@app/common/dto/pagination.dto';
import { AdminGuard } from '@app/modules/auth/guards/admin.guard';
import { JWTAccessGuard } from '@app/modules/auth/guards/jwt-access.guard';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import {
  CreateOrderDto,
  OrderQueryDto,
  UpdateOrderStatusDto,
} from '../dto/order.dto';
import { SeatStatus } from '../entities/order-item.entity';
import { OrderStatus, PaymentMethod } from '../entities/orders.entity';
import { OrdersService } from '../services/orders.service';
import { OrdersController } from './orders.controller';

interface RequestWithUser extends Request {
  user: any;
}

// Mock JWTAccessGuard
class MockJwtGuard implements CanActivate {
  canActivate = jest.fn().mockReturnValue(true);
}

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: jest.Mocked<OrdersService>;
  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'test@gmail.com',
    isAdmin: true,
    password: '',
    orders: [],
  };
  const mockRequest = {
    user: mockUser,
  } as unknown as RequestWithUser;
  const mockOrderResponse = {
    id: 1,
    userId: 1,
    orderNumber: 'ORD-12345678-ABCDEF',
    paymentMethod: PaymentMethod.DEBIT,
    totalItemPrice: 150,
    status: OrderStatus.PENDING,
    expiresAt: new Date().toISOString(),
    user: {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    },
    orderItems: [
      {
        id: 1,
        orderId: 1,
        movieScheduleId: 1,
        seatId: 1,
        qty: 1,
        price: 50,
        subTotalPrice: 50,
        status: SeatStatus.PENDING,
        snapshots: {
          movieTitle: 'Test Movie',
          moviePoster: 'https://example.com/poster.jpg',
          studioNumber: 1,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          date: '2023-12-01',
          priceAtPurchase: 50,
          seatLabel: 'A1',
        },
        seat: {
          id: 1,
          rowLabel: 'A',
          seatNumber: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPaginatedResponse: PaginatedResponse<typeof mockOrderResponse> = {
    data: [mockOrderResponse],
    metadata: {
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockOrderResponse),
            findAll: jest.fn().mockResolvedValue(mockPaginatedResponse),
            findOne: jest.fn().mockResolvedValue(mockOrderResponse),
            findUserOrders: jest.fn().mockResolvedValue(mockPaginatedResponse),
            updateStatus: jest.fn().mockResolvedValue(mockOrderResponse),
          },
        },
        {
          provide: 'UserRepository',
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              id: 1,
              name: 'Admin User',
              email: 'admin@example.com',
              role: 'admin',
              isActive: true,
            }),
          },
        },
        {
          provide: AdminGuard,
          useClass: MockJwtGuard,
        },
      ],
    })
      .overrideGuard(JWTAccessGuard)
      .useClass(MockJwtGuard)
      .overrideGuard(AdminGuard)
      .useClass(MockJwtGuard)
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get(OrdersService) as jest.Mocked<OrdersService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new order', async () => {
      const createOrderDto: CreateOrderDto = {
        movieScheduleId: 1,
        seatIds: [1],
        paymentMethod: PaymentMethod.DEBIT,
      };

      const result = await controller.create(createOrderDto, mockUser);

      expect(result).toEqual(mockOrderResponse);
      expect(service.create).toHaveBeenCalledWith(createOrderDto, mockUser.id);
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const query: OrderQueryDto = {
        page: 1,
        limit: 10,
        includeDeleted: false,
      };

      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      // Mock the implementation of findOne to return an order with userId matching the mockUser
      service.findOne.mockResolvedValueOnce({
        ...mockOrderResponse,
        userId: mockUser.id,
      });

      const result = await controller.findOne({ id: 1 }, mockUser);

      expect(result).toEqual({ ...mockOrderResponse, userId: mockUser.id });
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('getMyOrders', () => {
    it('should return orders for the current user', async () => {
      const query: OrderQueryDto = {
        page: 1,
        limit: 10,
        includeDeleted: false,
      };

      const result = await controller.getMyOrders(query, mockUser);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findUserOrders).toHaveBeenCalledWith(mockUser.id, query);
    });
  });

  describe('updateStatus', () => {
    it('should update the order status', async () => {
      const updateStatusDto: UpdateOrderStatusDto = {
        status: OrderStatus.PAID,
      };

      const result = await controller.updateStatus({ id: 1 }, updateStatusDto);

      expect(result).toEqual(mockOrderResponse);
      expect(service.updateStatus).toHaveBeenCalledWith(1, updateStatusDto);
    });
  });
});
