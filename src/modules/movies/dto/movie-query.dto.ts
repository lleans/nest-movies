import { z } from 'zod';

export const movieQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  tagIds: z.array(z.number()).optional(),
  rating: z.number().min(0).max(10).optional(),
  sortBy: z
    .enum(['title', 'rating', 'createdAt', 'playUntil'])
    .default('createdAt'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  includeExpired: z.coerce.boolean().default(false),
  includeDeleted: z.coerce.boolean().default(false),
});

export type MovieQueryDto = z.infer<typeof movieQuerySchema>;
