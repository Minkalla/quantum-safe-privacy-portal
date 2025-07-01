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
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '../jwt/jwt.service';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../pqc/pqc-monitoring.service';
import { PQCService } from '../services/pqc.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const bcrypt = require('bcryptjs');

describe('AuthService - Refresh Token', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userModel: any;

  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    refreshTokenHash: '$2a$10$hashedRefreshToken',
    save: jest.fn(),
  };

  const mockJwtService = {
    verifyToken: jest.fn(),
    generateTokens: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
  };

  const mockPQCFeatureFlags = {
    isEnabled: jest.fn().mockReturnValue(false),
  };

  const mockPQCMonitoring = {
    recordPQCKeyGeneration: jest.fn(),
    recordPQCAuthentication: jest.fn(),
  };

  const mockPQCService = {
    triggerPQCHandshake: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PQCFeatureFlagsService,
          useValue: mockPQCFeatureFlags,
        },
        {
          provide: PQCMonitoringService,
          useValue: mockPQCMonitoring,
        },
        {
          provide: PQCService,
          useValue: mockPQCService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userModel = module.get(getModelToken('User'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshToken', () => {
    it('should successfully refresh token with valid refresh token', async () => {
      const refreshToken = 'valid.refresh.token';
      const payload = { userId: 'user123', email: 'test@example.com' };
      const newTokens = {
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
      };

      mockJwtService.verifyToken.mockReturnValue(payload);
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      mockJwtService.generateTokens.mockReturnValue(newTokens);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('newHashedToken');

      const result = await service.refreshToken(refreshToken);

      expect(mockJwtService.verifyToken).toHaveBeenCalledWith(refreshToken, 'refresh');
      expect(mockUserModel.findById).toHaveBeenCalledWith(payload.userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(refreshToken, '$2a$10$hashedRefreshToken');
      expect(mockJwtService.generateTokens).toHaveBeenCalledWith(
        { userId: 'user123', email: 'test@example.com' },
        false,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(newTokens.refreshToken, 10);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshToken = 'invalid.refresh.token';

      mockJwtService.verifyToken.mockReturnValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.verifyToken).toHaveBeenCalledWith(refreshToken, 'refresh');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const refreshToken = 'valid.refresh.token';
      const payload = { userId: 'nonexistent', email: 'test@example.com' };

      mockJwtService.verifyToken.mockReturnValue(payload);
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token hash does not match', async () => {
      const refreshToken = 'valid.refresh.token';
      const payload = { userId: 'user123', email: 'test@example.com' };

      mockJwtService.verifyToken.mockReturnValue(payload);
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).toHaveBeenCalledWith(refreshToken, mockUser.refreshTokenHash);
    });

    it('should throw UnauthorizedException when user has no refresh token hash', async () => {
      const refreshToken = 'valid.refresh.token';
      const payload = { userId: 'user123', email: 'test@example.com' };
      const userWithoutRefreshToken = { ...mockUser, refreshTokenHash: null };

      mockJwtService.verifyToken.mockReturnValue(payload);
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(userWithoutRefreshToken),
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});
