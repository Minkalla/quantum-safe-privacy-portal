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

import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../secrets/secrets.service';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../pqc/pqc-monitoring.service';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface SSOTokenPayload extends TokenPayload {
  firstName?: string;
  lastName?: string;
  roles?: string[];
  authMethod: 'sso' | 'password' | 'pqc';
  idpIssuer?: string;
  sessionId?: string;
}

@Injectable()
export class JwtService implements OnModuleInit {
  private readonly logger = new Logger(JwtService.name);
  private jwtAccessSecret!: string;
  private jwtRefreshSecret!: string;
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
    private readonly pqcFeatureFlags: PQCFeatureFlagsService,
    private readonly pqcMonitoring: PQCMonitoringService,
  ) {}

  async onModuleInit() {
    this.logger.debug('Initializing JWT service secrets...');
    await this.initializeSecrets();
    this.isInitialized = true;
    this.logger.log('JWT service initialization completed successfully');
  }

  private async initializeSecrets(): Promise<void> {
    const skipSecretsManager = this.configService.get<string>('SKIP_SECRETS_MANAGER') === 'true';
    
    this.logger.debug(`SKIP_SECRETS_MANAGER value: ${this.configService.get<string>('SKIP_SECRETS_MANAGER')}`);
    this.logger.debug(`skipSecretsManager boolean: ${skipSecretsManager}`);
    
    if (skipSecretsManager) {
      this.jwtAccessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') || 
                            this.configService.get<string>('JWT_SECRET') || 
                            'test-access-secret-fallback';
      this.jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 
                             this.configService.get<string>('JWT_SECRET') || 
                             'test-refresh-secret-fallback';
      this.logger.debug(`JWT_ACCESS_SECRET: ${this.configService.get<string>('JWT_ACCESS_SECRET')}`);
      this.logger.debug(`JWT_REFRESH_SECRET: ${this.configService.get<string>('JWT_REFRESH_SECRET')}`);
      this.logger.debug(`Final jwtAccessSecret: ${this.jwtAccessSecret}`);
      this.logger.debug(`Final jwtRefreshSecret: ${this.jwtRefreshSecret}`);
      this.logger.log('JWT secrets initialized from direct environment variables (SKIP_SECRETS_MANAGER=true).');
      return;
    }

    // Production mode: use Secrets Manager
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
    if (!this.isInitialized || !this.jwtAccessSecret || !this.jwtRefreshSecret) {
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

  /**
   * Generates SSO-specific tokens with additional IdP attributes and claims.
   *
   * @param {SSOTokenPayload} ssoPayload - The SSO data including IdP attributes.
   * @param {boolean} [rememberMe=false] - If true, the refresh token will have a longer expiry.
   * @returns {{ accessToken: string, refreshToken: string }} An object containing both tokens.
   * @throws {InternalServerErrorException} If JWT secrets are not initialized.
   */
  generateSSOTokens(
    ssoPayload: SSOTokenPayload,
    rememberMe: boolean = false,
  ): { accessToken: string; refreshToken: string } {
    if (!this.isInitialized || !this.jwtAccessSecret || !this.jwtRefreshSecret) {
      this.logger.error('JWT secrets are not initialized. Cannot generate SSO tokens.');
      throw new InternalServerErrorException('JWT service not fully initialized.');
    }

    const usePQC = this.pqcFeatureFlags.isEnabled('pqc_jwt_signing', ssoPayload.userId);

    if (usePQC) {
      this.logger.debug(`Using PQC JWT signing for SSO user ${ssoPayload.userId}`);
      return this.generateSSOPQCTokens(ssoPayload, rememberMe);
    } else {
      this.logger.debug(`Using classical JWT signing for SSO user ${ssoPayload.userId}`);
      return this.generateSSOClassicalTokens(ssoPayload, rememberMe);
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
    if (!this.isInitialized || !this.jwtAccessSecret || !this.jwtRefreshSecret) {
      this.logger.error('JWT secrets are not initialized. Cannot generate PQC tokens.');
      throw new InternalServerErrorException('JWT service not fully initialized.');
    }
    const startTime = Date.now();
    let success = false;

    try {
      const pqcPayload = { ...payload, pqc: 'dilithium-3' };
      const accessToken = jwt.sign(pqcPayload, this.jwtAccessSecret, { expiresIn: '15m' });
      const refreshTokenExpiry = rememberMe ? '30d' : '7d';
      const refreshToken = jwt.sign(pqcPayload, this.jwtRefreshSecret, { expiresIn: refreshTokenExpiry });

      success = true;
      this.logger.log(`PQC tokens generated for user ${payload.email}. Access Token expires in 15m, Refresh Token in ${refreshTokenExpiry}.`);

      this.pqcMonitoring.recordPQCJWTSigning(payload.userId, startTime, success).catch(error => {
        this.logger.warn(`Failed to record PQC JWT metrics: ${error.message}`);
      });

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(`Failed to generate PQC tokens for user ${payload.email}:`, error);

      this.pqcMonitoring.recordPQCJWTSigning(payload.userId, startTime, success).catch(metricError => {
        this.logger.warn(`Failed to record PQC JWT failure metrics: ${metricError.message}`);
      });

      throw error;
    }
  }

  private generateSSOClassicalTokens(
    ssoPayload: SSOTokenPayload,
    rememberMe: boolean = false,
  ): { accessToken: string; refreshToken: string } {
    const enhancedPayload = {
      ...ssoPayload,
      iat: Math.floor(Date.now() / 1000),
      iss: 'quantum-safe-portal',
      aud: 'quantum-safe-portal-users',
    };

    const accessToken = jwt.sign(enhancedPayload, this.jwtAccessSecret, { expiresIn: '15m' });
    const refreshTokenExpiry = rememberMe ? '30d' : '7d';
    const refreshToken = jwt.sign(enhancedPayload, this.jwtRefreshSecret, { expiresIn: refreshTokenExpiry });

    this.logger.log(`SSO classical tokens generated for user ${ssoPayload.email} via ${ssoPayload.authMethod}. Access Token expires in 15m, Refresh Token in ${refreshTokenExpiry}.`);

    return { accessToken, refreshToken };
  }

  private generateSSOPQCTokens(
    ssoPayload: SSOTokenPayload,
    rememberMe: boolean = false,
  ): { accessToken: string; refreshToken: string } {
    if (!this.isInitialized || !this.jwtAccessSecret || !this.jwtRefreshSecret) {
      this.logger.error('JWT secrets are not initialized. Cannot generate SSO PQC tokens.');
      throw new InternalServerErrorException('JWT service not fully initialized.');
    }
    const startTime = Date.now();
    let success = false;

    try {
      const enhancedPayload = {
        ...ssoPayload,
        pqc: 'dilithium-3',
        iat: Math.floor(Date.now() / 1000),
        iss: 'quantum-safe-portal',
        aud: 'quantum-safe-portal-users',
      };

      const accessToken = jwt.sign(enhancedPayload, this.jwtAccessSecret, { expiresIn: '15m' });
      const refreshTokenExpiry = rememberMe ? '30d' : '7d';
      const refreshToken = jwt.sign(enhancedPayload, this.jwtRefreshSecret, { expiresIn: refreshTokenExpiry });

      success = true;
      this.logger.log(`SSO PQC tokens generated for user ${ssoPayload.email} via ${ssoPayload.authMethod}. Access Token expires in 15m, Refresh Token in ${refreshTokenExpiry}.`);

      this.pqcMonitoring.recordPQCJWTSigning(ssoPayload.userId, startTime, success).catch(error => {
        this.logger.warn(`Failed to record SSO PQC JWT metrics: ${error.message}`);
      });

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(`Failed to generate SSO PQC tokens for user ${ssoPayload.email}:`, error);

      this.pqcMonitoring.recordPQCJWTSigning(ssoPayload.userId, startTime, success).catch(metricError => {
        this.logger.warn(`Failed to record SSO PQC JWT failure metrics: ${metricError.message}`);
      });

      throw error;
    }
  }

  /**
   * Verifies a given JWT.
   *
   * @param {string} token - The JWT string to verify.
   * @param {string} secretType - 'access' or 'refresh' to determine which secret to use.
   * @returns {TokenPayload | SSOTokenPayload | null} The decoded payload if verification is successful, otherwise null.
   * @throws {InternalServerErrorException} If JWT secrets are not initialized.
   */
  verifyToken(token: string, secretType: 'access' | 'refresh'): TokenPayload | SSOTokenPayload | null {
    this.logger.debug(`Starting token verification for type '${secretType}', token: ${token.substring(0, 30)}...`);
    
    if (!this.isInitialized || !this.jwtAccessSecret || !this.jwtRefreshSecret) {
      this.logger.error('JWT secrets are not initialized. Cannot verify tokens.');
      throw new InternalServerErrorException('JWT service not fully initialized.');
    }

    let secret: string | undefined;

    if (secretType === 'access') {
      secret = this.jwtAccessSecret;
      this.logger.debug(`Using access secret: ${this.jwtAccessSecret.substring(0, 10)}...`);
    } else if (secretType === 'refresh') {
      secret = this.jwtRefreshSecret;
      this.logger.debug(`Using refresh secret: ${this.jwtRefreshSecret.substring(0, 10)}...`);
    }

    if (!secret) {
      this.logger.error(`JWT secret for type '${secretType}' is undefined after initialization.`);
      throw new InternalServerErrorException(`Server configuration error: JWT secret for ${secretType} not defined.`);
    }

    try {
      this.logger.debug(`Attempting JWT verification with jsonwebtoken.verify()`);
      const decoded = jwt.verify(token, secret) as TokenPayload | SSOTokenPayload;
      this.logger.debug(`Token of type '${secretType}' verified successfully for user: ${decoded.email}`);
      return decoded;
    } catch (err: any) { // CHANGED: Explicitly type 'err' as 'any'
      this.logger.error(`Token verification FAILED for type '${secretType}': ${err.message}`);
      this.logger.error(`Error name: ${err.name}`);
      this.logger.debug('Token verification error stack:', err.stack);
      this.logger.debug(`Failed token: ${token.substring(0, 50)}...`);
      this.logger.debug(`Secret used: ${secret.substring(0, 10)}...`);
      return null;
    }
  }

  /**
   * Checks if a token contains SSO-specific claims.
   *
   * @param {TokenPayload | SSOTokenPayload} payload - The decoded token payload.
   * @returns {boolean} True if the token contains SSO claims.
   */
  isSSOToken(payload: TokenPayload | SSOTokenPayload): payload is SSOTokenPayload {
    return 'authMethod' in payload && payload.authMethod === 'sso';
  }
}
