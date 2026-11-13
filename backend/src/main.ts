import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4000);
  const corsOrigin = configService.get<string>('corsOrigin', '*');
  const apiPrefix = configService.get<string>('apiPrefix', 'api/v1');

  // CORS Configuration
  const allowedOrigins =
    corsOrigin === '*'
      ? '*'
      : corsOrigin.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: corsOrigin !== '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global Prefix (excluding /health so it is available directly at /health)
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filters (order: AllExceptionsFilter first, then HttpExceptionFilter)
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Universal E-Ticket API')
    .setDescription(
      'REST API documentation for the Universal E-Ticketing Platform backend',
    )
    .setVersion('1.0.0')
    .addTag('Health', 'Health checks and database connectivity monitoring')
    .addTag('Events', 'Event management endpoints')
    .addTag('Tickets', 'Ticket tier and validation endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`Server running at http://localhost:${port}`);
  logger.log(`Health check at http://localhost:${port}/health`);
  logger.log(`Swagger documentation at http://localhost:${port}/api/docs`);
}

bootstrap();
