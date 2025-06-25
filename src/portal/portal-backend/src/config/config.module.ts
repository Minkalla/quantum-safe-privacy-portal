// src/portal/portal-backend/src/config/config.module.ts
/**
 * @file config.module.ts
 * @description NestJS module for application configuration.
 * This module provides the AppConfigService, encapsulating environment variable
 * loading and validation for the entire application.
 *
 * @module ConfigModule
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This module leverages @nestjs/config to integrate robust environment variable
 * management into the NestJS application. It enhances security by enforcing
 * proper configuration.
 */

import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service'; // CHANGED: Import AppConfigService

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  providers: [AppConfigService], // CHANGED: Provide AppConfigService
  exports: [AppConfigService], // CHANGED: Export AppConfigService
})
export class ConfigModule {}
