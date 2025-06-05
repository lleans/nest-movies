import { GetCurrentUser } from '@app/common/decorator/current-user.decorator';
import {
  CommonErrorSchemas,
  OrderErrorSchemas,
} from '@app/common/dto/error-response.dto';
import { PaginatedResponse } from '@app/common/dto/pagination.dto';
import { ZodValidationPipe } from '@app/common/pipes/zod-validation/zod-validation.pipe';
import { AdminGuard } from '@app/modules/auth/guards/admin.guard';
import { JWTAccessGuard } from '@app/modules/auth/guards/jwt-access.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
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
  CreateOrderDto,
  OrderParamsDto,
  OrderQueryDto,
  OrderResponseDto,
  UpdateOrderStatusDto,
  createOrderSchema,
  orderParamsSchema,
  orderQuerySchema,
  updateOrderStatusSchema,
} from '../dto/order.dto';
import { OrdersService } from '../services/orders.service';

@ApiTags('Orders')
@Controller('orders')
@JWTAccessGuard
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
  @Post()
  @ApiOperation({
    summary: 'Create a new order (book tickets)',
    description:
      'Create a new order for movie tickets. Requires authentication. Automatically reserves selected seats and creates an order with expiry time.',
  })
  @ApiBody({
    description: 'Order creation data',
    schema: {
      type: 'object',
      required: ['movieScheduleId', 'seatIds', 'paymentMethod'],
      properties: {
        movieScheduleId: {
          type: 'number',
          description: 'ID of the movie schedule',
          example: 1,
          minimum: 1,
        },
        seatIds: {
          type: 'array',
          description: 'Array of seat IDs to book',
          items: { type: 'number', minimum: 1 },
          minItems: 1,
          example: [1, 2, 3],
        },
        paymentMethod: {
          type: 'string',
          enum: ['CASH', 'CREDIT', 'DEBIT'],
          description: 'Payment method for the order',
          example: 'CREDIT',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Order created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            userId: { type: 'number', example: 1 },
            orderNumber: { type: 'string', example: 'ORD-20231201-001' },
            paymentMethod: { type: 'string', example: 'CREDIT_CARD' },
            totalItemPrice: { type: 'number', example: 150000 },
            status: { type: 'string', example: 'PENDING' },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:15:00Z',
            },
            orderItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  movieScheduleId: { type: 'number', example: 1 },
                  qty: { type: 'number', example: 3 },
                  price: { type: 'number', example: 50000 },
                  subTotalPrice: { type: 'number', example: 150000 },
                  snapshots: {
                    type: 'object',
                    properties: {
                      movieTitle: { type: 'string', example: 'The Matrix' },
                      moviePoster: {
                        type: 'string',
                        example: 'https://example.com/poster.jpg',
                      },
                      studioNumber: { type: 'number', example: 1 },
                      startTime: { type: 'string', example: '19:00' },
                      endTime: { type: 'string', example: '21:30' },
                      date: { type: 'string', example: '2023-12-01' },
                      priceAtPurchase: { type: 'number', example: 50000 },
                    },
                  },
                  seatReservations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number', example: 1 },
                        seatId: { type: 'number', example: 1 },
                        status: { type: 'string', example: 'RESERVED' },
                        seat: {
                          type: 'object',
                          properties: {
                            id: { type: 'number', example: 1 },
                            rowLabel: { type: 'string', example: 'A' },
                            seatNumber: { type: 'number', example: 1 },
                          },
                        },
                      },
                    },
                  },
                },
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
    description: 'Bad Request - Validation errors or seat not available',
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
    schema: OrderErrorSchemas.ScheduleNotFound,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Seats no longer available',
    schema: OrderErrorSchemas.SeatNotAvailable,
  })
  @ApiResponse({
    status: 422,
    description: 'Cannot book tickets for past schedule',
    schema: OrderErrorSchemas.ScheduleExpired,
  })
  async create(
    @Body(new ZodValidationPipe(createOrderSchema))
    createOrderDto: CreateOrderDto,
    @GetCurrentUser() user: any,
  ): Promise<OrderResponseDto> {
    return this.ordersService.create(createOrderDto, user.id);
  }
  @Get('my-orders')
  @ApiOperation({
    summary: 'Get current user orders',
    description:
      'Retrieve paginated list of orders for the authenticated user. Supports filtering by status, payment method, and search.',
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
    name: 'status',
    required: false,
    enum: ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'],
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    enum: ['CASH', 'CREDIT', 'DEBIT'],
    description: 'Filter by payment method',
  })
  @ApiQuery({
    name: 'orderNumber',
    required: false,
    type: String,
    description: 'Search by order number',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user orders retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Orders retrieved successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              orderNumber: { type: 'string', example: 'ORD-20231201-001' },
              paymentMethod: { type: 'string', example: 'CREDIT_CARD' },
              totalItemPrice: { type: 'number', example: 150000 },
              status: { type: 'string', example: 'PAID' },
              expiresAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-12-01T10:15:00Z',
              },
              paidAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-12-01T10:05:00Z',
                nullable: true,
              },
              orderItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    snapshots: {
                      type: 'object',
                      properties: {
                        movieTitle: { type: 'string', example: 'The Matrix' },
                        moviePoster: {
                          type: 'string',
                          example: 'https://example.com/poster.jpg',
                        },
                        studioNumber: { type: 'number', example: 1 },
                        startTime: { type: 'string', example: '19:00' },
                        endTime: { type: 'string', example: '21:30' },
                        date: { type: 'string', example: '2023-12-01' },
                      },
                    },
                  },
                },
              },
              createdAt: {
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
            totalItems: { type: 'number', example: 25 },
            currentPage: { type: 'number', example: 1 },
            itemsPerPage: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 },
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
  async getMyOrders(
    @Query(new ZodValidationPipe(orderQuerySchema)) query: OrderQueryDto,
    @GetCurrentUser() user: any,
  ): Promise<PaginatedResponse<OrderResponseDto>> {
    return this.ordersService.findUserOrders(user.id, query);
  }
  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get all orders (Admin only)',
    description:
      'Retrieve paginated list of all orders. Only accessible by administrators. Supports filtering and search capabilities.',
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
    name: 'status',
    required: false,
    enum: ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'],
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: Number,
    description: 'Filter by user ID',
    example: 1,
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET'],
    description: 'Filter by payment method',
  })
  @ApiQuery({
    name: 'orderNumber',
    required: false,
    type: String,
    description: 'Search by order number',
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Include soft-deleted orders (default: false)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all orders retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Orders retrieved successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              userId: { type: 'number', example: 1 },
              orderNumber: { type: 'string', example: 'ORD-20231201-001' },
              paymentMethod: { type: 'string', example: 'CREDIT_CARD' },
              totalItemPrice: { type: 'number', example: 150000 },
              status: { type: 'string', example: 'PAID' },
              expiresAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-12-01T10:15:00Z',
              },
              paidAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-12-01T10:05:00Z',
                nullable: true,
              },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  name: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', example: 'john@example.com' },
                },
              },
              orderItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    snapshots: {
                      type: 'object',
                      properties: {
                        movieTitle: { type: 'string', example: 'The Matrix' },
                        studioNumber: { type: 'number', example: 1 },
                        date: { type: 'string', example: '2023-12-01' },
                      },
                    },
                  },
                },
              },
              createdAt: {
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
            totalItems: { type: 'number', example: 100 },
            currentPage: { type: 'number', example: 1 },
            itemsPerPage: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 },
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    schema: CommonErrorSchemas.Forbidden,
  })
  async findAll(
    @Query(new ZodValidationPipe(orderQuerySchema)) query: OrderQueryDto,
  ): Promise<PaginatedResponse<OrderResponseDto>> {
    return this.ordersService.findAll(query);
  }
  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description:
      'Retrieve detailed information about a specific order. Users can only view their own orders, admins can view any order.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Order ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Order retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            userId: { type: 'number', example: 1 },
            orderNumber: { type: 'string', example: 'ORD-20231201-001' },
            paymentMethod: { type: 'string', example: 'CREDIT_CARD' },
            totalItemPrice: { type: 'number', example: 150000 },
            status: { type: 'string', example: 'PAID' },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:15:00Z',
            },
            paidAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:05:00Z',
              nullable: true,
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', example: 'john@example.com' },
              },
            },
            orderItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  orderId: { type: 'number', example: 1 },
                  movieScheduleId: { type: 'number', example: 1 },
                  qty: { type: 'number', example: 3 },
                  price: { type: 'number', example: 50000 },
                  subTotalPrice: { type: 'number', example: 150000 },
                  snapshots: {
                    type: 'object',
                    properties: {
                      movieTitle: { type: 'string', example: 'The Matrix' },
                      moviePoster: {
                        type: 'string',
                        example: 'https://example.com/poster.jpg',
                      },
                      studioNumber: { type: 'number', example: 1 },
                      startTime: { type: 'string', example: '19:00' },
                      endTime: { type: 'string', example: '21:30' },
                      date: { type: 'string', example: '2023-12-01' },
                      priceAtPurchase: { type: 'number', example: 50000 },
                    },
                  },
                  seatReservations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number', example: 1 },
                        seatId: { type: 'number', example: 1 },
                        status: { type: 'string', example: 'RESERVED' },
                        seat: {
                          type: 'object',
                          properties: {
                            id: { type: 'number', example: 1 },
                            rowLabel: { type: 'string', example: 'A' },
                            seatNumber: { type: 'number', example: 1 },
                          },
                        },
                      },
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
    description: 'Bad Request - Invalid order ID',
    schema: CommonErrorSchemas.ValidationError,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only view own orders',
    schema: OrderErrorSchemas.OrderUnauthorized,
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
    schema: OrderErrorSchemas.OrderNotFound,
  })
  async findOne(
    @Param(new ZodValidationPipe(orderParamsSchema)) params: OrderParamsDto,
    @GetCurrentUser() user: any,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.findOne(params.id);

    // Users can only see their own orders, admins can see all
    if (!user.isAdmin && order.userId !== user.id) {
      throw new UnauthorizedException('You can only view your own orders');
    }

    return order;
  }
  @Patch(':id/status')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Update order status (Admin only)',
    description:
      'Update the status of an order. Only accessible by administrators. Supports status transitions like PENDING to PAID or CANCELLED.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Order ID',
    example: 1,
  })
  @ApiBody({
    description: 'Order status update data',
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'],
          description: 'New order status',
          example: 'PAID',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Order status updated successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            userId: { type: 'number', example: 1 },
            orderNumber: { type: 'string', example: 'ORD-20231201-001' },
            paymentMethod: { type: 'string', example: 'CREDIT_CARD' },
            totalItemPrice: { type: 'number', example: 150000 },
            status: { type: 'string', example: 'PAID' },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:15:00Z',
            },
            paidAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:05:00Z',
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', example: 'john@example.com' },
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
    description: 'Bad Request - Invalid status or transition',
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
    description: 'Order not found',
    schema: OrderErrorSchemas.OrderNotFound,
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid order status transition',
    schema: OrderErrorSchemas.InvalidOrderStatus,
  })
  async updateStatus(
    @Param(new ZodValidationPipe(orderParamsSchema)) params: OrderParamsDto,
    @Body(new ZodValidationPipe(updateOrderStatusSchema))
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateStatus(params.id, updateOrderStatusDto);
  }
}
