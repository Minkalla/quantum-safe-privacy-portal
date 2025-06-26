// src/portal/portal-backend/src/main.ts
/**
 * @file main.ts
 * @description The main entry point for the NestJS Quantum-Safe Privacy Portal Backend application.
 * This file bootstraps the NestJS application, sets up global configurations,
 * and starts the HTTP server. It replaces the previous index.ts and server.ts for application startup.
 *
 * @module NestJSBootstrap
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This file is crucial for initializing the NestJS application context. It will configure
 * global pipes, guards, interceptors, and apply global middleware as needed.
 * It adheres to the "no regrets" approach by providing a robust and scalable foundation.
 *
 * Updates for Debugging (June 23, 2025):
 * - Added early `process.on` handlers for `uncaughtException` and `unhandledRejection` to capture critical errors.
 * - Introduced explicit `console.log` statements at key bootstrap stages to trace execution flow and identify silent crashes.
 * - Temporarily enabled `logger: ['error', 'warn', 'log']` for NestFactory to ensure basic logging is active.
 * - Explicitly logging critical environment variables at startup.
 * - Fixed `ts(4111)` errors by switching to bracket notation for `process.env` access.
 * - **FIXED `ts(6133)` error by explicitly ignoring the `promise` parameter in unhandledRejection handler.**
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as hpp from 'hpp';
import { Logger as WinstonLogger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { AppConfigService } from './config/config.service';
import * as path from 'path';

import * as AWSXRay from 'aws-xray-sdk';
import * as http from 'http';
import * as https from 'https';

// --- START DEBUGGING ADDITIONS ---
// Capture early unhandled exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception at Startup:', err);
  process.exit(1);
});

// Fixed ts(6133) by explicitly ignoring the 'promise' parameter
process.on('unhandledRejection', (reason, _promise) => { // CHANGED: Renamed 'promise' to '_promise'
  console.error('🔥 Unhandled Rejection at Startup:', reason);
  // You can optionally log the promise object if needed for more context, e.g.:
  // console.error('  Promise object:', _promise);
  process.exit(1);
});

console.log('🚀 Application bootstrap started');
console.log('📍 NODE_ENV:', process.env['NODE_ENV']);
console.log('📍 Configuration loaded successfully');
// --- END DEBUGGING ADDITIONS ---

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

async function bootstrap() {
  console.log('✅ Entering NestFactory.create...');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Temporarily explicitly enable basic NestJS console logging
  });
  console.log('✅ NestJS app created successfully');

  const winstonLogger = app.get<WinstonLogger>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(winstonLogger);
  console.log('✅ Winston logger applied to NestJS app');

  const configService = app.get(AppConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const port = configService.get<number>('PORT') || 3000;
  const enableSwaggerDocs = configService.get<boolean>('ENABLE_SWAGGER_DOCS') || false;
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  const appVersion = configService.get<string>('APP_VERSION') || '0.1.0';

  console.log('✅ ConfigService values fetched. Node_ENV:', nodeEnv, 'Port:', port);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: nodeEnv === 'production',
    exceptionFactory: (errors) => {
      const errorMessages: string[] = [];

      const processError = (error: any, parentPath = '') => {
        if (error.constraints) {
          const constraintMessages = Object.values(error.constraints);
          if (constraintMessages.length > 0) {
            errorMessages.push(constraintMessages[0] as string);
          }
        }

        if (error.children && error.children.length > 0) {
          error.children.forEach((child: any) => {
            const childPath = parentPath ? `${parentPath}.${error.property}` : error.property;
            processError(child, childPath);
          });
        }
      };

      errors.forEach(error => processError(error));

      return new BadRequestException({
        statusCode: 400,
        message: errorMessages.length === 1 ? errorMessages[0] : errorMessages,
        error: 'Bad Request',
      });
    },
  }));
  console.log('✅ Global ValidationPipe applied');

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  console.log('✅ Express JSON and CookieParser middleware applied');

  let corsOrigins: (string | RegExp)[];
  if (nodeEnv === 'test') {
    corsOrigins = ['*'];
  } else if (nodeEnv === 'production') {
    corsOrigins = ['https://frontend.minkalla.com', 'https://app.minkalla.com'];
  } else {
    corsOrigins = [frontendUrl, 'http://localhost:3000'];
  }

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
  });
  console.log('✅ CORS configured');

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    dnsPrefetchControl: { allow: true },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: false,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
  }));
  console.log('✅ Helmet middleware applied');

  app.use(hpp());
  console.log('✅ HPP middleware applied');

  app.use(AWSXRay.express.openSegment('MinkallaBackend'));
  console.log('✅ X-Ray Express middleware applied (openSegment)');

  app.setGlobalPrefix('portal');
  console.log('✅ Global prefix set to /portal');

  if (nodeEnv === 'test') {
    const testStaticPath = path.join(__dirname, '..', 'test', 'e2e');
    app.use('/test/e2e', express.static(testStaticPath));
    console.log('✅ Static file serving configured for E2E tests at /test/e2e');
    console.log('📁 Serving files from:', testStaticPath);
  }

  if (enableSwaggerDocs || nodeEnv === 'development') {
    const options = new DocumentBuilder()
      .setTitle('Minkalla Quantum-Safe Privacy Portal API')
      .setDescription('Secure, quantum-resistant backend services enabling compliant user consent and data rights management for the digital economy.')
      .setVersion(appVersion)
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Authentication via short-lived Access Token' },
        'bearerAuth',
      )
      .addApiKey(
        { type: 'apiKey', in: 'cookie', name: 'refreshToken', description: 'Authentication via long-lived Refresh Token (HTTP-only cookie)' },
        'cookieAuth',
      )
      .addTag('Authentication', 'APIs for user registration, login, and authentication management.')
      .build();

    const document = SwaggerModule.createDocument(app, options);

    SwaggerModule.setup('api-docs', app, document, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    winstonLogger.log('info', 'API documentation available at /api-docs (without global prefix)');
    console.log('✅ Swagger/API docs configured');
  }

  winstonLogger.log('info', 'Global prefix set to /portal. API routes now accessible at /portal/*');

  app.use(AWSXRay.express.closeSegment());
  console.log('✅ X-Ray Express middleware applied (closeSegment)');

  await app.listen(port);
  console.log('✅ NestJS app listening on port', port);
  winstonLogger.log('info', `Server running on port ${port}`);
}

bootstrap().catch((error) => {
  // Use Winston logger if available, otherwise fallback to console.error
  // Ensure critical errors are logged even during early bootstrap failures.
  const loggerFromApp = (global as any)._NEST_APP_INSTANCE_?.get(WINSTON_MODULE_NEST_PROVIDER);
  if (loggerFromApp) {
    loggerFromApp.error('❌ Failed to start application (Winston fallback):', error);
  } else {
    // Fallback console.error should be enabled for critical early boot failures in CI.
    // This provides a safety net if Winston logger itself fails to initialize.
    console.error('❌ Failed to start application (Console fallback):', error);
  }
  process.exit(1);
});
