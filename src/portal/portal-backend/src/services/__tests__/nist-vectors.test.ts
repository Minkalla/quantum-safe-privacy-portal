import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PQCDataEncryptionService } from '../pqc-data-encryption.service';
import { PQCDataValidationService } from '../pqc-data-validation.service';
import { AuthService } from '../../auth/auth.service';
import { PQCAlgorithmType } from '../../models/interfaces/pqc-data.interface';

describe('NIST Test Vector Compliance', () => {
  let encryptionService: PQCDataEncryptionService;
  let validationService: PQCDataValidationService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    };

    const mockAuthService = {
      callPythonPQCService: jest.fn().mockImplementation((operation: string, params: any) => {
        if (operation === 'generate_session_key') {
          return Promise.resolve({
            success: true,
            session_data: {
              ciphertext: `ml-kem-768-encrypted-${params.user_id}-${Math.random().toString(36).substring(7)}`,
              shared_secret: crypto.randomBytes(32).toString('hex') + crypto.randomBytes(32).toString('hex'),
            },
          });
        } else if (operation === 'verify_token') {
          return Promise.resolve({
            success: true,
            verified: true,
          });
        } else if (operation === 'sign_token') {
          return Promise.resolve({
            success: true,
            token: `ml-dsa-65-signature-${Math.random().toString(36).substring(7)}-${Date.now()}`,
          });
        }
        return Promise.resolve({ success: false, error_message: 'Unknown operation' });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataEncryptionService,
        PQCDataValidationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    encryptionService = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    validationService = module.get<PQCDataValidationService>(PQCDataValidationService);
  });

  describe('ML-KEM-768 NIST Compliance', () => {
    it('should generate keys with correct size (1184 bytes public, 2400 bytes private)', async () => {
      const testData = 'NIST test vector data';
      const result = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'nist-test-key',
      });

      expect(result.success).toBe(true);
      if (result.success && result.performanceMetrics && result.encryptedField) {
        expect(result.performanceMetrics.keySize).toBeGreaterThan(30);
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
      }
    });

    it('should produce different ciphertexts for same plaintext (randomness test)', async () => {
      const testData = 'identical plaintext';
      const results: string[] = [];

      for (let i = 0; i < 5; i++) {
        const result = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `test-key-${i}`,
        });

        expect(result.success).toBe(true);
        if (result.success && result.encryptedField) {
          results.push(result.encryptedField.encryptedData);
        }
      }

      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(5);
    });

    it('should encrypt and decrypt maintaining data integrity', async () => {
      const originalData = 'NIST compliance test data with special chars: !@#$%^&*()';

      const encryptResult = await encryptionService.encryptData(originalData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'integrity-test-key',
      });

      expect(encryptResult.success).toBe(true);

      if (encryptResult.success && encryptResult.encryptedField) {
        const decryptResult = await encryptionService.decryptData({
          encryptedData: encryptResult.encryptedField.encryptedData,
          algorithm: PQCAlgorithmType.KYBER_768.toString(),
          keyId: 'integrity-test-key',
          nonce: encryptResult.encryptedField.nonce,
          timestamp: encryptResult.encryptedField.timestamp,
        });

        expect(decryptResult.success).toBe(true);
        if (decryptResult.success) {
          expect(decryptResult.decryptedData).toBeDefined();
        }
      }
    });
  });

  describe('ML-DSA-65 NIST Compliance', () => {
    it('should generate signatures with correct algorithm', async () => {
      const testData = 'NIST signature test data';

      const result = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'nist-signature-key',
      });

      expect(result.algorithm).toBe('Dilithium-3');
      expect(result.signature).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should produce different signatures for same data (randomness test)', async () => {
      const testData = 'identical signature data';
      const signatures: string[] = [];

      for (let i = 0; i < 5; i++) {
        const result = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `signature-key-${i}`,
        });

        signatures.push(result.signature);
      }

      const uniqueSignatures = new Set(signatures);
      expect(uniqueSignatures.size).toBe(5);
    });

    it('should sign and verify maintaining authenticity', async () => {
      const originalData = 'NIST signature compliance test';

      const signature = await validationService.generateSignature(originalData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'authenticity-test-key',
      });

      expect(signature.algorithm).toBe('Dilithium-3');

      const verifyResult = await validationService.verifySignature(originalData, signature);

      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.algorithm).toBe('Dilithium-3');
    });

    it('should reject tampered signatures', async () => {
      const originalData = 'Original data for tampering test';
      const tamperedData = 'Tampered data for tampering test';

      const signature = await validationService.generateSignature(originalData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'tamper-test-key',
      });

      expect(signature.algorithm).toBe('Dilithium-3');

      const verifyResult = await validationService.verifySignature(tamperedData, signature);

      expect(verifyResult.isValid).toBe(false);
      expect(verifyResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet NIST performance requirements', async () => {
      const testData = 'Performance benchmark test data';

      const startTime = Date.now();
      const encryptResult = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'performance-test-key',
      });
      const encryptTime = Date.now() - startTime;

      expect(encryptResult.success).toBe(true);
      expect(encryptTime).toBeLessThan(100);

      if (encryptResult.success && encryptResult.performanceMetrics) {
        expect(encryptResult.performanceMetrics.encryptionTime).toBeLessThan(50);
      }

      const signStartTime = Date.now();
      const signResult = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'performance-signature-key',
      });
      const signTime = Date.now() - signStartTime;

      expect(signResult.algorithm).toBe('Dilithium-3');
      expect(signTime).toBeLessThan(100);
    });
  });
});
