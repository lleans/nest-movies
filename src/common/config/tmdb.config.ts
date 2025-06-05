import { registerAs } from '@nestjs/config';
import { TmdbConfig } from '../types/env.type';

export const TMDB_CONFIG = 'TMDB_CONFIG';

export default registerAs<TmdbConfig>(TMDB_CONFIG, () => ({
  apiKey: process.env.TMDB_API_KEY || '',
  apiUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
  imageUrl: process.env.TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p/original',
  timeout: parseInt(process.env.TMDB_TIMEOUT || '5000', 10), // Default to 5000ms
  language: process.env.TMDB_LANGUAGE || 'en-US',
}));
