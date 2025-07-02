import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataEncryptionService } from '../../../../src/services/pqc-data-encryption.service';
import { AuthService } from '../../../../src/auth/auth.service';
import { JwtService } from '../../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../../src/pqc/pqc-monitoring.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from '../../../../src/models/User';
import { PQCAlgorithmType } from '../../../../src/models/interfaces/pqc-data.interface';

describe('PQCDataEncryptionService', () => {
  let service: PQCDataEncryptionService;
  let authService: AuthService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataEncryptionService,
        {
          provide: AuthService,
          useValue: {
            callPQCService: jest.fn(),
            callPythonPQCService: jest.fn(),
            executePQCServiceCall: jest.fn().mockResolvedValue({
              success: true,
              token: 'mock-pqc-token',
              algorithm: 'ML-DSA-65',
              verified: true,
            }),
          },
        },
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
            get: jest.fn((key: string) => {
              const config = {
                'ENCRYPTION_PASSWORD': 'test-encryption-password-for-unit-tests',
                'pqc.enabled': true,
                'pqc.fallback_enabled': true,
              };
              return config[key];
            }),
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
          provide: 'PQCBridgeService',
          useValue: {
            executePQCOperation: jest.fn(),
          },
        },
        {
          provide: 'QuantumSafeCryptoIdentityService',
          useValue: {
            generateStandardizedCryptoUserId: jest.fn(),
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

    service = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Data Encryption with Kyber-768', () => {
    it('should encrypt data successfully with ML-KEM-768', async () => {
      const testData = {
        sensitive: 'confidential information',
        userId: 'test_user_encryption',
        timestamp: new Date().toISOString(),
      };

      const result = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'test_user_encryption',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.encryptedField).toBeDefined();

      if (result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
        expect(result.encryptedField.encryptedData).toBeDefined();
        expect(result.encryptedField.keyId).toBeDefined();
        expect(result.encryptedField.nonce).toBeDefined();
        expect(result.encryptedField.timestamp).toBeDefined();
      }

      expect(result.performanceMetrics).toBeDefined();
      if (result.performanceMetrics) {
        expect(result.performanceMetrics.encryptionTime).toBeGreaterThan(0);
      }
    });

    it('should decrypt ML-KEM-768 encrypted data successfully', async () => {
      const testData = {
        userId: 'test_user_decrypt',
        content: 'test content for decryption',
        metadata: { type: 'test', version: '1.0' },
      };

      const encryptResult = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'test_user_decrypt',
      });

      expect(encryptResult.success).toBe(true);
      expect(encryptResult.encryptedField).toBeDefined();

      if (encryptResult.encryptedField) {
        const decryptResult = await service.decryptData(encryptResult.encryptedField);

        expect(decryptResult).toBeDefined();
        expect(decryptResult.success).toBe(true);
        expect(decryptResult.decryptedData).toBeDefined();
        expect(decryptResult.performanceMetrics).toBeDefined();

        if (decryptResult.performanceMetrics) {
          expect(decryptResult.performanceMetrics.decryptionTime).toBeGreaterThan(0);
        }
      }
    });

    it('should handle large data payloads with ML-KEM-768', async () => {
      const largeData = {
        userId: 'test_user_large',
        content: 'x'.repeat(5000),
        metadata: Array.from({ length: 50 }, (_, i) => ({ id: i, value: `data_${i}` })),
      };

      const encryptResult = await service.encryptData(largeData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'test_user_large',
      });

      expect(encryptResult.success).toBe(true);
      expect(encryptResult.encryptedField).toBeDefined();

      if (encryptResult.encryptedField) {
        expect(encryptResult.encryptedField.algorithm).toBe('Kyber-768');

        const decryptResult = await service.decryptData(encryptResult.encryptedField);

        expect(decryptResult.success).toBe(true);
        expect(decryptResult.decryptedData).toBeDefined();
      }
    });
  });

  describe('Data Encryption with AES-256-GCM Fallback', () => {
    it('should encrypt and decrypt data with AES-256-GCM', async () => {
      const testData = {
        sensitive: 'fallback information',
        userId: 'test_user_classical',
      };

      const encryptResult = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.AES_256_GCM,
        userId: 'test_user_classical',
      });

      expect(encryptResult.success).toBe(true);
      expect(encryptResult.encryptedField).toBeDefined();

      if (encryptResult.encryptedField) {
        expect(encryptResult.encryptedField.algorithm).toBe('AES-256-GCM');
        expect(encryptResult.encryptedField.encryptedData).toBeDefined();

        const decryptResult = await service.decryptData(encryptResult.encryptedField);

        expect(decryptResult.success).toBe(true);
        expect(decryptResult.decryptedData).toBeDefined();
      }
    });

    it('should handle AES encryption with custom key ID', async () => {
      const testData = { message: 'custom key test' };
      const customKeyId = 'custom-test-key-123';

      const encryptResult = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.AES_256_GCM,
        keyId: customKeyId,
        userId: 'test_custom_key',
      });

      expect(encryptResult.success).toBe(true);
      expect(encryptResult.encryptedField).toBeDefined();

      if (encryptResult.encryptedField) {
        expect(encryptResult.encryptedField.keyId).toBe(customKeyId);

        const decryptResult = await service.decryptData(encryptResult.encryptedField);

        expect(decryptResult.success).toBe(true);
        expect(decryptResult.decryptedData).toEqual(testData);
      }
    });
  });

  describe('Key Management', () => {
    it('should generate unique encryption keys for different operations', async () => {
      const testData = { message: 'test' };

      const result1 = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'user1',
      });

      const result2 = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'user2',
      });

      expect(result1.encryptedField).toBeDefined();
      expect(result2.encryptedField).toBeDefined();

      if (result1.encryptedField && result2.encryptedField) {
        expect(result1.encryptedField.keyId).not.toBe(result2.encryptedField.keyId);
        expect(result1.encryptedField.encryptedData).not.toBe(result2.encryptedField.encryptedData);
      }
    });

    it('should handle key rotation gracefully', async () => {
      const oldKeyId = 'old-key-123';
      const newKeyId = 'new-key-456';

      const rotationResult = await service.rotateEncryptionKey(oldKeyId, newKeyId);

      expect(rotationResult).toBe(true);
    });

    it('should validate encrypted data integrity', async () => {
      const testData = { userId: 'validation_test', data: 'integrity test' };

      const encryptResult = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'validation_test',
      });

      expect(encryptResult.success).toBe(true);
      expect(encryptResult.encryptedField).toBeDefined();

      if (encryptResult.encryptedField) {
        const validationResult = await service.validateEncryptedData(encryptResult.encryptedField);

        expect(validationResult).toBe(true);
      }
    });
  });

  describe('Performance and Monitoring', () => {
    it('should complete ML-KEM-768 encryption within performance threshold', async () => {
      const testData = { userId: 'perf_test', data: 'performance test' };

      const startTime = Date.now();
      const result = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'perf_test',
      });
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(10000);
      expect(result.performanceMetrics).toBeDefined();

      if (result.performanceMetrics) {
        expect(result.performanceMetrics.encryptionTime).toBeLessThan(10000);
      }
    });

    it('should complete AES-256-GCM encryption within performance threshold', async () => {
      const testData = { userId: 'perf_test_aes', data: 'aes performance test' };

      const startTime = Date.now();
      const result = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.AES_256_GCM,
        userId: 'perf_test_aes',
      });
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(5000);
      expect(result.performanceMetrics).toBeDefined();

      if (result.performanceMetrics) {
        expect(result.performanceMetrics.encryptionTime).toBeLessThan(5000);
      }
    });

    it('should complete decryption within performance threshold', async () => {
      const testData = { userId: 'perf_decrypt', data: 'decryption performance test' };

      const encryptResult = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'perf_decrypt',
      });

      expect(encryptResult.encryptedField).toBeDefined();

      if (encryptResult.encryptedField) {
        const startTime = Date.now();
        const decryptResult = await service.decryptData(encryptResult.encryptedField);
        const decryptionTime = Date.now() - startTime;

        expect(decryptionTime).toBeLessThan(8000);
        expect(decryptResult.performanceMetrics).toBeDefined();

        if (decryptResult.performanceMetrics) {
          expect(decryptResult.performanceMetrics.decryptionTime).toBeLessThan(8000);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed encrypted data gracefully', async () => {
      const malformedData = {
        encryptedData: 'invalid_encrypted_data',
        algorithm: 'KYBER_768',
        keyId: 'invalid_key',
        nonce: 'invalid_nonce',
        timestamp: new Date(),
        metadata: {},
      };

      const result = await service.decryptData(malformedData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty data gracefully', async () => {
      const emptyData = {};

      const result = await service.encryptData(emptyData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'test_empty',
      });

      expect(result.success).toBe(true);
      expect(result.encryptedField).toBeDefined();
    });

    it('should handle encryption failures gracefully', async () => {
      const testData = { message: 'test' };

      const result = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: '',
      });

      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        expect(result.encryptedField).toBeDefined();
      }
    });

    it('should handle AES decryption with invalid format', async () => {
      const invalidAESData = {
        encryptedData: 'invalid:format',
        algorithm: 'AES_256_GCM',
        keyId: 'test-key',
        nonce: 'test-nonce',
        timestamp: new Date(),
        metadata: {},
      };

      const result = await service.decryptData(invalidAESData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid encrypted data format');
    });
  });
});
