import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { spawn } from 'child_process';
import * as path from 'path';
import { PQCLoginDto, PQCRegisterDto } from './dto/pqc-auth.dto';
import { IUser } from '../models/User';
import { JwtService } from '../jwt/jwt.service';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../pqc/pqc-monitoring.service';
import {
  AuthenticationMode,
  PQCAlgorithm,
  PQCAuthResult,
  HybridAuthConfig,
  AuthenticationResponse,
} from './interfaces/pqc-auth.interface';
import { ObjectId } from 'mongodb';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 60;

@Injectable()
export class EnhancedAuthService {
  private readonly logger = new Logger(EnhancedAuthService.name);
  private readonly hybridConfig: HybridAuthConfig = {
    enableClassical: true,
    enablePQC: true,
    preferredMode: AuthenticationMode.HYBRID,
    fallbackToClassical: true,
    pqcThreshold: 0.8,
  };

  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>,
    private readonly jwtService: JwtService,
    private readonly pqcFeatureFlags: PQCFeatureFlagsService,
    private readonly pqcMonitoring: PQCMonitoringService,
  ) {}

  async registerWithPQC(registerDto: PQCRegisterDto): Promise<AuthenticationResponse> {
    const { email, password, usePQC = false, preferredAuthMode = AuthenticationMode.CLASSICAL } = registerDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      email,
      password: hashedPassword,
      usePQC,
    });

    const savedUser = await newUser.save();
    const userId = (savedUser._id as ObjectId).toString();

    let pqcResult: PQCAuthResult | null = null;
    let authMode = preferredAuthMode;

    if (usePQC && this.pqcFeatureFlags.isEnabled('pqc_user_registration', userId)) {
      try {
        pqcResult = await this.generatePQCKeys(userId);
        if (pqcResult.success) {
          await this.userModel.findByIdAndUpdate(userId, {
            pqcPublicKey: pqcResult.sessionData?.publicKeyHash,
            pqcSigningKey: 'stored_securely',
            pqcKeyGeneratedAt: new Date(),
            usePQC: true,
          });
          authMode = AuthenticationMode.PQC;
        } else {
          authMode = AuthenticationMode.CLASSICAL;
        }
      } catch (error) {
        this.logger.error(`PQC key generation failed during registration for user ${userId}:`, error);
        authMode = AuthenticationMode.CLASSICAL;
      }
    }

    return {
      success: true,
      user: {
        id: userId,
        email: savedUser.email,
        usePQC: savedUser.usePQC,
      },
      authMode,
      algorithm: pqcResult?.algorithm as PQCAlgorithm,
      sessionData: pqcResult?.sessionData,
      performanceMetrics: pqcResult?.performanceMetrics,
    };
  }

  async loginWithHybridAuth(loginDto: PQCLoginDto): Promise<AuthenticationResponse> {
    const { email, password, authMode = AuthenticationMode.HYBRID, rememberMe = false, usePQC } = loginDto;

    const user = await this.userModel
      .findOne({ email })
      .select('+password +failedLoginAttempts +lockUntil +refreshTokenHash +usePQC');

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

    const userId = (user._id as ObjectId).toString();
    const shouldUsePQC = this.shouldUsePQC(authMode, user.usePQC, usePQC);

    let tokens: { accessToken: string; refreshToken?: string };
    let pqcResult: PQCAuthResult | null = null;
    let finalAuthMode: AuthenticationMode;

    if (shouldUsePQC && this.pqcFeatureFlags.isEnabled('pqc_authentication', userId)) {
      try {
        pqcResult = await this.authenticateWithPQC(userId, { email: user.email });

        if (pqcResult.success) {
          tokens = await this.generatePQCTokens(userId, user.email, rememberMe, pqcResult);
          finalAuthMode = AuthenticationMode.PQC;
        } else {
          if (this.hybridConfig.fallbackToClassical) {
            tokens = this.jwtService.generateTokens({ userId, email: user.email }, rememberMe);
            finalAuthMode = AuthenticationMode.CLASSICAL;
          } else {
            throw new UnauthorizedException('PQC authentication failed and fallback disabled');
          }
        }
      } catch (error) {
        this.logger.error(`PQC authentication failed for user ${userId}:`, error);

        if (this.hybridConfig.fallbackToClassical) {
          tokens = this.jwtService.generateTokens({ userId, email: user.email }, rememberMe);
          finalAuthMode = AuthenticationMode.CLASSICAL;
        } else {
          throw new UnauthorizedException('Authentication failed');
        }
      }
    } else {
      tokens = this.jwtService.generateTokens({ userId, email: user.email }, rememberMe);
      finalAuthMode = AuthenticationMode.CLASSICAL;
    }

    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken || '', 10);
    user.refreshTokenHash = hashedRefreshToken;
    await user.save();

    const response: AuthenticationResponse = {
      success: true,
      accessToken: tokens.accessToken,
      user: {
        id: userId,
        email: user.email,
        usePQC: user.usePQC,
      },
      authMode: finalAuthMode,
      algorithm: pqcResult?.algorithm as PQCAlgorithm,
      sessionData: pqcResult?.sessionData,
      performanceMetrics: pqcResult?.performanceMetrics,
    };

    if (rememberMe && tokens.refreshToken) {
      response.refreshToken = tokens.refreshToken;
    }

    return response;
  }

  private shouldUsePQC(authMode: AuthenticationMode, userPQCEnabled?: boolean, requestPQC?: boolean): boolean {
    switch (authMode) {
    case AuthenticationMode.PQC:
      return true;
    case AuthenticationMode.CLASSICAL:
      return false;
    case AuthenticationMode.HYBRID:
      return userPQCEnabled || requestPQC || false;
    default:
      return false;
    }
  }

  private async generatePQCKeys(userId: string): Promise<PQCAuthResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Generating PQC keys for user: ${userId}`);

      const result = await this.callPythonPQCService('generate_session_key', { user_id: userId });

      if (result.success) {
        await this.pqcMonitoring.recordPQCKeyGeneration(userId, startTime, true);
        return result;
      } else {
        await this.pqcMonitoring.recordPQCKeyGeneration(userId, startTime, false);
        return {
          success: false,
          errorMessage: result.error_message || 'PQC key generation failed',
        };
      }
    } catch (error: any) {
      this.logger.error(`PQC key generation failed for user ${userId}:`, error);
      await this.pqcMonitoring.recordPQCKeyGeneration(userId, startTime, false);

      return {
        success: false,
        errorMessage: `PQC key generation error: ${error.message}`,
      };
    }
  }

  private async authenticateWithPQC(userId: string, userInfo: { email: string }): Promise<PQCAuthResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Authenticating with PQC for user: ${userId}`);

      const sessionResult = await this.callPythonPQCService('generate_session_key', {
        user_id: userId,
        metadata: { email: userInfo.email },
      });

      if (sessionResult.success) {
        await this.pqcMonitoring.recordPQCAuthentication(userId, startTime, true);
        return sessionResult;
      } else {
        await this.pqcMonitoring.recordPQCAuthentication(userId, startTime, false);
        return {
          success: false,
          errorMessage: sessionResult.error_message || 'PQC authentication failed',
        };
      }
    } catch (error: any) {
      this.logger.error(`PQC authentication failed for user ${userId}:`, error);
      await this.pqcMonitoring.recordPQCAuthentication(userId, startTime, false);

      return {
        success: false,
        errorMessage: `PQC authentication error: ${error.message}`,
      };
    }
  }

  private async generatePQCTokens(
    userId: string,
    email: string,
    rememberMe: boolean,
    pqcResult: PQCAuthResult,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const payload = {
      userId,
      email,
      sessionId: pqcResult.sessionData?.sessionId,
      algorithm: pqcResult.algorithm,
      pqc: true,
      keyId: pqcResult.sessionData?.publicKeyHash,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
    };

    const accessToken = JSON.stringify(payload);
    const refreshToken = this.jwtService.generateTokens({ userId, email }, rememberMe).refreshToken;

    return { accessToken, refreshToken };
  }

  private async callPythonPQCService(operation: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonScriptPath = path.join(__dirname, '../../../mock-qynauth/src/python_app/pqc_service_bridge.py');
      const pythonProcess = spawn('python3', [pythonScriptPath, operation, JSON.stringify(params)]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
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
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  async verifyPQCToken(token: string, userId: string): Promise<PQCAuthResult> {
    try {
      const result = await this.callPythonPQCService('verify_token', {
        token,
        user_id: userId,
      });

      return result;
    } catch (error: any) {
      this.logger.error('PQC token verification failed:', error);
      return {
        success: false,
        errorMessage: `Token verification error: ${error.message}`,
      };
    }
  }

  getHybridConfig(): HybridAuthConfig {
    return { ...this.hybridConfig };
  }

  updateHybridConfig(config: Partial<HybridAuthConfig>): void {
    Object.assign(this.hybridConfig, config);
    this.logger.log('Hybrid authentication configuration updated', config);
  }
}
