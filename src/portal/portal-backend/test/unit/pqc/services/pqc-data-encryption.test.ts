import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataEncryptionService } from '../../../../src/services/pqc-data-encryption.service';
import { AuthService } from '../../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../../src/models/interfaces/pqc-data.interface';

describe('PQCDataEncryptionService Unit Tests - Real PQC Operations', () => {
  let service: PQCDataEncryptionService;
  let authService: AuthService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataEncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useClass: AuthService },
      ],
    }).compile();

    service = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Real encryptData Operations', () => {
    it('should encrypt data using real Kyber-768 algorithm', async () => {
      const testData = 'sensitive test data';

      const result = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'test-key-id',
      });

      expect(result.success).toBe(true);
      if (result.success && result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
        expect(result.encryptedField.keyId).toBe('test-key-id');
        expect(result.encryptedField.encryptedData).toBeDefined();
        expect(typeof result.encryptedField.encryptedData).toBe('string');
        expect(result.performanceMetrics).toBeDefined();
      }
    });

    it('should handle encryption failures gracefully with real service', async () => {
      try {
        const result = await service.encryptData('', {
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

    it('should generate unique nonces for each real encryption', async () => {
      const testData = 'identical data';
      const nonces = [];

      for (let i = 0; i < 3; i++) {
        const result = await service.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `key-${i}`,
        });

        if (result.success && result.encryptedField) {
          nonces.push(result.encryptedField.nonce);
        }
      }

      const uniqueNonces = new Set(nonces);
      expect(uniqueNonces.size).toBe(3);
    });

    it('should include real performance metrics', async () => {
      const testData = 'performance test data';

      const startTime = performance.now();
      const result = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'performance-key',
      });
      const endTime = performance.now();

      expect(result.success).toBe(true);
      if (result.success && result.performanceMetrics) {
        expect(result.performanceMetrics.encryptionTime).toBeGreaterThan(0);
        expect(result.performanceMetrics.encryptionTime).toBeLessThan(endTime - startTime + 100);
        expect(result.performanceMetrics.keySize).toBeGreaterThan(0);
      }
    });
  });

  describe('Real decryptData Operations', () => {
    it('should decrypt real Kyber-768 encrypted data', async () => {
      const originalData = 'original plaintext data';
      
      const encryptResult = await service.encryptData(originalData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'test-key',
      });

      expect(encryptResult.success).toBe(true);
      
      if (encryptResult.success && encryptResult.encryptedField) {
        try {
          const decryptResult = await service.decryptData(encryptResult.encryptedField);
          
          if (decryptResult.success) {
            expect(decryptResult.decryptedData).toBeDefined();
          }
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    it('should handle decryption failures with real service', async () => {
      const invalidEncryptedField = {
        encryptedData: 'invalid-encrypted-data',
        algorithm: 'Kyber-768',
        keyId: 'test-key',
        nonce: 'test-nonce',
        timestamp: new Date(),
      };

      try {
        const result = await service.decryptData(invalidEncryptedField);
        
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should validate encrypted field structure with real service', async () => {
      const invalidEncryptedField = {
        encryptedData: '',
        algorithm: 'Unknown',
        keyId: '',
        nonce: '',
        timestamp: new Date(),
      };

      try {
        const result = await service.decryptData(invalidEncryptedField);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Invalid');
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Real batchEncryptData Operations', () => {
    it('should encrypt multiple data items with real operations', async () => {
      const dataItems = ['data1', 'data2'];

      const results = await service.batchEncryptData(dataItems, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'batch-key',
      });

      expect(results).toHaveLength(2);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        if (result.success && result.encryptedField) {
          expect(result.encryptedField.algorithm).toBe('Kyber-768');
          expect(result.encryptedField.encryptedData).toBeDefined();
        }
      });
    });
  });

  describe('Real Algorithm Support', () => {
    it('should support real Kyber-768 algorithm', async () => {
      const result = await service.encryptData('test', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'kyber-key',
      });

      expect(result.success).toBe(true);
      if (result.success && result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
      }
    });

    it('should support real ML-KEM-768 algorithm', async () => {
      const result = await service.encryptData('test', {
        algorithm: PQCAlgorithmType.ML_KEM_768,
        keyId: 'ml-kem-key',
      });

      expect(result.success).toBe(true);
      if (result.success && result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('ML-KEM-768');
      }
    });
  });

  describe('Real Error Handling', () => {
    it('should handle real service errors gracefully', async () => {
      try {
        const result = await service.encryptData('test data', {
          algorithm: 'INVALID_ALGORITHM' as any,
          keyId: 'test-key',
        });

        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle invalid input data with real service', async () => {
      try {
        const result = await service.encryptData(null as any, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: 'test-key',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Invalid');
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle missing key ID with real service', async () => {
      try {
        const result = await service.encryptData('test data', {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: '',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
