import { z } from 'zod';

export const tagQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'usageCount', 'createdAt']).default('usageCount'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  includeDeleted: z.coerce.boolean().default(false),
});

export type TagQueryDto = z.infer<typeof tagQuerySchema>;
