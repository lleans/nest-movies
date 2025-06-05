import { registerAs } from '@nestjs/config';
import { RedisConfig } from '../types/env.type';

export const REDIS_CONFIG = 'REDIS_CONFIG';

export default registerAs(
  REDIS_CONFIG,
  (): RedisConfig => ({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  }),
);
