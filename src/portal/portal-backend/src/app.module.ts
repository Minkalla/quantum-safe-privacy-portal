// src/portal/portal-backend/src/app.module.ts
/**
 * @file app.module.ts
 * @description The root module for the NestJS Quantum-Safe Privacy Portal Backend application.
 * This module imports and orchestrates all other feature modules, configuration, and global services.
 *
 * @module AppModule
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This module is crucial for defining the overall structure of the NestJS application.
 * It integrates configuration, database connectivity, and logging, adhering to the
 * "no regrets" modular design.
 */

import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
// Removed direct imports for 'express', 'cookieParser', 'helmet', 'hpp', 'cors' from here, as they are now handled in main.ts or NestJS way

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtModule } from './jwt/jwt.module';

@Module({
  imports: [
    // Configuration Module: Loads environment variables
    ConfigModule.forRoot({
      envFilePath: path.resolve(__dirname, '..', '.env'),
      isGlobal: true, // Makes ConfigService available globally
      // Add schema validation for environment variables
      // validationSchema: Joi.object({ ... }) // Future enhancement for robust env validation
    }),
    // MongoDB Module: Connects to MongoDB using Mongoose
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
        // Other Mongoose options can be added here
        // useNewUrlParser: true, // Deprecated in Mongoose 6+
        // useUnifiedTopology: true, // Deprecated in Mongoose 6+
      }),
      inject: [ConfigService],
    }),
    // Winston Logging Module: Integrates Winston for structured logging
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.json() // Use JSON format for structured logs
          ),
        }),
        // Add other transports like file, daily rotate file, or external logging services
      ],
      // options
    }),
    // Feature Modules:
    AuthModule,
    UserModule,
    JwtModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  constructor(private configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    // Middleware that apply to specific routes or globally for specific purposes.
    // Global Express middleware like body-parser, cookie-parser, helmet, cors, hpp
    // are now primarily configured in main.ts (bootstrap function)
    // or through NestJS built-in mechanisms.
    // If you need more granular Express middleware, you can define them here.

    // Example for future specific middleware, e.g., a custom logger middleware
    // consumer
    //   .apply(SomeCustomMiddleware)
    //   .forRoutes({ path: 'users', method: RequestMethod.GET });
  }
}