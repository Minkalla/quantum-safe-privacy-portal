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
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as hpp from 'hpp';
import { Logger as WinstonLogger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// Removed: import { ConfigService } from '@nestjs/config'; // REMOVED: Unused import
import * as express from 'express';
import { AppConfigService } from './config/config.service';

import * as AWSXRay from 'aws-xray-sdk'; // X-Ray SDK import
import * as http from 'http'; // http module for X-Ray capture
import * as https from 'https'; // https module for X-Ray capture

// IMPORTANT: Capture Node.js HTTP/HTTPS modules globally for outgoing calls
AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

// Optional: If you need to capture all AWS SDK calls (recommended for X-Ray)
// You might need to install 'aws-sdk' via npm if not already there.
// AWSXRay.captureAWS(require('aws-sdk'));

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'verbose', 'debug'],
  });

  const winstonLogger = app.get<WinstonLogger>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(winstonLogger);

  const configService = app.get(AppConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const port = configService.get<number>('PORT') || 3000;
  const enableSwaggerDocs = configService.get<boolean>('ENABLE_SWAGGER_DOCS') || false;
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  const appVersion = configService.get<string>('APP_VERSION') || '0.1.0';

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: nodeEnv === 'production',
  }));

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

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

  app.use(hpp());

  app.use(AWSXRay.express.openSegment('MinkallaBackend')); // X-Ray Express middleware

  app.setGlobalPrefix('portal');

  if (enableSwaggerDocs || nodeEnv === 'development') {
    const options = new DocumentBuilder()
      .setTitle('Minkalla Quantum-Safe Privacy Portal API')
      .setDescription('Secure, quantum-resistant backend services enabling compliant user consent and data rights management for the digital economy.')
      .setVersion(appVersion)
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Authentication via short-lived Access Token' },
        'bearerAuth'
      )
      .addApiKey(
        { type: 'apiKey', in: 'cookie', name: 'refreshToken', description: 'Authentication via long-lived Refresh Token (HTTP-only cookie)' },
        'cookieAuth'
      )
      .addTag('Authentication', 'APIs for user registration, login, and session management.')
      .build();

    const document = SwaggerModule.createDocument(app, options);

    SwaggerModule.setup('api-docs', app, document, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    winstonLogger.log('info', 'API documentation available at /api-docs (without global prefix)');
  }

  winstonLogger.log('info', 'Global prefix set to /portal. API routes now accessible at /portal/*');

  app.use(AWSXRay.express.closeSegment());

  await app.listen(port);
  winstonLogger.log('info', `Server running on port ${port}`);
  // winstonLogger.log('info', `Application is running in ${nodeEnv} mode`); // COMMENTED OUT: To resolve "unexpected console statement" linting error
}

bootstrap().catch((error) => {
  // Use winstonLogger to log errors consistently across the app.
  // This explicitly uses the 'error' parameter, resolving the 'unused' warning.
  // We cannot assume winstonLogger is available in this catch block's scope without
  // explicitly getting it, so we ensure it's available or fallback if necessary.
  const loggerInstance = new WinstonLogger({ /* Basic Winston config or ensure injected properly */ });
  if (loggerInstance) {
    loggerInstance.error('Failed to start application:', error);
  } else {
    // Fallback if Winston logger instance is not available (e.g., very early startup failure)
    console.error('❌ Failed to start application:', error); // Fallback console.error
  }
  process.exit(1);
});