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
 * This module is crucial for defining the overall overall structure of the NestJS application.
 * It integrates configuration, database connectivity, and logging, adhering to the
 * "no regrets" modular design.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { AppConfigService } from './config/config.service';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtModule } from './jwt/jwt.module';
import { SecretsModule } from './secrets/secrets.module';
import { ConsentModule } from './consent/consent.module';
import { ConfigModule } from './config/config.module';
import { PQCFeatureFlagsModule } from './pqc/pqc-feature-flags.module';
import { ABTestingModule } from './pqc/ab-testing.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { QualityModule } from './quality/quality.module';
import { ConsentEntity } from './entities/consent.entity';
import { UserEntity } from './entities/user.entity';

// Removed: import * as AWSXRay from 'aws-xray-sdk'; // REMOVED as per plan

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (appConfigService: AppConfigService) => ({
        type: 'postgres',
        host: appConfigService.get<string>('POSTGRES_HOST') || 'localhost',
        port: appConfigService.get<number>('POSTGRES_PORT') || 5432,
        username: appConfigService.get<string>('POSTGRES_USER'),
        password: appConfigService.get<string>('POSTGRES_PASSWORD'),
        database: appConfigService.get<string>('POSTGRES_DB'),
        entities: [ConsentEntity, UserEntity],
        synchronize: appConfigService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [AppConfigService],
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    AuthModule,
    UserModule,
    JwtModule,
    SecretsModule,
    ConsentModule,
    PQCFeatureFlagsModule,
    ABTestingModule,
    MonitoringModule,
    QualityModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
