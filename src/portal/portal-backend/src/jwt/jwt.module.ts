// src/portal/portal-backend/src/jwt/jwt.module.ts
/**
 * @file jwt.module.ts
 * @description NestJS module for JSON Web Token (JWT) related functionalities.
 * This module encapsulates the JwtService for token generation and verification,
 * making it available for injection across the application.
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
import { JwtService } from './jwt.service'; // To be created

@Module({
  providers: [JwtService],
  exports: [JwtService], // Export JwtService so it can be used in other modules (e.g., AuthModule)
})
export class JwtModule {}