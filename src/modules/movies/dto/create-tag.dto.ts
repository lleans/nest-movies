import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).optional(),
});

export type CreateTagDto = z.infer<typeof createTagSchema>;
