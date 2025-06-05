import appConfig from '@app/common/config/app.config';
import authConfig from '@app/common/config/auth.config';
import databaseConfig from '@app/common/config/database.config';
import redisConfig from '@app/common/config/redis.config';
import securityConfig from '@app/common/config/security.config';
import minioConfig from '@app/common/config/storage.config';
import tmdbConfig from '@app/common/config/tmdb.config';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StorageModule } from './storage/storage.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        tmdbConfig,
        minioConfig,
        redisConfig,
        securityConfig,
      ],
      cache: true,
      expandVariables: true,
    }),
    DatabaseModule,
    QueueModule,
    SchedulerModule,
    StorageModule,
  ],
  providers: [ConfigService],
})
export class CoreModule {}
