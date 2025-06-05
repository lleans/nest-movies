import { registerAs } from '@nestjs/config';
import { AuthConfig } from '../types/env.type';

export const AUTH_CONFIG = 'AUTH_CONFIG';

export default registerAs<AuthConfig>(AUTH_CONFIG, () => ({
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION_TIME || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION_TIME || '7d',
  },
  argon2: {
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10),
    timeCost: parseInt(process.env.ARGON2_TIME_COST || '4', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
  },
}));
