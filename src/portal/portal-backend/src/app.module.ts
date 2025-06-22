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

import { Module } from '@nestjs/common'; // Removed: MiddlewareConsumer, NestModule, RequestMethod (unused)
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtModule } from './jwt/jwt.module';

@Module({
  imports: [
    // Configuration Module: Loads environment variables
    ConfigModule.forRoot({
      envFilePath: path.resolve(__dirname, '..', '.env'),
      isGlobal: true, // Makes ConfigService available globally
    }),
    // MongoDB Module: Connects to MongoDB using Mongoose
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
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
            winston.format.json()
          ),
        }),
      ],
    }),
    // Feature Modules:
    AuthModule,
    UserModule,
    JwtModule,
  ],
  controllers: [],
  providers: [],
})
// Removed 'implements NestModule' and 'configure' method as they are unused without middleware
export class AppModule {}