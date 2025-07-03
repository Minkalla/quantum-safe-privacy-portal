import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService as CustomJwtService } from '../jwt/jwt.service';
import { JwtService } from '@nestjs/jwt';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../pqc/pqc-monitoring.service';
import { PQCService } from '../services/pqc.service';
import { HybridCryptoService } from '../services/hybrid-crypto.service';
import { QuantumSafeJWTService } from '../services/quantum-safe-jwt.service';
import { PQCBridgeService } from '../services/pqc-bridge.service';
import { SecretsService } from '../secrets/secrets.service';
import { PQCDataEncryptionService } from '../services/pqc-data-encryption.service';
import { ClassicalCryptoService } from '../services/classical-crypto.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { EnhancedErrorBoundaryService } from '../services/enhanced-error-boundary.service';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    password: '$2a$10$hashedPassword',
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: new Date(),
    refreshTokenHash: null,
    save: () => Promise.resolve(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        CustomJwtService,
        JwtService,
        PQCFeatureFlagsService,
        PQCMonitoringService,
        PQCService,
        HybridCryptoService,
        QuantumSafeJWTService,
        PQCBridgeService,
        SecretsService,
        PQCDataEncryptionService,
        ClassicalCryptoService,
        CircuitBreakerService,
        EnhancedErrorBoundaryService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                'JWT_ACCESS_SECRET_ID': 'test-access-secret-id',
                'JWT_REFRESH_SECRET_ID': 'test-refresh-secret-id',
                'AWS_REGION': 'us-east-1',
                'SKIP_SECRETS_MANAGER': 'true',
                'MongoDB1': process.env.MongoDB1 || 'mongodb://localhost:27017/test',
                'pqc.enabled': true,
                'pqc.fallback_enabled': true,
                'encryption.default_algorithm': 'Kyber-768',
                'validation.default_algorithm': 'Dilithium-3',
                'performance.monitoring_enabled': true,
                'jwt.secret': 'test-secret',
                'jwt.expiresIn': '1h',
              };
              return config[key] || process.env[key] || 'test-value';
            },
          },
        },
        {
          provide: getModelToken('User'),
          useValue: (() => {
            function MockUserModel(userData) {
              console.log('MockUserModel constructor called with:', userData);
              Object.assign(this, { ...mockUser, ...userData });
              
              this.save = function() {
                console.log('MockUserModel save() called, this:', this);
                const result = { 
                  ...this, 
                  _id: {
                    toString: () => '507f1f77bcf86cd799439011'
                  }
                };
                console.log('MockUserModel save() returning:', result);
                return Promise.resolve(result);
              };
            }
            
            MockUserModel.findOne = function() {
              console.log('MockUserModel findOne() called');
              return Promise.resolve(null);
            };
            
            MockUserModel.findByIdAndUpdate = function() {
              return Promise.resolve({});
            };
            
            MockUserModel.create = function(userData) {
              return Promise.resolve(new MockUserModel(userData));
            };
            
            return MockUserModel;
          })(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken('User'));
    
    await module.init();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = { email: 'new@example.com', password: 'password123' };

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email', registerDto.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = { email: 'existing@example.com', password: 'password123' };

      userModel.findOne = () => Promise.resolve(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login user with correct credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123', rememberMe: true };

      const userWithValidPassword = { 
        ...mockUser, 
        password: '$2a$10$zxnkjUXnrq9Jn1aB26I2C.1s1tfYO.Np4TxEPddaku3fUSnGuF/Nq',
        save: () => Promise.resolve({ 
          ...mockUser, 
          _id: '507f1f77bcf86cd799439011'
        })
      };
      userModel.findOne = () => ({
        select: () => Promise.resolve(userWithValidPassword),
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('email', 'test@example.com');
    });

    it('should login user with refreshToken regardless of rememberMe flag', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123', rememberMe: false };

      const userWithValidPassword = { 
        ...mockUser, 
        password: '$2a$10$zxnkjUXnrq9Jn1aB26I2C.1s1tfYO.Np4TxEPddaku3fUSnGuF/Nq',
        save: () => Promise.resolve({ 
          ...mockUser, 
          _id: '507f1f77bcf86cd799439011'
        })
      };
      userModel.findOne = () => ({
        select: () => Promise.resolve(userWithValidPassword),
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('email', 'test@example.com');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword', rememberMe: false };

      userModel.findOne = () => ({
        select: () => Promise.resolve(null),
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for locked account', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123', rememberMe: false };
      const lockedUser = { ...mockUser, lockUntil: new Date(Date.now() + 60000) };

      userModel.findOne = () => ({
        select: () => Promise.resolve(lockedUser),
      });

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });
  });
});
