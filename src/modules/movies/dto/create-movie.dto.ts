import { z } from 'zod';

export const createMovieSchema = z.object({
  title: z.string().min(1).max(255),
  overview: z.string().min(1),
  poster: z.string().url(),
  playUntil: z.string().datetime(),
  tmdbId: z.number().optional(),
  rating: z.number().min(0).max(10).optional(),
  searchKeywords: z.string().max(255).optional(),
  tagIds: z.array(z.number()).optional(),
});

export type CreateMovieDto = z.infer<typeof createMovieSchema>;
