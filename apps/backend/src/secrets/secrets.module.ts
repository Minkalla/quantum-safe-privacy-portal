// src/portal/portal-backend/src/secrets/secrets.module.ts
/**
 * @file secrets.module.ts
 * @description NestJS module for AWS Secrets Manager integration.
 * This module provides the SecretsService to other parts of the application,
 * centralizing the logic for secure secret retrieval.
 *
 * @module SecretsModule
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This module ensures that secret management is handled securely and efficiently,
 * adhering to enterprise-grade security standards.
 */

import { Module } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule as SecretsService uses ConfigService

@Module({
  imports: [ConfigModule], // Import ConfigModule to make ConfigService available to SecretsService
  providers: [SecretsService],
  exports: [SecretsService], // Export SecretsService so it can be used in other modules
})
export class SecretsModule {}
