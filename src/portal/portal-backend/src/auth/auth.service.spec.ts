/**
 * @file auth.service.spec.ts
 * @description Unit tests for AuthService refresh token functionality.
 * Tests the new refreshToken method implementation for WBS 1.12.
 *
 * @module AuthServiceSpec
 * @author Minkalla
 * @license MIT
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JwtService } from '../jwt/jwt.service';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../pqc/pqc-monitoring.service';
import { PQCService } from '../services/pqc.service';
import { HybridCryptoService } from '../services/hybrid-crypto.service';
import { QuantumSafeJWTService } from '../services/quantum-safe-jwt.service';
import { PQCBridgeService } from '../services/pqc-bridge.service';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../secrets/secrets.service';
import { EnhancedErrorBoundaryService } from '../services/enhanced-error-boundary.service';
import { ClassicalCryptoService } from '../services/classical-crypto.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { PQCDataEncryptionService } from '../services/pqc-data-encryption.service';
import { PQCDataValidationService } from '../services/pqc-data-validation.service';
import { QuantumSafeCryptoIdentityService } from '../services/quantum-safe-crypto-identity.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService - Refresh Token', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userModel: any;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    refreshTokenHash: '',
    save: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    mockUser.refreshTokenHash = await bcrypt.hash('valid.refresh.token', 10);
    
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-jwt-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        AuthService,
        JwtService,
        PQCFeatureFlagsService,
        PQCMonitoringService,
        PQCService,
        HybridCryptoService,
        QuantumSafeJWTService,
        PQCBridgeService,
        SecretsService,
        EnhancedErrorBoundaryService,
        ClassicalCryptoService,
        CircuitBreakerService,
        PQCDataEncryptionService,
        PQCDataValidationService,
        QuantumSafeCryptoIdentityService,
        {
          provide: getModelToken('User'),
          useValue: {
            findById: jest.fn().mockImplementation(() => ({
              select: jest.fn().mockResolvedValue(mockUser)
            })),
            findOne: () => Promise.resolve(null),
            findByIdAndUpdate: () => Promise.resolve({}),
            create: () => Promise.resolve({}),
            save: () => Promise.resolve({}),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                'SKIP_SECRETS_MANAGER': 'true',
                'AWS_REGION': 'us-east-1',
                'JWT_ACCESS_SECRET_ID': 'test-access-secret-id',
                'JWT_REFRESH_SECRET_ID': 'test-refresh-secret-id',
                'MongoDB1': process.env.MongoDB1 || 'mongodb://localhost:27017/test',
              };
              return config[key] || process.env[key] || 'test-value';
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userModel = module.get(getModelToken('User'));
    
    await module.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshToken', () => {
    it('should successfully refresh token with valid refresh token', async () => {
      const refreshToken = 'valid.refresh.token';
      
      const tokenPayload = { userId: '507f1f77bcf86cd799439011', email: 'test@example.com' };
      const realRefreshToken = jwtService.generateTokens(tokenPayload, true).refreshToken;
      
      mockUser.refreshTokenHash = await bcrypt.hash(realRefreshToken, 10);
      (mockUser as any)._id = { toString: () => '507f1f77bcf86cd799439011' };

      const result = await service.refreshToken(realRefreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual({
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshToken = 'invalid.refresh.token';

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const tokenPayload = { userId: '507f1f77bcf86cd799439012', email: 'test@example.com' };
      const realRefreshToken = jwtService.generateTokens(tokenPayload, true).refreshToken;

      userModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.refreshToken(realRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token hash does not match', async () => {
      const tokenPayload = { userId: '507f1f77bcf86cd799439011', email: 'test@example.com' };
      const realRefreshToken = jwtService.generateTokens(tokenPayload, true).refreshToken;
      
      mockUser.refreshTokenHash = await bcrypt.hash('different.token', 10);
      (mockUser as any)._id = { toString: () => '507f1f77bcf86cd799439011' };

      await expect(service.refreshToken(realRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no refresh token hash', async () => {
      const tokenPayload = { userId: '507f1f77bcf86cd799439011', email: 'test@example.com' };
      const realRefreshToken = jwtService.generateTokens(tokenPayload, true).refreshToken;
      
      const userWithoutRefreshToken = { ...mockUser, refreshTokenHash: null };
      userModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(userWithoutRefreshToken),
      });

      await expect(service.refreshToken(realRefreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});
