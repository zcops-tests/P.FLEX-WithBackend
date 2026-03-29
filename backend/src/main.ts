import { NestFactory } from '@nestjs/core';
import {
  Logger as NestLogger,
  VersioningType,
  ValidationPipe,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import helmet from 'helmet';
import express from 'express';

async function bootstrap() {
  const logger = new NestLogger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();

  // Security Hardening
  app.use(helmet());

  const requestBodyLimitMb = Number(process.env.REQUEST_BODY_LIMIT_MB || 25);
  const requestBodyLimit = `${requestBodyLimitMb}mb`;
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ limit: requestBodyLimit, extended: true }));

  // Use pino-logger
  app.useLogger(app.get(Logger));

  // Global Prefix
  app.setGlobalPrefix('api');

  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('P.FLEX-SYSTEM API')
    .setDescription('Backend API for P.FLEX-SYSTEM ERP/Production Management')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs available on: http://localhost:${port}/docs`);
  logger.log(`Request body limit: ${requestBodyLimit}`);
}
bootstrap();
