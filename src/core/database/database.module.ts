import { DATABASE_CONFIG } from '@app/common/config/database.config';
import { DatabaseConfig } from '@app/common/types/env.type';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const dbConfig = config.get<DatabaseConfig>(DATABASE_CONFIG)!;
        return {
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: ['dist/**/*.entity.js'],
          autoLoadEntities: true,
          synchronize: dbConfig.synchronize,
          timezone: 'Z',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
