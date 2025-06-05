import { z } from 'zod';
import { SeatStatus } from '../entities/order-item.entity';
import { OrderStatus, PaymentMethod } from '../entities/orders.entity';

// Zod schemas
export const createOrderSchema = z.object({
  movieScheduleId: z
    .number()
    .int()
    .positive('Movie schedule ID must be a positive integer'),
  seatIds: z
    .array(z.number().int().positive('Seat ID must be a positive integer'))
    .min(1, 'At least one seat must be selected'),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export const orderQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: 'Page must be greater than 0' }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, {
      message: 'Limit must be between 1 and 100',
    }),
  status: z.nativeEnum(OrderStatus).optional(),
  userId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, { message: 'User ID must be positive' }),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  orderNumber: z.string().optional(),
  includeDeleted: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default('false'),
});

export const orderParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)),
});

// Type definitions
export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
export type OrderQueryDto = z.infer<typeof orderQuerySchema>;
export type OrderParamsDto = z.infer<typeof orderParamsSchema>;

// Response interfaces
export interface OrderResponseDto {
  id: number;
  userId: number;
  orderNumber: string;
  paymentMethod: PaymentMethod;
  totalItemPrice: number;
  status: OrderStatus;
  expiresAt: string;
  paidAt?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  orderItems: OrderItemResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemResponseDto {
  id: number;
  orderId: number;
  movieScheduleId: number;
  qty: number;
  price: number;
  subTotalPrice: number;
  seatId: number;
  status: SeatStatus;
  snapshots: {
    movieTitle: string;
    moviePoster: string;
    studioNumber: number;
    startTime: string;
    endTime: string;
    date: string;
    priceAtPurchase: number;
    seatLabel?: string;
  };
  seat?: {
    id: number;
    rowLabel: string;
    seatNumber: number;
  };
  createdAt: string;
  updatedAt: string;
}
