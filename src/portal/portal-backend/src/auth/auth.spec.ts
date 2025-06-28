import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '../jwt/jwt.service';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../pqc/pqc-monitoring.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { User } from '../models/User';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;

  const mockUser = {
    id: '507f1f77-bcf8-6cd7-9943-9011abcdef12',
    email: 'test@example.com',
    password: '$2a$10$hashedPassword',
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: new Date(),
    refreshTokenHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            generateTokens: jest.fn().mockReturnValue({
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
            }),
          },
        },
        {
          provide: PQCFeatureFlagsService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: PQCMonitoringService,
          useValue: {
            recordPQCKeyGeneration: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((userData) => ({
              ...mockUser,
              ...userData,
            })),
            save: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = { email: 'new@example.com', password: 'password123' };

      userModel.findOne.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email', registerDto.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = { email: 'existing@example.com', password: 'password123' };

      userModel.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login user with correct credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123', rememberMe: true };

      userModel.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedRefreshToken' as never);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('email', 'test@example.com');
    });

    it('should login user without refreshToken when rememberMe is false', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123', rememberMe: false };

      userModel.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedRefreshToken' as never);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('email', 'test@example.com');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword', rememberMe: false };

      userModel.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for locked account', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123', rememberMe: false };
      const lockedUser = { ...mockUser, lockUntil: new Date(Date.now() + 60000) };

      userModel.findOne.mockResolvedValue(lockedUser);

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });
  });
});
