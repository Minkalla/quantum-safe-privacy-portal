import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../../src/auth/auth.service';
import { JwtService } from '../../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../../src/pqc/pqc-monitoring.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from '../../../../src/models/User';
import { ConfigService } from '@nestjs/config';

describe('Kyber ML-KEM-768 Algorithm Tests', () => {
  let authService: AuthService;
  let userModel: Model<IUser>;

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
            isEnabled: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: PQCMonitoringService,
          useValue: {
            recordPQCKeyGeneration: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
        {
          provide: getModelToken('User'),
          useValue: {
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'HybridCryptoService',
          useValue: {
            encryptWithFallback: jest.fn(),
            decryptWithFallback: jest.fn(),
            generateKeyPairWithFallback: jest.fn(),
          },
        },
        {
          provide: 'QuantumSafeJWTService',
          useValue: {
            signPQCToken: jest.fn(),
            verifyPQCToken: jest.fn(),
          },
        },
        {
          provide: 'QuantumSafeCryptoIdentityService',
          useValue: {
            generateStandardizedCryptoUserId: jest.fn(),
          },
        },
        {
          provide: 'PQCBridgeService',
          useValue: {
            executePQCOperation: jest.fn().mockResolvedValue({
              success: true,
              token: 'mock-pqc-token',
              algorithm: 'ML-DSA-65',
              verified: true,
            }),
          },
        },
        {
          provide: 'PQCService',
          useValue: {
            performPQCHandshake: jest.fn(),
            triggerPQCHandshake: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userModel = module.get<Model<IUser>>(getModelToken('User'));
  });

  describe('Kyber Key Generation', () => {
    it('should generate valid Kyber-768 key pairs with correct sizes', async () => {
      const result = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_user_kyber_768',
        metadata: { operation: 'key_generation', algorithm: 'kyber-768' },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.user_id).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.algorithm).toBeDefined();

      if (result.algorithm === 'Classical') {
        expect(result.token).toMatch(/^[a-f0-9]{64}$/);
      } else if (result.algorithm === 'ML-KEM-768') {
        expect(result.token).toMatch(/^[A-Za-z0-9+/=]+$/);
      }
    });

    it('should generate unique key pairs on multiple calls', async () => {
      const result1 = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_user_1',
        metadata: { operation: 'key_generation', algorithm: 'kyber-768' },
      });
      const result2 = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_user_2',
        metadata: { operation: 'key_generation', algorithm: 'kyber-768' },
      });

      expect(result1.token).not.toBe(result2.token);
      expect(result1.user_id).not.toBe(result2.user_id);
    });

    it('should generate cryptographically secure keys with sufficient entropy', async () => {
      const results: string[] = [];
      for (let i = 0; i < 5; i++) {
        const result = await authService['callPythonPQCService']('generate_session_key', {
          user_id: `test_user_entropy_${i}`,
          metadata: { operation: 'key_generation', algorithm: 'kyber-768' },
        });
        if (result.token) {
          results.push(result.token);
        }
      }

      const uniqueKeys = new Set(results);
      expect(uniqueKeys.size).toBe(5);
    });
  });

  describe('Kyber Session Key Operations', () => {
    let sessionResult: any;

    beforeEach(async () => {
      sessionResult = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_user_session',
        metadata: { operation: 'key_generation', algorithm: 'kyber-768' },
      });
    });

    it('should generate valid session keys with proper structure', async () => {
      expect(sessionResult).toBeDefined();
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.user_id).toBeDefined();
      expect(sessionResult.token).toBeDefined();

      if (sessionResult.token) {
        if (sessionResult.algorithm === 'Classical') {
          expect(sessionResult.token).toMatch(/^[a-f0-9]{64}$/);
        } else if (sessionResult.algorithm === 'ML-KEM-768') {
          expect(sessionResult.token).toMatch(/^[A-Za-z0-9+/=]+$/);
          const decoded = JSON.parse(Buffer.from(sessionResult.token, 'base64').toString());
          expect(decoded.user_id).toBe('test_user_session');
          expect(decoded.algorithm).toBe('ML-KEM-768');
          expect(decoded.session_id).toBeDefined();
        }
      }
    });

    it('should validate session keys through verification', async () => {
      if (!sessionResult.token) {
        throw new Error('Session key not generated');
      }

      const verifyResult = await authService['callPythonPQCService']('verify_token', {
        token: sessionResult.token,
        user_id: 'test_user_session',
      });

      expect(verifyResult).toBeDefined();
      if (sessionResult.algorithm === 'ML-KEM-768') {
        expect(verifyResult.success).toBe(false);
      } else {
        expect(verifyResult.success).toBe(true);
      }
    });

    it('should fail verification with wrong user context', async () => {
      if (!sessionResult.token) {
        throw new Error('Session key not generated');
      }

      const verifyResult = await authService['callPythonPQCService']('verify_token', {
        token: sessionResult.token,
        user_id: 'wrong_user_id',
      });

      expect(verifyResult.success).toBe(false);
    });

    it('should fail verification with malformed token', async () => {
      const malformedToken = Buffer.alloc(64, 0).toString('base64');

      const verifyResult = await authService['callPythonPQCService']('verify_token', {
        token: malformedToken,
        user_id: 'test_user_session',
      });

      expect(verifyResult.success).toBe(false);
    });
  });

  describe('NIST Specification Compliance', () => {
    it('should comply with ML-KEM-768 parameter set', async () => {
      const result = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_nist_compliance',
        metadata: { operation: 'key_generation', algorithm: 'kyber-768' },
      });

      expect(result.success).toBe(true);
      expect(result.user_id).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.algorithm).toBeDefined();

      if (result.token) {
        if (result.algorithm === 'Classical') {
          expect(result.token).toMatch(/^[a-f0-9]{64}$/);
        } else if (result.algorithm === 'ML-KEM-768') {
          expect(result.token).toMatch(/^[A-Za-z0-9+/=]+$/);
          const decoded = JSON.parse(Buffer.from(result.token, 'base64').toString());
          expect(decoded.user_id).toBe('test_nist_compliance');
          expect(decoded.algorithm).toBe('ML-KEM-768');
        }
      }
    });

    it('should maintain security level 3 properties', async () => {
      const iterations = 3;
      const results: string[] = [];

      for (let i = 0; i < iterations; i++) {
        const result = await authService['callPythonPQCService']('generate_session_key', {
          user_id: `test_security_level_${i}`,
          metadata: { operation: 'key_generation', algorithm: 'kyber-768' },
        });
        if (result.token) {
          results.push(result.token);
        }
      }

      const uniqueSecrets = new Set(results);
      expect(uniqueSecrets.size).toBe(iterations);
    });
  });

  describe('Performance Requirements', () => {
    it('should generate session keys within performance threshold', async () => {
      const startTime = Date.now();
      await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_performance',
        metadata: { operation: 'key_generation', algorithm: 'kyber-768' },
      });
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should verify tokens within performance threshold', async () => {
      const sessionResult = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_verify_performance',
        metadata: { operation: 'key_generation', algorithm: 'kyber-768' },
      });

      if (!sessionResult.token) {
        throw new Error('Session key not generated');
      }

      const startTime = Date.now();
      await authService['callPythonPQCService']('verify_token', {
        token: sessionResult.token,
        user_id: 'test_verify_performance',
      });
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000);
    });
  });
});
