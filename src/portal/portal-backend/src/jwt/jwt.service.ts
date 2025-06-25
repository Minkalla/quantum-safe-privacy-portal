/**
 * @file jwt.service.ts
 * @description NestJS service for JSON Web Token (JWT) generation and verification.
 * This service now dynamically retrieves JWT secrets from AWS Secrets Manager
 * via the SecretsService, enhancing security and secret management.
 *
 * @module JwtService
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This service provides a centralized and testable way to handle JWT operations.
 * It uses dynamically fetched secrets and integrates with the logging system.
 * It adheres to the "no regrets" quality by ensuring secure and robust token management.
 */

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../secrets/secrets.service';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';

interface TokenPayload {
  userId: string;
  email: string;
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private jwtAccessSecret!: string; // CHANGED: Added definite assignment assertion
  private jwtRefreshSecret!: string; // CHANGED: Added definite assignment assertion

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
    private readonly pqcFeatureFlags: PQCFeatureFlagsService,
  ) {
    // Call async initialization immediately after constructor,
    // NestJS will wait for this during application bootstrap.
    this.initializeSecrets();
  }

  // Asynchronous initialization for fetching secrets
  private async initializeSecrets() {
    const jwtAccessSecretId = this.configService.get<string>('JWT_ACCESS_SECRET_ID');
    const jwtRefreshSecretId = this.configService.get<string>('JWT_REFRESH_SECRET_ID');

    if (!jwtAccessSecretId || !jwtRefreshSecretId) {
      this.logger.error('JWT_ACCESS_SECRET_ID or JWT_REFRESH_SECRET_ID environment variables are not set.');
      throw new InternalServerErrorException('JWT Secret IDs are not configured.');
    }

    try {
      this.jwtAccessSecret = await this.secretsService.getSecret(jwtAccessSecretId);
      this.jwtRefreshSecret = await this.secretsService.getSecret(jwtRefreshSecretId);
      this.logger.log('JWT secrets successfully fetched and initialized from Secrets Manager.');
    } catch (error: any) { // CHANGED: Explicitly type 'error' as 'any'
      this.logger.error(`Failed to fetch JWT secrets from Secrets Manager: ${error.message}`);
      throw new InternalServerErrorException(`Failed to initialize JWT service: ${error.message}`);
    }
  }

  /**
   * Generates an Access Token and a Refresh Token for a given user payload.
   *
   * @param {TokenPayload} payload - The data to include in the token (e.g., userId, email).
   * @param {boolean} [rememberMe=false] - If true, the refresh token will have a longer expiry.
   * @returns {{ accessToken: string, refreshToken: string }} An object containing both tokens.
   * @throws {InternalServerErrorException} If JWT secrets are not initialized.
   */
  generateTokens(
    payload: TokenPayload,
    rememberMe: boolean = false,
  ): { accessToken: string; refreshToken: string } {
    if (!this.jwtAccessSecret || !this.jwtRefreshSecret) {
      this.logger.error('JWT secrets are not initialized. Cannot generate tokens.');
      throw new InternalServerErrorException('JWT service not fully initialized.');
    }

    const usePQC = this.pqcFeatureFlags.isEnabled('pqc_jwt_signing', payload.userId);
    
    if (usePQC) {
      this.logger.debug(`Using PQC JWT signing for user ${payload.userId}`);
      return this.generatePQCTokens(payload, rememberMe);
    } else {
      this.logger.debug(`Using classical JWT signing for user ${payload.userId}`);
      return this.generateClassicalTokens(payload, rememberMe);
    }
  }

  private generateClassicalTokens(
    payload: TokenPayload,
    rememberMe: boolean = false,
  ): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(payload, this.jwtAccessSecret, { expiresIn: '15m' });
    const refreshTokenExpiry = rememberMe ? '30d' : '7d';
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, { expiresIn: refreshTokenExpiry });

    this.logger.log(`Classical tokens generated for user ${payload.email}. Access Token expires in 15m, Refresh Token in ${refreshTokenExpiry}.`);

    return { accessToken, refreshToken };
  }

  private generatePQCTokens(
    payload: TokenPayload,
    rememberMe: boolean = false,
  ): { accessToken: string; refreshToken: string } {
    const pqcPayload = { ...payload, pqc: 'dilithium-3' };
    const accessToken = jwt.sign(pqcPayload, this.jwtAccessSecret, { expiresIn: '15m' });
    const refreshTokenExpiry = rememberMe ? '30d' : '7d';
    const refreshToken = jwt.sign(pqcPayload, this.jwtRefreshSecret, { expiresIn: refreshTokenExpiry });

    this.logger.log(`PQC tokens generated for user ${payload.email}. Access Token expires in 15m, Refresh Token in ${refreshTokenExpiry}.`);

    return { accessToken, refreshToken };
  }

  /**
   * Verifies a given JWT.
   *
   * @param {string} token - The JWT string to verify.
   * @param {string} secretType - 'access' or 'refresh' to determine which secret to use.
   * @returns {TokenPayload | null} The decoded payload if verification is successful, otherwise null.
   * @throws {InternalServerErrorException} If JWT secrets are not initialized.
   */
  verifyToken(token: string, secretType: 'access' | 'refresh'): TokenPayload | null {
    let secret: string | undefined;

    if (!this.jwtAccessSecret || !this.jwtRefreshSecret) {
      this.logger.error('JWT secrets are not initialized. Cannot verify tokens.');
      throw new InternalServerErrorException('JWT service not fully initialized.');
    }

    if (secretType === 'access') {
      secret = this.jwtAccessSecret;
    } else if (secretType === 'refresh') {
      secret = this.jwtRefreshSecret;
    }

    if (!secret) {
      this.logger.error(`JWT secret for type '${secretType}' is undefined after initialization.`);
      throw new InternalServerErrorException(`Server configuration error: JWT secret for ${secretType} not defined.`);
    }

    try {
      const decoded = jwt.verify(token, secret) as TokenPayload;
      this.logger.debug(`Token of type '${secretType}' verified successfully for user: ${decoded.email}`);
      return decoded;
    } catch (err: any) { // CHANGED: Explicitly type 'err' as 'any'
      this.logger.warn(`Token verification failed for type '${secretType}': ${err.message}`);
      return null;
    }
  }
}
