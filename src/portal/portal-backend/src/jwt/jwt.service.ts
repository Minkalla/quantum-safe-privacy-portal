// src/portal/portal-backend/src/jwt/jwt.service.ts
/**
 * @file jwt.service.ts
 * @description NestJS service for JSON Web Token (JWT) generation and verification.
 * This service encapsulates the core logic previously found in utils/jwtService.ts,
 * adapting it to the NestJS injectable pattern.
 *
 * @module JwtService
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This service provides a centralized and testable way to handle JWT operations.
 * It uses environment variables for secrets and integrates with the logging system.
 * It adheres to the "no regrets" quality by ensuring secure and robust token management.
 */

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import * as jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
  email: string;
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name); // NestJS Logger
  constructor(private readonly configService: ConfigService) {} // Inject ConfigService

  /**
   * Generates an Access Token and a Refresh Token for a given user payload.
   *
   * @param {TokenPayload} payload - The data to include in the token (e.g., userId, email).
   * @param {boolean} [rememberMe=false] - If true, the refresh token will have a longer expiry.
   * @returns {{ accessToken: string, refreshToken: string }} An object containing both tokens.
   * @throws {InternalServerErrorException} If JWT_ACCESS_SECRET or JWT_REFRESH_SECRET environment variables are not set.
   */
  generateTokens(
    payload: TokenPayload,
    rememberMe: boolean = false
  ): { accessToken: string; refreshToken: string } {
    const jwtAccessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!jwtAccessSecret || !jwtRefreshSecret) {
      this.logger.error('JWT_ACCESS_SECRET or JWT_REFRESH_SECRET environment variable not set.');
      throw new InternalServerErrorException('Server configuration error: JWT secrets not defined.');
    }

    // Access Token (short-lived, e.g., 15 minutes)
    const accessToken = jwt.sign(payload, jwtAccessSecret, { expiresIn: '15m' });

    // Refresh Token (long-lived, e.g., 7 days or 30 days if 'rememberMe')
    const refreshTokenExpiry = rememberMe ? '30d' : '7d';
    const refreshToken = jwt.sign(payload, jwtRefreshSecret, { expiresIn: refreshTokenExpiry });

    this.logger.log(`Tokens generated for user ${payload.email}. Access Token expires in 15m, Refresh Token in ${refreshTokenExpiry}.`);

    return { accessToken, refreshToken };
  }

  /**
   * Verifies a given JWT.
   *
   * @param {string} token - The JWT string to verify.
   * @param {string} secretType - 'access' or 'refresh' to determine which secret to use.
   * @returns {TokenPayload | null} The decoded payload if verification is successful, otherwise null.
   */
  verifyToken(token: string, secretType: 'access' | 'refresh'): TokenPayload | null {
    let secret: string | undefined;

    if (secretType === 'access') {
      secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    } else if (secretType === 'refresh') {
      secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    }

    if (!secret) {
      this.logger.error(`JWT secret for type '${secretType}' not defined.`);
      throw new InternalServerErrorException(`Server configuration error: JWT secret for ${secretType} not defined.`);
    }

    try {
      // @ts-ignore: We are intentionally allowing 'string' as a payload type given our custom type declaration
      const decoded = jwt.verify(token, secret) as TokenPayload;
      this.logger.debug(`Token of type '${secretType}' verified successfully for user: ${decoded.email}`);
      return decoded;
    } catch (err: any) {
      this.logger.warn(`Token verification failed for type '${secretType}': ${err.message}`);
      // Return null for invalid or expired tokens
      return null;
    }
  }
}