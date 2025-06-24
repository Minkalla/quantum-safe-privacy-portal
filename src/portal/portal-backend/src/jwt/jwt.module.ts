// src/portal/portal-backend/src/jwt/jwt.module.ts
/**
 * @file jwt.module.ts
 * @description NestJS module for JSON Web Token (JWT) related functionalities.
 * This module encapsulates the JwtService for token generation and verification,
 * making it available for injection across the application. It now imports
 * SecretsModule to allow JwtService to fetch secrets dynamically.
 *
 * @module JwtModule
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This module contributes to the "no regrets" architecture by centralizing
 * token management, ensuring consistency and testability of JWT operations.
 */

import { Module } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { SecretsModule } from '../secrets/secrets.module'; // ADDED: Import SecretsModule
import { ConfigModule } from '../config/config.module'; // ADDED: Import ConfigModule if ConfigService is used directly here

@Module({
  imports: [
    ConfigModule, // JwtService uses ConfigService, so ConfigModule must be imported
    SecretsModule, // CHANGED: Import SecretsModule to resolve SecretsService dependency
  ],
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}
