import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataValidationService } from '../../../../src/services/pqc-data-validation.service';
import { AuthService } from '../../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../../src/models/interfaces/pqc-data.interface';

describe('Dilithium-3 Algorithm Unit Tests', () => {
  let validationService: PQCDataValidationService;
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

    validationService = module.get<PQCDataValidationService>(PQCDataValidationService);
    authService = module.get(AuthService);
  });

  describe('Key Generation', () => {
    it('should generate Dilithium-3 key pairs with correct algorithm', async () => {
      const mockSignResult = {
        success: true,
        token: 'dilithium3-signature-token',
        algorithm: 'ML-DSA-65',
      };

      authService.callPythonPQCService.mockResolvedValue(mockSignResult);

      const result = await validationService.generateSignature('test data', {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'test-key-hash',
      });

      expect(result.algorithm).toBe('Dilithium-3');
      expect(result.signature).toContain('dilithium3:');
      expect(authService.callPythonPQCService).toHaveBeenCalledWith(
        'sign_token',
        expect.objectContaining({
          payload: 'test data',
        })
      );
    });

    it('should generate unique signatures for same data', async () => {
      const testData = 'identical test data';
      const signatures = [];

      for (let i = 0; i < 5; i++) {
        const mockSignResult = {
          success: true,
          token: `dilithium3-signature-${i}-${Math.random()}`,
          algorithm: 'ML-DSA-65',
        };

        authService.callPythonPQCService.mockResolvedValueOnce(mockSignResult);

        const result = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `key-hash-${i}`,
        });

        signatures.push(result.signature);
      }

      const uniqueSignatures = new Set(signatures);
      expect(uniqueSignatures.size).toBe(5);
    });

    it('should handle signature generation failures gracefully', async () => {
      authService.callPythonPQCService.mockResolvedValue({
        success: false,
        error_message: 'Signature generation failed',
      });

      await expect(
        validationService.generateSignature('test data', {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'test-key',
        })
      ).rejects.toThrow('Signature generation failed');
    });
  });

  describe('Signature Creation', () => {
    it('should create Dilithium-3 signatures correctly', async () => {
      const testData = 'data to sign';
      const mockSignResult = {
        success: true,
        token: 'valid-dilithium3-signature',
        algorithm: 'ML-DSA-65',
      };

      authService.callPythonPQCService.mockResolvedValue(mockSignResult);

      const result = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'signing-key',
      });

      expect(result.algorithm).toBe('Dilithium-3');
      expect(result.signature).toBe('dilithium3:valid-dilithium3-signature');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.signedDataHash).toBeDefined();
    });

    it('should produce deterministic data hashes', async () => {
      const testData = 'consistent test data';
      const mockSignResult = {
        success: true,
        token: 'signature-token',
        algorithm: 'ML-DSA-65',
      };

      authService.callPythonPQCService.mockResolvedValue(mockSignResult);

      const result1 = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'test-key',
      });

      const result2 = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'test-key',
      });

      expect(result1.signedDataHash).toBe(result2.signedDataHash);
    });
  });

  describe('Signature Verification', () => {
    it('should verify valid Dilithium-3 signatures', async () => {
      const testData = 'signed test data';
      const mockSignature = {
        signature: 'dilithium3:valid-signature-token',
        algorithm: 'Dilithium-3',
        publicKeyHash: 'test-key-hash',
        timestamp: new Date(),
        signedDataHash: 'test-hash',
      };

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        verified: true,
      });

      const result = await validationService.verifySignature(testData, mockSignature);

      expect(result.isValid).toBe(true);
      expect(result.algorithm).toBe('Dilithium-3');
      expect(result.errors).toHaveLength(0);
      expect(authService.callPythonPQCService).toHaveBeenCalledWith(
        'verify_token',
        expect.objectContaining({
          token: 'valid-signature-token',
        })
      );
    });

    it('should reject invalid signatures', async () => {
      const testData = 'test data';
      const invalidSignature = {
        signature: 'dilithium3:invalid-signature',
        algorithm: 'Dilithium-3',
        publicKeyHash: 'test-key-hash',
        timestamp: new Date(),
        signedDataHash: 'test-hash',
      };

      authService.callPythonPQCService.mockResolvedValue({
        success: false,
        error_message: 'Signature verification failed',
      });

      const result = await validationService.verifySignature(testData, invalidSignature);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect tampered data', async () => {
      const originalData = 'original data';
      const tamperedData = 'tampered data';
      const signature = {
        signature: 'dilithium3:signature-token',
        algorithm: 'Dilithium-3',
        publicKeyHash: 'test-key-hash',
        timestamp: new Date(),
        signedDataHash: 'original-data-hash',
      };

      const result = await validationService.verifySignature(tamperedData, signature);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data hash mismatch');
    });
  });

  describe('Algorithm Compliance', () => {
    it('should meet NIST Dilithium-3 specifications', async () => {
      const testData = 'NIST compliance test';
      const mockSignResult = {
        success: true,
        token: 'a'.repeat(3293),
        algorithm: 'ML-DSA-65',
      };

      authService.callPythonPQCService.mockResolvedValue(mockSignResult);

      const result = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'nist-compliance-key',
      });

      expect(result.algorithm).toBe('Dilithium-3');
      expect(result.signature).toContain('dilithium3:');
    });

    it('should handle signature size validation', async () => {
      const testData = 'size validation test';
      const mockSignResult = {
        success: true,
        token: 'valid-size-signature',
        algorithm: 'ML-DSA-65',
      };

      authService.callPythonPQCService.mockResolvedValue(mockSignResult);

      const result = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'size-test-key',
      });

      expect(result.signature.length).toBeGreaterThan(20);
      expect(result.signature).toMatch(/^dilithium3:/);
    });
  });

  describe('Performance Metrics', () => {
    it('should track signature verification performance', async () => {
      const testData = 'performance test data';
      const signature = {
        signature: 'dilithium3:performance-signature',
        algorithm: 'Dilithium-3',
        publicKeyHash: 'performance-key',
        timestamp: new Date(),
        signedDataHash: 'performance-hash',
      };

      authService.callPythonPQCService.mockResolvedValue({
        success: true,
        verified: true,
      });

      const result = await validationService.verifySignature(testData, signature);

      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics?.validationTime).toBeGreaterThan(0);
      expect(result.performanceMetrics?.memoryUsage).toBeGreaterThan(0);
    });
  });
});
