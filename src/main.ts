import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { APP_CONFIG } from './common/config/app.config';
import { SECURITY_CONFIG } from './common/config/security.config';
import { AppConfig, SecurityConfig } from './common/types/env.type';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  const appConfig = configService.get<AppConfig>(APP_CONFIG);
  const port = appConfig!.port;
  const prefix = appConfig!.apiPrefix;

  // Cors configuration
  const corsConfig = configService.get<SecurityConfig['cors']>(
    `${SECURITY_CONFIG}.cors`,
  );

  if (corsConfig) {
    app.enableCors({
      origin: corsConfig.origins,
      methods: corsConfig.methods,
      allowedHeaders: corsConfig.allowedHeaders,
    });
  }

  // Helmet configuration
  const helmetConfig = configService.get<SecurityConfig['helmet']>(
    `${SECURITY_CONFIG}.helmet`,
  );

  if (helmetConfig) {
    app.use(
      helmet({
        contentSecurityPolicy: helmetConfig.contentSecurityPolicy,
        hidePoweredBy: helmetConfig.hidePoweredBy,
        xssFilter: helmetConfig.xssFilter,
      }),
    );
  }

  app.setGlobalPrefix(prefix);

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription(
      'The API documentation for the application - All time is on utc',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
}
bootstrap();
