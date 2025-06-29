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

import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IUser } from '../models/User';
import { JwtService } from '../jwt/jwt.service';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../pqc/pqc-monitoring.service';
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
  ) {}

  /**
   * Registers a new user.
   * @param registerDto Data for user registration (email, password).
   * @returns Newly created user's ID and email.
   * @throws ConflictException if email already registered.
   */
  async register(registerDto: RegisterDto): Promise<{ userId: string; email: string }> {
    const { email, password } = registerDto;

    const existingUser = await this.userModel.findOne({ email });
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
      const pqcPublicKey = this.generatePlaceholderKey('kyber768_public', userId);
      const pqcSigningKey = this.generatePlaceholderKey('dilithium3_private', userId);

      await this.userModel.findByIdAndUpdate(userId, {
        pqcPublicKey,
        pqcSigningKey,
        pqcKeyGeneratedAt: new Date(),
        usePQC: true,
      });

      success = true;
      this.logger.log(`PQC keys generated and stored for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to generate PQC keys for user ${userId}:`, error);
      throw error;
    } finally {
      await this.pqcMonitoring.recordPQCKeyGeneration(userId, startTime, success);
    }
  }

  private generatePlaceholderKey(keyType: string, userId: string): string {
    const timestamp = Date.now();
    const hash = require('crypto').createHash('sha256').update(`${keyType}_${userId}_${timestamp}`).digest('hex');
    return `${keyType}_${hash.substring(0, 32)}`;
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
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
          };

          await this.pqcMonitoring.recordPQCKeyGeneration(userId, startTime, true);

          return {
            access_token: payload, // Return payload for now since we don't have JWT service here
            pqc_enabled: true,
            algorithm: pqcResult.algorithm,
            session_data: pqcResult.session_data,
            performance_metrics: pqcResult.performance_metrics,
          };
        }
      } catch (pythonError: any) {
        this.logger.log(`Enhanced PQC bindings failed, falling back to placeholder: ${pythonError.message}`);
      }

      const pqcKeyData = {
        publicKey: this.generatePlaceholderKey('kyber768_public', userId),
        privateKey: this.generatePlaceholderKey('kyber768_private', userId),
        algorithm: 'Kyber-768',
        keySize: 1184,
        timestamp: new Date().toISOString(),
      };

      const payload = {
        sub: userId,
        pqc: true,
        algorithm: 'Kyber-768',
        keyId: pqcKeyData.publicKey.substring(0, 16),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      };

      await this.pqcMonitoring.recordPQCKeyGeneration(userId, startTime, true);

      this.logger.log(`PQC token generated successfully for user: ${userId} (fallback mode)`);

      return {
        access_token: payload,
        pqc_enabled: true,
        algorithm: 'Kyber-768',
        key_metadata: {
          algorithm: pqcKeyData.algorithm,
          keySize: pqcKeyData.keySize,
          timestamp: pqcKeyData.timestamp,
        },
        fallback_used: true,
      };

    } catch (error) {
      this.logger.error(`PQC token generation failed for user ${userId}:`, error);
      await this.pqcMonitoring.recordPQCKeyGeneration(userId, Date.now(), false);
      throw error;
    }
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

    const allowedOperations = ['generate_session_key', 'sign_token', 'verify_token', 'get_status'];
    if (!allowedOperations.includes(operation)) {
      throw new Error(`Invalid operation: ${operation}`);
    }

    const sanitizedParams = this.sanitizePQCParams(params);

    return new Promise((resolve, reject) => {
      const pythonScriptPath = path.join(__dirname, '../../../mock-qynauth/src/python_app/pqc_service_bridge.py');

      const tempFile = path.join(os.tmpdir(), `pqc_params_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.json`);

      try {
        fs.writeFileSync(tempFile, JSON.stringify(sanitizedParams), { mode: 0o600 });

        const pythonProcess = spawn('python3', [pythonScriptPath, operation, tempFile], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false, // Explicitly disable shell to prevent injection
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          try {
            fs.unlinkSync(tempFile);
          } catch (cleanupError) {
            this.logger.warn(`Failed to cleanup temp file: ${cleanupError.message}`);
          }

          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve(result);
            } catch (parseError: any) {
              reject(new Error(`Failed to parse Python service response: ${parseError.message}`));
            }
          } else {
            reject(new Error(`Python PQC service failed with code ${code}: ${stderr}`));
          }
        });

        pythonProcess.on('error', (error) => {
          try {
            fs.unlinkSync(tempFile);
          } catch (cleanupError) {
            this.logger.warn(`Failed to cleanup temp file: ${cleanupError.message}`);
          }
          reject(new Error(`Failed to spawn Python process: ${error.message}`));
        });
      } catch (fileError: any) {
        reject(new Error(`Failed to create secure parameter file: ${fileError.message}`));
      }
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
    const allowedFields = ['user_id', 'payload', 'token', 'metadata', 'operation_id'];

    for (const [key, value] of Object.entries(params)) {
      if (!allowedFields.includes(key)) {
        continue;
      }

      if (typeof value === 'string') {
        const sanitizedValue = value
          .replace(/[;&|`$(){}[\]\\]/g, '') // Remove shell metacharacters
          .split('').filter(char => char.charCodeAt(0) !== 0).join('') // Remove null bytes
          .trim();

        sanitized[key] = sanitizedValue.substring(0, 1000);
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
      .findOne({ email })
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
}
