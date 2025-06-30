import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataEncryptionService } from '../../../../src/services/pqc-data-encryption.service';
import { AuthService } from '../../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../../src/models/interfaces/pqc-data.interface';

describe('PQCDataEncryptionService Unit Tests', () => {
  let service: PQCDataEncryptionService;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    };

    const mockAuthService = {
      callPythonPQCService: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataEncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encryptData', () => {
    it('should encrypt data using Kyber-768 algorithm', async () => {
      const testData = 'sensitive test data';
      const mockPQCResult = {
        success: true,
        session_data: {
          ciphertext: 'kyber-768-encrypted-data',
          shared_secret: 'shared-secret-key',
        },
      };

      authService.callPythonPQCService.mockResolvedValue(mockPQCResult);

      const result = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'test-key-id',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
        expect(result.encryptedField.keyId).toBe('test-key-id');
        expect(result.encryptedField.encryptedData).toBeDefined();
        expect(result.performanceMetrics).toBeDefined();
      }
    });

    it('should handle encryption failures gracefully', async () => {
      const testData = 'test data';
      authService.callPythonPQCService.mockResolvedValue({
        success: false,
        error_message: 'Encryption failed',
      });

      const result = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Encryption failed');
    });

    it('should generate unique nonces for each encryption', async () => {
      const testData = 'identical data';
      const nonces = [];

      for (let i = 0; i < 3; i++) {
        authService.callPythonPQCService.mockResolvedValueOnce({
          success: true,
          session_data: {
            ciphertext: `encrypted-data-${i}`,
            shared_secret: `secret-${i}`,
          },
        });

        const result = await service.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `key-${i}`,
        });

        if (result.success) {
          nonces.push(result.encryptedField.nonce);
        }
      }

      const uniqueNonces = new Set(nonces);
      expect(uniqueNonces.size).toBe(3);
    });

    it('should include performance metrics', async () => {
      const testData = 'performance test data';
      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        session_data: {
          ciphertext: 'encrypted-data',
          shared_secret: 'shared-secret',
        },
      });

      const startTime = Date.now();
      const result = await service.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'performance-key',
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.performanceMetrics.encryptionTime).toBeLessThan(endTime - startTime + 10);
        expect(result.performanceMetrics.keySize).toBeGreaterThan(0);
      }
    });
  });

  describe('decryptData', () => {
    it('should decrypt Kyber-768 encrypted data', async () => {
      const encryptedField = {
        encryptedData: 'kyber-768-encrypted-data',
        algorithm: 'Kyber-768',
        keyId: 'test-key',
        nonce: 'test-nonce',
        timestamp: new Date(),
      };

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        decrypted_data: 'original plaintext data',
      });

      const result = await service.decryptData(encryptedField);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.decryptedData).toBe('original plaintext data');
      }
    });

    it('should handle decryption failures', async () => {
      const encryptedField = {
        encryptedData: 'invalid-encrypted-data',
        algorithm: 'Kyber-768',
        keyId: 'test-key',
        nonce: 'test-nonce',
        timestamp: new Date(),
      };

      authService.callPythonPQCService.mockResolvedValue({
        success: false,
        error_message: 'Decryption failed',
      });

      const result = await service.decryptData(encryptedField);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Decryption failed');
    });

    it('should validate encrypted field structure', async () => {
      const invalidEncryptedField = {
        encryptedData: '',
        algorithm: 'Unknown',
        keyId: '',
        nonce: '',
        timestamp: new Date(),
      };

      const result = await service.decryptData(invalidEncryptedField);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid encrypted field');
    });
  });

  describe('batchEncryptData', () => {
    it('should encrypt multiple data items', async () => {
      const dataItems = ['data1', 'data2', 'data3'];
      
      authService.callPythonPQCService.mockImplementation(() =>
        Promise.resolve({
          success: true,
          session_data: {
            ciphertext: 'batch-encrypted-data',
            shared_secret: 'batch-shared-secret',
          },
        })
      );

      const results = await service.batchEncryptData(dataItems, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'batch-key',
      });

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.encryptedField.algorithm).toBe('Kyber-768');
        }
      });
    });

    it('should handle partial failures in batch encryption', async () => {
      const dataItems = ['data1', 'data2', 'data3'];
      
      authService.callPythonPQCService
        .mockResolvedValueOnce({
          success: true,
          session_data: { ciphertext: 'encrypted1', shared_secret: 'secret1' },
        })
        .mockResolvedValueOnce({
          success: false,
          error_message: 'Encryption failed for item 2',
        })
        .mockResolvedValueOnce({
          success: true,
          session_data: { ciphertext: 'encrypted3', shared_secret: 'secret3' },
        });

      const results = await service.batchEncryptData(dataItems, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'batch-key',
      });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Algorithm Support', () => {
    it('should support Kyber-768 algorithm', async () => {
      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        session_data: {
          ciphertext: 'kyber-data',
          shared_secret: 'kyber-secret',
        },
      });

      const result = await service.encryptData('test', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'kyber-key',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
      }
    });

    it('should support ML-KEM-768 algorithm', async () => {
      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        session_data: {
          ciphertext: 'ml-kem-data',
          shared_secret: 'ml-kem-secret',
        },
      });

      const result = await service.encryptData('test', {
        algorithm: PQCAlgorithmType.ML_KEM_768,
        keyId: 'ml-kem-key',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.encryptedField.algorithm).toBe('ML-KEM-768');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      authService.callPythonPQCService.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.encryptData('test data', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
    });

    it('should handle invalid input data', async () => {
      const result = await service.encryptData(null as any, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input data');
    });

    it('should handle missing key ID', async () => {
      const result = await service.encryptData('test data', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Key ID is required');
    });
  });
});
