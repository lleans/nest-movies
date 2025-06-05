import { z } from 'zod';

// Pagination query schema
export const PaginationQuerySchema = z.object({
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
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('ASC'),
});

export type PaginationQueryDto = z.infer<typeof PaginationQuerySchema>;

// Pagination metadata interface
export interface PaginationMetadata {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  metadata: PaginationMetadata;
}

// Helper function to create pagination metadata
export function createPaginationMetadata(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMetadata {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    currentPage: page,
    itemsPerPage: limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

// Helper function to create paginated response
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number,
): PaginatedResponse<T> {
  return {
    data,
    metadata: createPaginationMetadata(page, limit, totalItems),
  };
}
