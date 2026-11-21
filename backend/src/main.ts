import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
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

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());

  // CORS Configuration supporting HttpOnly cookie credentials
  const allowedOrigins =
    corsOrigin === '*'
      ? true
      : corsOrigin.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global Prefix (excluding /health and root / so they are available directly)
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', ''],
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
    .setVersion('1.1.0')
    .addTag('Health', 'Health checks and database connectivity monitoring')
    .addTag('Auth', 'Authentication, HttpOnly session cookies, and registration')
    .addTag('Events', 'Event discovery, pagination, and organizer event management')
    .addTag('Tickets', 'Ticket tier CRUD, digital passes, and atomic gate check-in')
    .addTag('Orders', 'Atomic inventory reservation, order tracking, and cancellation')
    .addTag('Payments', 'Idempotent payment processing and webhook handling')
    .addTag('Organizer', 'Organizer dashboard analytics, attendees, and scanner assignment')
    .addTag('Admin', 'Administrator platform monitoring and user management')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT Bearer token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`Server running at http://localhost:${port}`);
  logger.log(`Health check at http://localhost:${port}/health`);
  logger.log(`Swagger documentation at http://localhost:${port}/api/docs`);
}

bootstrap();
