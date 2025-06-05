import { PaginationQuerySchema } from '@app/common/dto/pagination.dto';
import { z } from 'zod';

// Create Studio DTO
export const CreateStudioSchema = z.object({
  studioNumber: z
    .number()
    .int()
    .min(1, 'Studio number must be at least 1')
    .max(999, 'Studio number must not exceed 999'),
  seatCapacity: z
    .number()
    .int()
    .min(10, 'Seat capacity must be at least 10')
    .max(1000, 'Seat capacity must not exceed 1000'),
  hasImax: z.coerce.boolean().optional().default(false),
  has3D: z.coerce.boolean().optional().default(false),
  isActive: z.coerce.boolean().optional().default(true),
});

export type CreateStudioDto = z.infer<typeof CreateStudioSchema>;

// Update Studio DTO
export const UpdateStudioSchema = z.object({
  studioNumber: z
    .number()
    .int()
    .min(1, 'Studio number must be at least 1')
    .max(999, 'Studio number must not exceed 999')
    .optional(),
  seatCapacity: z
    .number()
    .int()
    .min(10, 'Seat capacity must be at least 10')
    .max(1000, 'Seat capacity must not exceed 1000')
    .optional(),
  hasImax: z.coerce.boolean().optional(),
  has3D: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  recover: z.coerce.boolean().optional().default(false),
});

export type UpdateStudioDto = z.infer<typeof UpdateStudioSchema>;

// Studio Response DTO
export interface StudioResponseDto {
  id: number;
  studioNumber: number;
  seatCapacity: number;
  hasImax: boolean;
  has3D: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Get Studios Query DTO (extends pagination)
export const GetStudiosQuerySchema = PaginationQuerySchema.extend({
  // Use coercion with optional fields
  isActive: z.coerce.boolean().optional(),
  hasImax: z.coerce.boolean().optional(),
  has3D: z.coerce.boolean().optional(),
  minCapacity: z.coerce.number().int().optional(),
  maxCapacity: z.coerce.number().int().optional(),
  studioNumber: z.coerce.number().int().optional(),
  includeDeleted: z.coerce.boolean().optional(),
});

export type GetStudiosQueryDto = z.infer<typeof GetStudiosQuerySchema>;

// Response interfaces
export interface CreateStudioResponseDto {
  message: string;
  studio: StudioResponseDto;
}

export interface UpdateStudioResponseDto {
  message: string;
  studio: StudioResponseDto;
}

export interface DeleteStudioResponseDto {
  message: string;
}
