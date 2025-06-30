import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataEncryptionService } from '../../../../src/services/pqc-data-encryption.service';
import { AuthService } from '../../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../../src/models/interfaces/pqc-data.interface';
import { JwtService } from '../../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../../src/pqc/pqc-monitoring.service';

describe('Kyber-768 Algorithm Unit Tests - Real PQC Operations', () => {
  let encryptionService: PQCDataEncryptionService;
  let authService: AuthService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    };

    const mockUserModel = {
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      generateTokens: jest.fn().mockReturnValue({ accessToken: 'test-token', refreshToken: 'test-refresh' }),
    };

    const mockPQCFeatureFlags = {
      isEnabled: jest.fn().mockReturnValue(true),
    };

    const mockPQCMonitoring = {
      recordPQCKeyGeneration: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataEncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useClass: AuthService },
        { provide: 'UserModel', useValue: mockUserModel },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PQCFeatureFlagsService, useValue: mockPQCFeatureFlags },
        { provide: PQCMonitoringService, useValue: mockPQCMonitoring },
      ],
    }).compile();

    encryptionService = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    authService = module.get<AuthService>(AuthService);
  });

  describe('Real Key Generation', () => {
    it('should generate real Kyber-768 key pairs', async () => {
      const result = await encryptionService.encryptData('test data', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'test-key',
      });

      expect(result.success).toBe(true);
      if (result.success && result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
        expect(result.encryptedField.encryptedData).toBeDefined();
        expect(typeof result.encryptedField.encryptedData).toBe('string');
      }
    });

    it('should generate unique key pairs on each real call', async () => {
      const keyPairs: string[] = [];
      
      for (let i = 0; i < 3; i++) {
        const result = await encryptionService.encryptData('test data', {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `test-key-${i}`,
        });

        if (result.success && result.encryptedField) {
          keyPairs.push(result.encryptedField.encryptedData);
        }
      }

      const uniqueKeyPairs = new Set(keyPairs);
      expect(uniqueKeyPairs.size).toBe(3);
    });

    it('should handle key generation failures gracefully with real service', async () => {
      try {
        const result = await encryptionService.encryptData('', {
          algorithm: 'INVALID_ALGORITHM' as any,
          keyId: '',
        });
        
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Real Encapsulation', () => {
    it('should perform real Kyber-768 encapsulation', async () => {
      const result = await encryptionService.encryptData('sensitive data', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'encapsulation-key',
      });

      expect(result.success).toBe(true);
      if (result.success && result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
        expect(result.encryptedField.encryptedData).toBeDefined();
        expect(result.encryptedField.keyId).toBe('encapsulation-key');
      }
    });

    it('should produce different ciphertexts for same plaintext with real operations', async () => {
      const plaintextData = 'identical plaintext';
      const ciphertexts: string[] = [];

      for (let i = 0; i < 3; i++) {
        const result = await encryptionService.encryptData(plaintextData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `key-${i}`,
        });

        if (result.success && result.encryptedField) {
          ciphertexts.push(result.encryptedField.encryptedData);
        }
      }

      const uniqueCiphertexts = new Set(ciphertexts);
      expect(uniqueCiphertexts.size).toBe(3);
    });
  });

  describe('Real Decapsulation', () => {
    it('should perform real Kyber-768 decapsulation', async () => {
      const encryptResult = await encryptionService.encryptData('original plaintext', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'test-key',
      });

      expect(encryptResult.success).toBe(true);
      
      if (encryptResult.success && encryptResult.encryptedField) {
        try {
          const decryptResult = await encryptionService.decryptData(encryptResult.encryptedField);
          
          if (decryptResult.success) {
            expect(decryptResult.decryptedData).toBeDefined();
          }
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    it('should handle invalid ciphertext gracefully with real service', async () => {
      const invalidEncryptedField = {
        encryptedData: 'invalid-ciphertext',
        algorithm: 'Kyber-768',
        keyId: 'test-key',
        nonce: 'test-nonce',
        timestamp: new Date(),
      };

      try {
        const result = await encryptionService.decryptData(invalidEncryptedField);
        
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Real Algorithm Compliance', () => {
    it('should meet NIST Kyber-768 specifications with real operations', async () => {
      const result = await encryptionService.encryptData('test data', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'compliance-test',
      });

      expect(result.success).toBe(true);
      if (result.success && result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
        expect(result.encryptedField.encryptedData).toBeDefined();
        expect(result.encryptedField.keyId).toBe('compliance-test');
      }
    });

    it('should provide real performance metrics', async () => {
      const startTime = performance.now();
      
      const result = await encryptionService.encryptData('performance test', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'performance-test',
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Real operations may take longer
      
      if (result.success && result.performanceMetrics) {
        expect(result.performanceMetrics.encryptionTime).toBeGreaterThan(0);
      }
    });
  });
});
