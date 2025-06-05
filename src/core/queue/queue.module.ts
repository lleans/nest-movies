import { REDIS_CONFIG } from '@app/common/config/redis.config';
import { RedisConfig } from '@app/common/types/env.type';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(REDIS_CONFIG)!;
        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
