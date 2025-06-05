import { PaginationQuerySchema } from '@app/common/dto/pagination.dto';
import { z } from 'zod';

// Create Seat DTO
export const CreateSeatSchema = z.object({
  studioId: z.number().int().positive('Studio ID must be a positive integer'),
  rowLabel: z
    .string()
    .min(1)
    .max(10, 'Row label must not exceed 10 characters'),
  seatNumber: z
    .number()
    .int()
    .positive('Seat number must be a positive integer'),
});

export type CreateSeatDto = z.infer<typeof CreateSeatSchema>;

// Update Seat DTO
export const UpdateSeatSchema = z.object({
  studioId: z
    .number()
    .int()
    .positive('Studio ID must be a positive integer')
    .optional(),
  rowLabel: z
    .string()
    .min(1)
    .max(10, 'Row label must not exceed 10 characters')
    .optional(),
  seatNumber: z
    .number()
    .int()
    .positive('Seat number must be a positive integer')
    .optional(),
});

export type UpdateSeatDto = z.infer<typeof UpdateSeatSchema>;

// Bulk Create Seats DTO
export const BulkCreateSeatsSchema = z.object({
  studioId: z.number().int().positive('Studio ID must be a positive integer'),
  regenerate: z.boolean().optional().default(false),
  options: z
    .object({
      rowPattern: z.string().optional(),
      seatsPerRow: z.number().int().positive().optional(),
      maxRowSize: z.number().int().positive().optional(),
      startSeatNumber: z.number().int().min(0).optional(),
      customRowSizes: z
        .record(z.string(), z.number().int().positive())
        .optional(),
    })
    .optional(),
});

export type BulkCreateSeatsDto = z.infer<typeof BulkCreateSeatsSchema>;

// Get Seats Query DTO (extends pagination)
export const GetSeatsQuerySchema = PaginationQuerySchema.extend({
  includeDeleted: z.coerce.boolean().optional().default(false),
});

export type GetSeatsQueryDto = z.infer<typeof GetSeatsQuerySchema>;

// Seat Response DTO
export interface SeatResponseDto {
  id: number;
  studioId: number;
  rowLabel: string;
  seatNumber: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
