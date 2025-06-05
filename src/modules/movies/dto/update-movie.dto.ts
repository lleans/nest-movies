import { z } from 'zod';

export const updateMovieSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  overview: z.string().min(1).optional(),
  poster: z.string().url().optional(),
  playUntil: z.string().datetime().optional(),
  tmdbId: z.number().optional(),
  rating: z.number().min(0).max(10).optional(),
  searchKeywords: z.string().max(255).optional(),
  tagIds: z.array(z.number()).optional(),
  recover: z.coerce.boolean().default(false),
});

export type UpdateMovieDto = z.infer<typeof updateMovieSchema>;
