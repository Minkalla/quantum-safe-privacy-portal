// src/portal/portal-backend/src/auth/auth.service.ts
/**
 * @file auth.service.ts
 * @description NestJS service for handling authentication business logic.
 * This service encapsulates user registration, login, password hashing,
 * and token generation, ensuring a clean separation of concerns.
 *
 * @module AuthService
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Adheres to "no regrets" quality by centralizing core authentication logic,
 * integrating with the User model and JwtService. It implements brute-force
 * protection and secure password management.
 */

import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IUser } from '../models/User';
import { JwtService } from '../jwt/jwt.service';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../pqc/pqc-monitoring.service';
import { PQCService } from '../services/pqc.service';
import { HybridCryptoService } from '../services/hybrid-crypto.service';
import { QuantumSafeJWTService } from '../services/quantum-safe-jwt.service';
import { PQCBridgeService } from '../services/pqc-bridge.service';
import { ObjectId } from 'mongodb';

// Brute-force protection settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 60; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>,
    private readonly jwtService: JwtService,
    private readonly pqcFeatureFlags: PQCFeatureFlagsService,
    private readonly pqcMonitoring: PQCMonitoringService,
    private readonly pqcService: PQCService,
    private readonly hybridCryptoService: HybridCryptoService,
    private readonly quantumSafeJWTService: QuantumSafeJWTService,
    private readonly pqcBridgeService: PQCBridgeService,
  ) {}

  /**
   * Registers a new user.
   * @param registerDto Data for user registration (email, password).
   * @returns Newly created user's ID and email.
   * @throws ConflictException if email already registered.
   */
  async register(registerDto: RegisterDto): Promise<{ userId: string; email: string }> {
    const { email, password } = registerDto;

    const existingUser = await this.userModel.findOne({ email: this.sanitizeEmail(email) });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      email,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();
    const userId = (savedUser._id as ObjectId).toString();

    const usePQC = this.pqcFeatureFlags.isEnabled('pqc_user_registration', userId);
    if (usePQC) {
      await this.generatePQCKeys(userId);
    }

    return { userId, email: savedUser.email };
  }

  private async generatePQCKeys(userId: string): Promise<void> {
    const startTime = Date.now();
    let success = false;

    try {
      const pqcResult = await this.callPythonPQCService('generate_session_key', {
        user_id: userId,
        metadata: { operation: 'key_generation' },
      });

      if (pqcResult.success && pqcResult.session_data) {
        await this.userModel.findByIdAndUpdate(userId, {
          pqcPublicKey: pqcResult.session_data.public_key_hash,
          pqcSigningKey: pqcResult.session_data.ciphertext,
          pqcKeyGeneratedAt: new Date(),
          usePQC: true,
        });

        success = true;
        this.logger.log(`Real PQC keys generated and stored for user ${userId} using ${pqcResult.algorithm}`);
      } else {
        throw new Error(pqcResult.error_message || 'PQC key generation failed');
      }
    } catch (error) {
      this.logger.error(`Failed to generate PQC keys for user ${userId}:`, error);
      throw error;
    } finally {
      await this.pqcMonitoring.recordPQCKeyGeneration(userId, startTime, success);
    }
  }

  /**
   * Generate PQC-enhanced authentication token
   * @param userId User identifier
   * @returns PQC token with enhanced cryptographic protection
   */
  async generatePQCToken(userId: string): Promise<any> {
    try {
      this.logger.log(`Generating PQC token for user: ${userId}`);

      const startTime = Date.now();

      let pqcResult;
      try {
        pqcResult = await this.callPythonPQCService('generate_session_key', { user_id: userId });

        if (pqcResult.success) {
          this.logger.log(`Enhanced PQC session key generated for user: ${userId}`);

          const payload = {
            sub: userId,
            pqc: true,
            algorithm: pqcResult.algorithm || 'ML-KEM-768',
            session_id: pqcResult.session_data?.session_id,
            keyId: pqcResult.session_data?.public_key_hash,
            handshake_id: pqcResult.handshake_metadata?.handshake_id,
            handshake_timestamp: pqcResult.handshake_metadata?.timestamp,
            kem_algorithm: pqcResult.handshake_metadata?.kem_algorithm,
            dsa_algorithm: pqcResult.handshake_metadata?.dsa_algorithm,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
          };

          await this.pqcMonitoring.recordPQCKeyGeneration(userId, startTime, true);

          return {
            access_token: await this.quantumSafeJWTService.signPQCToken(payload),
            pqc_enabled: true,
            algorithm: pqcResult.algorithm,
            session_data: pqcResult.session_data,
            performance_metrics: pqcResult.performance_metrics,
          };
        }
      } catch (pythonError: any) {
        this.logger.log(`Enhanced PQC bindings failed, falling back to placeholder: ${pythonError.message}`);
      }

      try {
        const fallbackPayload = {
          sub: userId,
          pqc: false,
          algorithm: 'RSA-2048',
          fallback: true,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
        };

        const fallbackResult = await this.hybridCryptoService.encryptWithFallback(
          JSON.stringify(fallbackPayload),
          'fallback-public-key',
        );

        this.logger.warn('CRYPTO_FALLBACK_USED', {
          fallbackReason: 'PQC service unavailable',
          algorithm: fallbackResult.algorithm,
          userId: userId,
          operation: 'generatePQCToken',
          timestamp: new Date().toISOString(),
          originalAlgorithm: 'ML-KEM-768',
        });

        return {
          token: fallbackResult.ciphertext,
          algorithm: fallbackResult.algorithm,
          metadata: {
            fallbackUsed: true,
            fallbackReason: 'PQC service unavailable',
            timestamp: new Date().toISOString(),
          },
        };
      } catch (fallbackError) {
        this.logger.error(`Both PQC and classical crypto failed: ${fallbackError.message}`);
        throw new Error(`Cryptographic services unavailable: ${fallbackError.message}`);
      }

    } catch (error) {
      this.logger.error(`PQC token generation failed for user ${userId}:`, error);
      await this.pqcMonitoring.recordPQCKeyGeneration(userId, Date.now(), false);
      throw error;
    }
  }

  /**
   * Execute PQC service calls through secure bridge service
   * @param operation The PQC operation to perform
   * @param params Parameters for the operation
   * @returns Promise with PQC service response
   */
  async executePQCServiceCall(operation: string, params: any): Promise<any> {
    return this.pqcBridgeService.executePQCOperation(operation, params, {
      fallbackEnabled: true,
      timeout: 30000,
      retries: 2,
    });
  }

  /**
   * Call Python PQC service for enhanced cryptographic operations
   * Implements secure parameter handling to prevent command injection
   */
  private async callPythonPQCService(operation: string, params: any): Promise<any> {
    const { spawn } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    const os = require('os');
    const crypto = require('crypto');

    const ALLOWED_OPERATIONS = Object.freeze([
      'generate_session_key',
      'sign_token',
      'verify_token',
      'get_status',
      'handshake',
    ] as const);

    if (!ALLOWED_OPERATIONS.includes(operation as any)) {
      throw new Error(`Invalid operation: ${operation}`);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(operation)) {
      throw new Error(`Operation contains invalid characters: ${operation}`);
    }

    const sanitizedParams = this.sanitizePQCParams(params);
    console.log(`DEBUG TS: Calling PQC service: ${operation} with params: ${JSON.stringify(sanitizedParams)}`);

    // Special debugging for verify_token operations
    if (operation === 'verify_token') {
      console.log(`DEBUG TS: verify_token - token length: ${sanitizedParams.token?.length || 'undefined'}`);
      console.log(`DEBUG TS: verify_token - user_id: ${sanitizedParams.user_id}`);
      if (sanitizedParams.token) {
        console.log(`DEBUG TS: verify_token - token preview: ${sanitizedParams.token.slice(0, 100)}...`);
      }
    }

    return new Promise((resolve, reject) => {
      const pythonScriptPath = path.resolve(__dirname, '../../../mock-qynauth/src/python_app/pqc_service_bridge.py');

      if (!fs.existsSync(pythonScriptPath)) {
        reject(new Error('Python script not found'));
        return;
      }

      const pythonProcess = spawn('python3', [pythonScriptPath, operation, JSON.stringify(sanitizedParams)], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false, // Critical: disable shell to prevent injection
        timeout: 30000, // 30 second timeout
        windowsHide: true, // Hide window on Windows
        cwd: path.resolve(__dirname, '../../../mock-qynauth/src/python_app'), // Set working directory
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        const stderrData = data.toString();
        stderr += stderrData;
        if (stderrData.includes('DEBUG BRIDGE:') || stderrData.includes('DEBUG:')) {
          this.logger.debug(`Python stderr: ${stderrData}`);
        }
      });

      pythonProcess.on('close', (code) => {
        console.log(`DEBUG TS: Python process closed with code ${code}`);
        console.log(`DEBUG TS: stdout length: ${stdout.length}`);
        console.log(`DEBUG TS: stderr length: ${stderr.length}`);

        if (stderr.length > 0) {
          console.log(`DEBUG TS: stderr content: ${stderr}`);
        }

        try {
          const result = JSON.parse(stdout);
          console.log(`DEBUG TS: PQC service response for ${operation}: ${JSON.stringify(result)}`);
          resolve(result);
        } catch (parseError: any) {
          if (code === 0) {
            this.logger.error(`Failed to parse Python service response: ${parseError.message}, stdout: ${stdout}`);
            reject(new Error(`Failed to parse Python service response: ${parseError.message}`));
          } else {
            this.logger.error(`Python PQC service failed with code ${code}: ${stderr}`);
            reject(new Error(`Python PQC service failed with code ${code}: ${stderr}`));
          }
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });

      pythonProcess.on('timeout', () => {
        pythonProcess.kill('SIGKILL');
        reject(new Error('Python PQC service timed out'));
      });
    });
  }

  /**
   * Sanitize PQC service parameters to prevent injection attacks
   */
  private sanitizePQCParams(params: any): any {
    if (!params || typeof params !== 'object') {
      return {};
    }

    const sanitized: any = {};
    const allowedFields = ['user_id', 'payload', 'data_hash', 'token', 'metadata', 'operation_id', 'message', 'operation', 'algorithm', 'signature_hex', 'public_key_hex', 'original_payload'];

    for (const [key, value] of Object.entries(params)) {
      if (!allowedFields.includes(key)) {
        continue;
      }

      if (typeof value === 'string') {
        const isBase64Like = /^[A-Za-z0-9+/=]+$/.test(value);
        const isUserIdLike = /^[a-zA-Z0-9_-]+$/.test(value);
        const isJsonLike = value.startsWith('{') && value.endsWith('}');

        let sanitizedValue;
        if (isBase64Like || isUserIdLike || isJsonLike) {
          sanitizedValue = value
            .split('').filter(char => char.charCodeAt(0) !== 0).join('') // Remove null bytes
            .replace(/[\r\n\t]/g, '') // Remove control characters
            .trim();
        } else {
          sanitizedValue = value
            .replace(/[;&|`$(){}[\]\\<>'"]/g, '') // Remove shell metacharacters and quotes
            .split('').filter(char => char.charCodeAt(0) !== 0).join('') // Remove null bytes
            .replace(/[\r\n\t]/g, '') // Remove control characters
            .trim();
        }

        if (!isBase64Like && !isUserIdLike && !isJsonLike && sanitizedValue.length < value.length * 0.8) {
          throw new Error(`Parameter ${key} contains suspicious characters`);
        }

        if (isJsonLike) {
          sanitized[key] = sanitizedValue;
        } else {
          sanitized[key] = sanitizedValue.slice(0, 1000);
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizePQCParams(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Authenticates a user and generates JWT tokens.
   * @param loginDto Data for user login (email, password, rememberMe).
   * @returns Access token, refresh token, and user details.
   * @throws UnauthorizedException for invalid credentials.
   * @throws ForbiddenException if account is locked.
   */
  async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken?: string; user: { id: string; email: string } }> {
    const { email, password, rememberMe } = loginDto;

    const user = await this.userModel
      .findOne({ email: this.sanitizeEmail(email) })
      .select('+password +failedLoginAttempts +lockUntil +refreshTokenHash');

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingLockTime = Math.ceil((user.lockUntil.getTime() - new Date().getTime()) / (60 * 1000));
      throw new ForbiddenException(`Account locked. Please try again in ${remainingLockTime} minutes.`);
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      throw new UnauthorizedException('Invalid credentials');
    }
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();

    // CHANGED: Explicitly cast user._id to ObjectId for .toString() method
    const tokenPayload = { userId: (user._id as ObjectId).toString(), email: user.email };

    const { accessToken, refreshToken } = this.jwtService.generateTokens(tokenPayload, rememberMe);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenHash = hashedRefreshToken;

    await user.save();

    try {
      await this.triggerPQCHandshake((user._id as ObjectId).toString());
    } catch (handshakeError) {
      this.logger.warn(`PQC handshake failed for user ${user._id}, continuing with login:`, handshakeError);
    }

    const response: any = {
      accessToken,
      user: {
        id: (user._id as ObjectId).toString(), // CHANGED: Explicitly cast user._id to ObjectId for .toString() method
        email: user.email,
      },
    };

    if (rememberMe) {
      response.refreshToken = refreshToken;
    }

    return response;
  }

  /**
   * Refreshes access token using a valid refresh token.
   * @param refreshToken The refresh token to validate.
   * @returns New access token and optionally a new refresh token.
   * @throws UnauthorizedException for invalid or expired refresh tokens.
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; user: { id: string; email: string } }> {
    try {
      const payload = this.jwtService.verifyToken(refreshToken, 'refresh');
      if (!payload) {
        this.invalidRefreshTokenHandler(refreshToken, 'Invalid token payload');
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.userModel
        .findById(this.sanitizeUserId(payload.userId))
        .select('+refreshTokenHash');

      if (!user || !user.refreshTokenHash) {
        this.invalidRefreshTokenHandler(refreshToken, 'User not found or no refresh token hash');
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isRefreshTokenValid) {
        this.invalidRefreshTokenHandler(refreshToken, 'Token hash mismatch');
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokenPayload = { userId: (user._id as ObjectId).toString(), email: user.email };
      const { accessToken, refreshToken: newRefreshToken } = this.jwtService.generateTokens(tokenPayload, false);

      const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
      user.refreshTokenHash = hashedNewRefreshToken;
      await user.save();

      this.logger.log(`Token refreshed successfully for user ${user.email}`);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: (user._id as ObjectId).toString(),
          email: user.email,
        },
      };
    } catch (error) {
      this.logger.warn(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Handle invalid refresh tokens with blacklist logging (stub implementation)
   * This provides a hook for future token blacklist/revocation functionality
   * @param refreshToken The invalid refresh token
   * @param reason The reason for invalidation
   */
  private invalidRefreshTokenHandler(refreshToken: string, reason: string): void {
    const tokenHash = refreshToken.substring(0, 10) + '...';
    this.logger.warn(`Invalid refresh token detected: ${tokenHash}, reason: ${reason}`);

  }

  /**
   * Trigger post-login PQC handshake with comprehensive logging
   * @param userId User identifier
   * @returns Promise with handshake result and metadata
   */
  async triggerPQCHandshake(userId: string): Promise<any> {
    const startTime = Date.now();
    let success = false;
    let handshakeMetadata: any = null;

    try {
      const handshakeResult = await this.pqcService.triggerPQCHandshake(userId);

      if (handshakeResult.success) {
        success = true;
        handshakeMetadata = handshakeResult.handshake_metadata;

        this.logger.log(`PQC handshake completed for user ${userId}`, {
          handshake_id: handshakeMetadata.handshake_id,
          algorithms: `${handshakeMetadata.kem_algorithm}/${handshakeMetadata.dsa_algorithm}`,
          duration_ms: Date.now() - startTime,
          fallback_mode: handshakeMetadata.fallback_mode,
        });
      } else {
        throw new Error(handshakeResult.error_message || 'Handshake failed');
      }

      return handshakeResult;
    } catch (error) {
      this.logger.error(`PQC handshake failed for user ${userId}:`, error);
      throw error;
    } finally {
      await this.pqcMonitoring.recordPQCAuthentication(userId, startTime, success);
    }
  }

  private sanitizeUserId(userId: string): string {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID format');
    }
    
    const sanitized = userId.replace(/[^a-zA-Z0-9]/g, '');
    if (sanitized.length < 1 || sanitized.length > 50) {
      throw new BadRequestException('User ID length out of bounds');
    }
    
    return sanitized;
  }

  private sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('Invalid email format');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }
    
    return email.toLowerCase().trim();
  }
}
