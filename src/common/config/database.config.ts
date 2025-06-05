import { registerAs } from '@nestjs/config';
import { DatabaseConfig } from '../types/env.type';

export const DATABASE_CONFIG = 'DATABASE_CONFIG';

export default registerAs<DatabaseConfig>(DATABASE_CONFIG, () => ({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  synchronize: process.env.NODE_ENV === 'development',
}));
