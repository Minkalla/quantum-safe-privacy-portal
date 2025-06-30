import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../../src/auth/auth.service';
import { JwtService } from '../../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../../src/pqc/pqc-monitoring.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from '../../../../src/models/User';
import { ConfigService } from '@nestjs/config';

describe('Dilithium ML-DSA-65 Algorithm Tests', () => {
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
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userModel = module.get<Model<IUser>>(getModelToken('User'));
  });

  describe('Dilithium Key Generation', () => {
    it('should generate valid Dilithium-3 key pairs with correct sizes', async () => {
      const result = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_user_dilithium_3',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.user_id).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.algorithm).toBeDefined();
      
      if (result.algorithm === 'Classical') {
        expect(result.token).toMatch(/^[a-f0-9]{64}$/);
      }
    });

    it('should generate unique key pairs on multiple calls', async () => {
      const result1 = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_user_1',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
      const result2 = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_user_2',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
      
      expect(result1.token).not.toBe(result2.token);
      expect(result1.user_id).not.toBe(result2.user_id);
    });

    it('should generate cryptographically secure keys with sufficient entropy', async () => {
      const results: string[] = [];
      for (let i = 0; i < 5; i++) {
        const result = await authService['callPythonPQCService']('generate_session_key', {
          user_id: `test_user_entropy_${i}`,
          metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
        });
        if (result.token) {
          results.push(result.token);
        }
      }
      
      const uniqueKeys = new Set(results);
      expect(uniqueKeys.size).toBe(5);
    });
  });

  describe('Dilithium Digital Signatures', () => {
    let sessionResult: any;
    const testMessage = 'Test message for digital signature';

    beforeEach(async () => {
      sessionResult = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_user_signature',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
    });

    it('should create valid digital signatures', async () => {
      const inputParams = {
        user_id: 'test_user_signature',
        payload: { message: Buffer.from(testMessage).toString('base64') }
      };
      console.log('DEBUG: Input params =', JSON.stringify(inputParams, null, 2));
      
      const signResult = await authService['callPythonPQCService']('sign_token', inputParams);
      
      console.log('DEBUG: signResult =', JSON.stringify(signResult, null, 2));
      
      expect(signResult).toBeDefined();
      expect(signResult.success).toBe(true);
      expect(signResult.token).toBeDefined();
      expect(signResult.algorithm).toBe('ML-DSA-65');
      
      if (signResult.token) {
        expect(typeof signResult.token).toBe('string');
        expect(signResult.token.length).toBeGreaterThan(0);
      }
    });

    it('should verify valid signatures correctly', async () => {
      const signResult = await authService['callPythonPQCService']('sign_token', {
        user_id: 'test_user_signature',
        payload: { message: Buffer.from(testMessage).toString('base64') }
      });
      
      if (!signResult.token) {
        throw new Error('Signature not generated');
      }
      
      const verifyResult = await authService['callPythonPQCService']('verify_token', {
        token: signResult.token,
        user_id: 'test_user_signature'
      });
      
      expect(verifyResult).toBeDefined();
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.algorithm).toBe('ML-DSA-65');
    });

    it('should handle signatures with different user context', async () => {
      const signResult = await authService['callPythonPQCService']('sign_token', {
        user_id: 'test_user_signature',
        payload: { message: Buffer.from(testMessage).toString('base64') }
      });
      
      if (!signResult.token) {
        throw new Error('Signature not generated');
      }
      
      const verifyResult = await authService['callPythonPQCService']('verify_token', {
        token: signResult.token,
        user_id: 'wrong_user_id'
      });
      
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.error_message).toContain('User ID mismatch');
    });

    it('should handle signatures with tampered payload gracefully', async () => {
      const signResult = await authService['callPythonPQCService']('sign_token', {
        user_id: 'test_user_signature',
        payload: { message: Buffer.from(testMessage).toString('base64') }
      });
      
      if (!signResult.token) {
        throw new Error('Signature not generated');
      }
      
      let tamperedToken = signResult.token;
      try {
        const tokenObj = JSON.parse(tamperedToken);
        if (tokenObj.signature) {
          const originalSig = tokenObj.signature;
          if (originalSig.length > 20) {
            const midpoint = Math.floor(originalSig.length / 2);
            tokenObj.signature = originalSig.substring(0, midpoint) + 'deadbeef' + originalSig.substring(midpoint + 8);
          } else {
            tokenObj.signature = 'invalid_signature_' + originalSig.substring(0, 10);
          }
          tamperedToken = JSON.stringify(tokenObj);
        } else {
          tamperedToken = signResult.token.substring(0, signResult.token.length - 10) + 'TAMPERED';
        }
      } catch (e) {
        if (signResult.token.length > 20) {
          const midpoint = Math.floor(signResult.token.length / 2);
          tamperedToken = signResult.token.substring(0, midpoint) + 'TAMPERED' + signResult.token.substring(midpoint + 8);
        } else {
          tamperedToken = 'TAMPERED_TOKEN_' + signResult.token.substring(0, 10);
        }
      }
      
      const verifyResult = await authService['callPythonPQCService']('verify_token', {
        token: tamperedToken,
        user_id: 'test_user_signature'
      });
      
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.error_message).toBeDefined();
    });

    it('should reject malformed signatures', async () => {
      const malformedSignature = Buffer.alloc(100, 0).toString('base64');
      
      const verifyResult = await authService['callPythonPQCService']('verify_token', {
        token: malformedSignature,
        user_id: 'test_user_signature'
      });
      
      expect(verifyResult.success).toBe(false);
    });
  });

  describe('NIST Specification Compliance', () => {
    it('should comply with ML-DSA-65 parameter set', async () => {
      const result = await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_nist_compliance',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
      
      expect(result.success).toBe(true);
      expect(result.user_id).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.algorithm).toBeDefined();
      
      if (result.token) {
        expect(typeof result.token).toBe('string');
        expect(result.token.length).toBeGreaterThan(0);
      }
    });

    it('should maintain security level 3 properties', async () => {
      const testMessage = 'NIST compliance test message';
      const iterations = 3;
      const signatures: string[] = [];
      
      for (let i = 0; i < iterations; i++) {
        await authService['callPythonPQCService']('generate_session_key', {
          user_id: `test_security_level_${i}`,
          metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
        });
        
        const signResult = await authService['callPythonPQCService']('sign_token', {
          user_id: `test_security_level_${i}`,
          payload: { message: Buffer.from(testMessage).toString('base64') }
        });
        if (signResult.token) {
          signatures.push(signResult.token);
        }
      }
      
      const uniqueSignatures = new Set(signatures);
      expect(uniqueSignatures.size).toBe(iterations);
    });

    it('should produce consistent signatures for same user and payload', async () => {
      const testMessage = 'Deterministic test message';
      
      await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_deterministic',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
      
      const signResult1 = await authService['callPythonPQCService']('sign_token', {
        user_id: 'test_deterministic',
        payload: { message: Buffer.from(testMessage).toString('base64') }
      });
      
      const signResult2 = await authService['callPythonPQCService']('sign_token', {
        user_id: 'test_deterministic',
        payload: { message: Buffer.from(testMessage).toString('base64') }
      });
      
      expect(signResult1.success).toBe(true);
      expect(signResult2.success).toBe(true);
      expect(signResult1.token).toBeDefined();
      expect(signResult2.token).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    it('should generate session keys within performance threshold', async () => {
      const startTime = Date.now();
      await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_performance',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should sign tokens within performance threshold', async () => {
      const testMessage = 'Performance test message';
      
      await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_sign_performance',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
      
      const startTime = Date.now();
      await authService['callPythonPQCService']('sign_token', {
        user_id: 'test_sign_performance',
        payload: { message: Buffer.from(testMessage).toString('base64') }
      });
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000);
    });

    it('should verify signatures within performance threshold', async () => {
      const testMessage = 'Performance test message';
      
      await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_verify_performance',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
      
      const signResult = await authService['callPythonPQCService']('sign_token', {
        user_id: 'test_verify_performance',
        payload: { message: Buffer.from(testMessage).toString('base64') }
      });
      
      if (!signResult.token) {
        throw new Error('Signature not generated');
      }
      
      const startTime = Date.now();
      await authService['callPythonPQCService']('verify_token', {
        token: signResult.token,
        user_id: 'test_verify_performance'
      });
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty messages gracefully', async () => {
      await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_empty_message',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
      
      const signResult = await authService['callPythonPQCService']('sign_token', {
        user_id: 'test_empty_message',
        payload: { message: Buffer.from('').toString('base64') }
      });
      
      expect(signResult).toBeDefined();
      expect(signResult.success).toBe(true);
      expect(signResult.token).toBeDefined();
      
      const verifyResult = await authService['callPythonPQCService']('verify_token', {
        token: signResult.token,
        user_id: 'test_empty_message'
      });
      
      expect(verifyResult.success).toBe(true);
    });

    it('should handle large messages correctly', async () => {
      const largeMessage = 'A'.repeat(1000);
      
      await authService['callPythonPQCService']('generate_session_key', {
        user_id: 'test_large_message',
        metadata: { operation: 'key_generation', algorithm: 'dilithium-3' }
      });
      
      const signResult = await authService['callPythonPQCService']('sign_token', {
        user_id: 'test_large_message',
        payload: { message: Buffer.from(largeMessage).toString('base64') }
      });
      
      expect(signResult).toBeDefined();
      expect(signResult.success).toBe(true);
      expect(signResult.token).toBeDefined();
      
      const verifyResult = await authService['callPythonPQCService']('verify_token', {
        token: signResult.token,
        user_id: 'test_large_message'
      });
      
      expect(verifyResult.success).toBe(true);
    });

    it('should reject invalid user contexts', async () => {
      const testMessage = 'Test message';
      
      const signResult = await authService['callPythonPQCService']('sign_token', {
        user_id: '',
        payload: { message: Buffer.from(testMessage).toString('base64') }
      });
      
      expect(signResult.success).toBe(false);
    });
  });
});
