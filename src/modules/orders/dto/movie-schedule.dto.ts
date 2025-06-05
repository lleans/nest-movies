import { z } from 'zod';

// Zod schemas for validation
export const createMovieScheduleSchema = z.object({
  movieId: z.number().int().positive('Movie ID must be a positive integer'),
  studioId: z.number().int().positive('Studio ID must be a positive integer'),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  price: z
    .number()
    .positive('Price must be positive')
    .multipleOf(0.01, 'Price must have at most 2 decimal places'),
  date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
});

export const updateMovieScheduleSchema = createMovieScheduleSchema.partial();

export const movieScheduleQuerySchema = z.object({
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
  movieId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, { message: 'Movie ID must be positive' }),
  studioId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, {
      message: 'Studio ID must be positive',
    }),
  date: z
    .string()
    .optional()
    .refine((date) => !date || !isNaN(Date.parse(date)), 'Invalid date format'),
  startDate: z
    .string()
    .optional()
    .refine(
      (date) => !date || !isNaN(Date.parse(date)),
      'Invalid start date format',
    ),
  endDate: z
    .string()
    .optional()
    .refine(
      (date) => !date || !isNaN(Date.parse(date)),
      'Invalid end date format',
    ),
  includeExpired: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default('false'),
});

export const getAvailableSeatsParamsSchema = z.object({
  scheduleId: z.string().transform((val) => parseInt(val, 10)),
});

// Type definitions
export type CreateMovieScheduleDto = z.infer<typeof createMovieScheduleSchema>;
export type UpdateMovieScheduleDto = z.infer<typeof updateMovieScheduleSchema>;
export type MovieScheduleQueryDto = z.infer<typeof movieScheduleQuerySchema>;
export type GetAvailableSeatsParamsDto = z.infer<
  typeof getAvailableSeatsParamsSchema
>;

// Response interfaces
export interface MovieScheduleResponseDto {
  id: number;
  movieId: number;
  studioId: number;
  startTime: string;
  endTime: string;
  price: number;
  date: string;
  bookedSeats: number;
  availableSeats: number;
  movie: {
    id: number;
    title: string;
    poster: string;
    rating?: number;
  };
  studio: {
    id: number;
    studioNumber: number;
    seatCapacity: number;
    hasImax: boolean;
    has3D: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AvailableSeatsResponseDto {
  scheduleId: number;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  seats: SeatWithAvailabilityDto[];
}

export interface SeatWithAvailabilityDto {
  id: number;
  rowLabel: string;
  seatNumber: number;
  isAvailable: boolean;
}
