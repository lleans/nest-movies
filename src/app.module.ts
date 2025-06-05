import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
import { SECURITY_CONFIG } from './common/config/security.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response/response.interceptor';
import { SecurityConfig } from './common/types/env.type';
import { CoreModule } from './core/core.module';
import { ModulesModule } from './modules/modules.module';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const rateLimitConfig = configService.get<SecurityConfig['rateLimit']>(
          `${SECURITY_CONFIG}.rateLimit`,
        )!;

        return {
          throttlers: [
            {
              ttl: rateLimitConfig.ttl,
              limit: rateLimitConfig.limit,
              blockDuration: rateLimitConfig.duration,
            },
          ],
          errorMessage: "You've reached the maximum number of requests.",
        };
      },
    }),
    CommonModule,
    CoreModule,
    ModulesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
