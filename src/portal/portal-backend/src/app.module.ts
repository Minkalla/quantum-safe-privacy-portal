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

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

// Removed: import { ConfigService as NestConfigService } from '@nestjs/config'; // No longer needed here
import { AppConfigService } from './config/config.service';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtModule } from './jwt/jwt.module';
import { SecretsModule } from './secrets/secrets.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule], // Our custom ConfigModule
      useFactory: async (appConfigService: AppConfigService) => {
        const mongoUri = appConfigService.get<string>('MONGO_URI');
        if (!mongoUri) {
          throw new Error('MONGO_URI environment variable is not defined or invalid. Check .env and AppConfigService validation.');
        }
        return {
          uri: mongoUri,
        };
      },
      inject: [AppConfigService],
    }),
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
    AuthModule,
    UserModule,
    JwtModule,
    SecretsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}