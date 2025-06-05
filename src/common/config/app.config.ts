import { registerAs } from '@nestjs/config';
import { AppConfig } from '../types/env.type';

export const APP_CONFIG = 'APP_CONFIG';

export default registerAs<AppConfig>(APP_CONFIG, () => ({
  name: process.env.APP_NAME || 'Nest Movies',
  env:
    (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
    'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
}));
