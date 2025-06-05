import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nest_movies',
  // Entities for migration generation - use glob pattern to avoid circular imports
  entities: ['src/**/*.entity.{ts,js}'],

  // Migration configuration
  migrations: ['database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  migrationsRun: false, // Always manual

  // Development only
  synchronize: false, // NEVER true in production
  logging:
    process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],

  // MySQL settings
  charset: 'utf8mb4',
  timezone: 'Z', // Use UTC timezone
});

export default AppDataSource;
