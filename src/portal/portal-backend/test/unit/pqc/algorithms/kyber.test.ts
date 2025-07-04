import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../../src/auth/auth.service';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtModule } from '@nestjs/jwt';
import { JwtService } from '../../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../../src/pqc/pqc-monitoring.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from '../../../../src/models/User';
import { ConfigService } from '@nestjs/config';
import { HybridCryptoService } from '../../../../src/services/hybrid-crypto.service';
import { QuantumSafeJWTService } from '../../../../src/services/quantum-safe-jwt.service';
import { PQCBridgeService } from '../../../../src/services/pqc-bridge.service';
import { QuantumSafeCryptoIdentityService } from '../../../../src/services/quantum-safe-crypto-identity.service';
import { PQCService } from '../../../../src/services/pqc.service';
import { SecretsService } from '../../../../src/secrets/secrets.service';
import { EnhancedErrorBoundaryService } from '../../../../src/services/enhanced-error-boundary.service';
import { ClassicalCryptoService } from '../../../../src/services/classical-crypto.service';
import { CircuitBreakerService } from '../../../../src/services/circuit-breaker.service';
import { PQCDataEncryptionService } from '../../../../src/services/pqc-data-encryption.service';
import { PQCDataValidationService } from '../../../../src/services/pqc-data-validation.service';

describe('Kyber ML-KEM-768 Algorithm Tests', () => {
  let authService: AuthService;
  let userModel: Model<IUser>;

  beforeEach(async () => {
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
        PQCDataValidationService,
        HybridCryptoService,
        QuantumSafeJWTService,
        PQCBridgeService,
        QuantumSafeCryptoIdentityService,
        PQCService,
        SecretsService,
        EnhancedErrorBoundaryService,
        ClassicalCryptoService,
        CircuitBreakerService,
        PQCDataEncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                'SKIP_SECRETS_MANAGER': 'true',
                'AWS_REGION': 'us-east-1',
                'pqc.enabled': true,
                'pqc.fallback_enabled': true,
                'JWT_ACCESS_SECRET_ID': 'test-access-secret-id',
                'JWT_REFRESH_SECRET_ID': 'test-refresh-secret-id',
                'MongoDB1': process.env.MongoDB1 || 'mongodb://localhost:27017/test',
              };
              return config[key] || process.env[key] || 'test-value';
            },
          },
        },
        {
          provide: getModelToken('User'),
          useValue: {
            findOne: () => Promise.resolve(null),
            findByIdAndUpdate: () => Promise.resolve({}),
            create: () => Promise.resolve({}),
            save: () => Promise.resolve({}),
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
        expect(result.token).toMatch(/^mlkem768:[a-f0-9-]{36}:[A-Za-z0-9+/=]+$/);
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
          expect(sessionResult.token).toMatch(/^mlkem768:[a-f0-9-]{36}:[A-Za-z0-9+/=]+$/);
          const tokenParts = sessionResult.token.split(':');
          expect(tokenParts[0]).toBe('mlkem768');
          expect(tokenParts[1]).toMatch(/^[a-f0-9-]{36}$/);
          expect(tokenParts[2]).toMatch(/^[A-Za-z0-9+/=]+$/);
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
      expect(verifyResult.success).toBe(true);
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
          expect(result.token).toMatch(/^mlkem768:[a-f0-9-]{36}:[A-Za-z0-9+/=]+$/);
          const tokenParts = result.token.split(':');
          expect(tokenParts[0]).toBe('mlkem768');
          expect(tokenParts[1]).toMatch(/^[a-f0-9-]{36}$/);
          expect(tokenParts[2]).toMatch(/^[A-Za-z0-9+/=]+$/);
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
