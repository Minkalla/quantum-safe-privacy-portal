import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataValidationService } from '../../../../src/services/pqc-data-validation.service';
import { AuthService } from '../../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../../src/models/interfaces/pqc-data.interface';

describe('PQCDataValidationService Unit Tests', () => {
  let service: PQCDataValidationService;
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
        PQCDataValidationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<PQCDataValidationService>(PQCDataValidationService);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSignature', () => {
    it('should generate Dilithium-3 signatures', async () => {
      const testData = 'test data to sign';
      const mockSignResult = {
        success: true,
        token: 'dilithium3-signature-token',
        algorithm: 'ML-DSA-65',
      };

      authService.callPythonPQCService.mockResolvedValue(mockSignResult);

      const result = await service.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'test-key-hash',
      });

      expect(result.algorithm).toBe('Dilithium-3');
      expect(result.signature).toBe('dilithium3:dilithium3-signature-token');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.signedDataHash).toBeDefined();
    });

    it('should generate classical signatures as fallback', async () => {
      const testData = 'test data';
      
      const result = await service.generateSignature(testData, {
        algorithm: PQCAlgorithmType.RSA_2048,
        publicKeyHash: 'rsa-key-hash',
      });

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.signature).toMatch(/^classical:/);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle signature generation failures', async () => {
      authService.callPythonPQCService.mockResolvedValue({
        success: false,
        error_message: 'Signature generation failed',
      });

      await expect(
        service.generateSignature('test data', {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'test-key',
        })
      ).rejects.toThrow('Signature generation failed');
    });

    it('should include metadata in signature', async () => {
      const testData = 'test data';
      const metadata = { userId: 'user123', sessionId: 'session456' };

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        token: 'signature-with-metadata',
        algorithm: 'ML-DSA-65',
      });

      const result = await service.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'test-key',
        metadata,
      });

      expect(result.algorithm).toBe('Dilithium-3');
      expect(result.signature).toBeDefined();
    });
  });

  describe('verifySignature', () => {
    it('should verify valid Dilithium-3 signatures', async () => {
      const testData = 'signed test data';
      const signature = {
        signature: 'dilithium3:valid-signature-token',
        algorithm: 'Dilithium-3',
        publicKeyHash: 'test-key-hash',
        timestamp: new Date(),
        signedDataHash: service['generateDataHash'](testData),
      };

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        verified: true,
      });

      const result = await service.verifySignature(testData, signature);

      expect(result.isValid).toBe(true);
      expect(result.algorithm).toBe('Dilithium-3');
      expect(result.errors).toHaveLength(0);
      expect(result.performanceMetrics).toBeDefined();
    });

    it('should verify classical signatures', async () => {
      const testData = 'test data';
      const signature = {
        signature: 'classical:test-signature-hash',
        algorithm: 'RSA-2048',
        publicKeyHash: 'rsa-key-hash',
        timestamp: new Date(),
        signedDataHash: service['generateDataHash'](testData),
      };

      const result = await service.verifySignature(testData, signature);

      expect(result.algorithm).toBe('RSA-2048');
    });

    it('should reject signatures with data hash mismatch', async () => {
      const originalData = 'original data';
      const tamperedData = 'tampered data';
      const signature = {
        signature: 'dilithium3:signature-token',
        algorithm: 'Dilithium-3',
        publicKeyHash: 'test-key',
        timestamp: new Date(),
        signedDataHash: service['generateDataHash'](originalData),
      };

      const result = await service.verifySignature(tamperedData, signature);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data hash mismatch');
    });

    it('should handle expired signatures', async () => {
      const testData = 'test data';
      const expiredSignature = {
        signature: 'dilithium3:expired-signature',
        algorithm: 'Dilithium-3',
        publicKeyHash: 'test-key',
        timestamp: new Date(Date.now() - 3600000),
        signedDataHash: service['generateDataHash'](testData),
      };

      const result = await service.verifySignature(testData, expiredSignature, {
        checkTimestamp: true,
        maxAge: 1800000,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('expired'))).toBe(true);
    });

    it('should track performance metrics', async () => {
      const testData = 'performance test';
      const signature = {
        signature: 'dilithium3:performance-signature',
        algorithm: 'Dilithium-3',
        publicKeyHash: 'performance-key',
        timestamp: new Date(),
        signedDataHash: service['generateDataHash'](testData),
      };

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        verified: true,
      });

      const result = await service.verifySignature(testData, signature);

      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics?.validationTime).toBeGreaterThan(0);
      expect(result.performanceMetrics?.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('createDataIntegrity', () => {
    it('should create data integrity with PQC signature', async () => {
      const testData = { userId: 'user123', data: 'sensitive information' };
      const userId = 'user123';

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        token: 'integrity-signature-token',
        algorithm: 'ML-DSA-65',
      });

      const result = await service.createDataIntegrity(testData, userId);

      expect(result.hash).toBeDefined();
      expect(result.algorithm).toBe('SHA-256');
      expect(result.signature.algorithm).toBe('ML-DSA-65');
      expect(result.signature.signature).toContain('dilithium3:');
      expect(result.validationStatus).toBe('valid');
    });

    it('should handle classical fallback for data integrity', async () => {
      const testData = { data: 'test data' };
      const userId = 'user123';

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        token: 'classical-signature-token',
        algorithm: 'Classical',
      });

      const result = await service.createDataIntegrity(testData, userId);

      expect(result.signature.algorithm).toBe('RSA-2048');
      expect(result.signature.signature).toContain('classical:');
    });

    it('should handle data integrity creation failures', async () => {
      const testData = { data: 'test' };
      const userId = 'user123';

      authService.callPythonPQCService.mockResolvedValue({
        success: false,
        error_message: 'Integrity creation failed',
      });

      await expect(
        service.createDataIntegrity(testData, userId)
      ).rejects.toThrow('Integrity creation failed');
    });
  });

  describe('validateDataIntegrity', () => {
    it('should validate data integrity successfully', async () => {
      const testData = { data: 'test data' };
      const integrity = {
        hash: service['generateDataHash'](testData),
        algorithm: 'SHA-256',
        signature: {
          signature: 'dilithium3:valid-signature',
          algorithm: 'ML-DSA-65' as PQCAlgorithmType,
          publicKeyHash: 'test-key',
          timestamp: new Date(),
          signedDataHash: service['generateDataHash'](testData),
        },
        timestamp: new Date(),
        validationStatus: 'valid' as const,
      };

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        verified: true,
      });

      const result = await service.validateDataIntegrity(testData, integrity);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect data integrity hash mismatch', async () => {
      const originalData = { data: 'original' };
      const tamperedData = { data: 'tampered' };
      const integrity = {
        hash: service['generateDataHash'](originalData),
        algorithm: 'SHA-256',
        signature: {
          signature: 'dilithium3:signature',
          algorithm: 'ML-DSA-65' as PQCAlgorithmType,
          publicKeyHash: 'test-key',
          timestamp: new Date(),
          signedDataHash: service['generateDataHash'](originalData),
        },
        timestamp: new Date(),
        validationStatus: 'valid' as const,
      };

      const result = await service.validateDataIntegrity(tamperedData, integrity);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data integrity hash mismatch');
    });
  });

  describe('batchValidateIntegrity', () => {
    it('should validate multiple data integrity items', async () => {
      const dataItems = [
        {
          data: { id: 1, value: 'data1' },
          integrity: {
            hash: service['generateDataHash']({ id: 1, value: 'data1' }),
            algorithm: 'SHA-256',
            signature: {
              signature: 'dilithium3:sig1',
              algorithm: 'ML-DSA-65' as PQCAlgorithmType,
              publicKeyHash: 'key1',
              timestamp: new Date(),
              signedDataHash: service['generateDataHash']({ id: 1, value: 'data1' }),
            },
            timestamp: new Date(),
            validationStatus: 'valid' as const,
          },
        },
        {
          data: { id: 2, value: 'data2' },
          integrity: {
            hash: service['generateDataHash']({ id: 2, value: 'data2' }),
            algorithm: 'SHA-256',
            signature: {
              signature: 'dilithium3:sig2',
              algorithm: 'ML-DSA-65' as PQCAlgorithmType,
              publicKeyHash: 'key2',
              timestamp: new Date(),
              signedDataHash: service['generateDataHash']({ id: 2, value: 'data2' }),
            },
            timestamp: new Date(),
            validationStatus: 'valid' as const,
          },
        },
      ];

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        verified: true,
      });

      const results = await service.batchValidateIntegrity(dataItems);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.algorithm).toBeDefined();
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should handle partial failures in batch validation', async () => {
      const dataItems = [
        {
          data: { valid: true },
          integrity: {
            hash: service['generateDataHash']({ valid: true }),
            algorithm: 'SHA-256',
            signature: {
              signature: 'dilithium3:valid-sig',
              algorithm: 'ML-DSA-65' as PQCAlgorithmType,
              publicKeyHash: 'valid-key',
              timestamp: new Date(),
              signedDataHash: service['generateDataHash']({ valid: true }),
            },
            timestamp: new Date(),
            validationStatus: 'valid' as const,
          },
        },
        {
          data: { invalid: true },
          integrity: {
            hash: 'wrong-hash',
            algorithm: 'SHA-256',
            signature: {
              signature: 'dilithium3:invalid-sig',
              algorithm: 'ML-DSA-65' as PQCAlgorithmType,
              publicKeyHash: 'invalid-key',
              timestamp: new Date(),
              signedDataHash: 'wrong-hash',
            },
            timestamp: new Date(),
            validationStatus: 'valid' as const,
          },
        },
      ];

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        verified: true,
      });

      const results = await service.batchValidateIntegrity(dataItems);

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
    });
  });
});
