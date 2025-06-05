import { z } from 'zod';

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).optional(),
  recover: z.coerce.boolean().default(false),
});

export type UpdateTagDto = z.infer<typeof updateTagSchema>;
