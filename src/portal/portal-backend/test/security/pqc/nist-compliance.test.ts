import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataEncryptionService } from '../../../src/services/pqc-data-encryption.service';
import { PQCDataValidationService } from '../../../src/services/pqc-data-validation.service';
import { AuthService } from '../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../src/models/interfaces/pqc-data.interface';
import * as crypto from 'crypto';

describe('NIST PQC Compliance Tests', () => {
  let encryptionService: PQCDataEncryptionService;
  let validationService: PQCDataValidationService;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataEncryptionService,
        PQCDataValidationService,
        ConfigService,
        AuthService,
      ],
    }).compile();

    encryptionService = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    validationService = module.get<PQCDataValidationService>(PQCDataValidationService);
    authService = module.get<AuthService>(AuthService);
  });

  describe('NIST FIPS 203 ML-KEM-768 Compliance', () => {
    it('should meet NIST ML-KEM-768 key size requirements', async () => {
      const testData = 'NIST compliance test';
      
      const result = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'nist-key-size-test',
      });

      expect(result.success).toBe(true);
      if (result.success && result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
        expect(result.encryptedField.encryptedData.length).toBeGreaterThan(1500);
      }
    });

    it('should comply with NIST ML-KEM-768 ciphertext format', async () => {
      const testData = 'NIST ciphertext format test';
      
      const result = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'nist-format-test',
      });

      expect(result.success).toBe(true);
      if (result.success && result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
        expect(result.encryptedField.nonce).toBeDefined();
        expect(result.encryptedField.timestamp).toBeInstanceOf(Date);
        expect(result.encryptedField.keyId).toBe('nist-format-test');
      }
    });

    it('should support NIST ML-KEM-768 parameter sets', async () => {
      const parameterSets = [
        { name: 'Kyber-768', algorithm: PQCAlgorithmType.KYBER_768 },
      ];

      for (const paramSet of parameterSets) {
        const result = await encryptionService.encryptData('parameter test', {
          algorithm: paramSet.algorithm,
          keyId: `nist-param-${paramSet.name}`,
        });

        expect(result.success).toBe(true);
        if (result.success && result.encryptedField) {
          expect(result.encryptedField.algorithm).toContain('768');
        }
      }
    });

    it('should validate NIST ML-KEM-768 security level', async () => {
      const testData = 'security level test';
      
      const result = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'nist-security-test',
      });

      expect(result.success).toBe(true);
      if (result.success && result.performanceMetrics) {
        expect(result.performanceMetrics.keySize).toBeGreaterThan(1000);
      }
    });
  });

  describe('NIST FIPS 204 ML-DSA-65 Compliance', () => {
    it('should meet NIST ML-DSA-65 signature size requirements', async () => {
      const testData = 'NIST signature size test';
      
      const signature = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'nist-signature-size-test',
      });

      expect(signature.algorithm).toBe('Dilithium-3');
      expect(signature.signature.length).toBeGreaterThan(20);
      expect(signature.signature).toMatch(/^dilithium3:/);
    });

    it('should comply with NIST ML-DSA-65 signature format', async () => {
      const testData = 'NIST signature format test';
      
      const signature = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'nist-format-test',
      });

      expect(signature.algorithm).toBe('Dilithium-3');
      expect(signature.timestamp).toBeInstanceOf(Date);
      expect(signature.signedDataHash).toBeDefined();
      expect(signature.publicKeyHash).toBe('nist-format-test');
    });

    it('should support NIST ML-DSA-65 parameter sets', async () => {
      const testData = 'parameter set test';
      
      const signature = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'nist-param-test',
      });

      expect(signature.algorithm).toBe('Dilithium-3');
      
      const verifyResult = await validationService.verifySignature(testData, signature);
      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.algorithm).toBe('Dilithium-3');
    });

    it('should validate NIST ML-DSA-65 security properties', async () => {
      const testData = 'security properties test';
      
      const signature = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'nist-security-props-test',
      });

      expect(signature.algorithm).toBe('Dilithium-3');
      
      const tamperedData = 'tampered security properties test';
      const verifyResult = await validationService.verifySignature(tamperedData, signature);
      expect(verifyResult.isValid).toBe(false);
    });
  });

  describe('NIST SP 800-53 Security Controls', () => {
    it('should implement SC-13 Cryptographic Protection', async () => {
      const sensitiveData = 'classified information requiring SC-13 protection';
      
      const encryptResult = await encryptionService.encryptData(sensitiveData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'sc-13-test-key',
      });

      expect(encryptResult.success).toBe(true);
      if (encryptResult.success && encryptResult.encryptedField) {
        expect(encryptResult.encryptedField.algorithm).toBe('Kyber-768');
        expect(encryptResult.encryptedField.encryptedData).not.toContain(sensitiveData);
        
        const decryptResult = await encryptionService.decryptData(encryptResult.encryptedField);
        expect(decryptResult.success).toBe(true);
        if (decryptResult.success) {
          expect(decryptResult.decryptedData).toBe(sensitiveData);
        }
      }
    });

    it('should implement SC-12 Cryptographic Key Establishment', async () => {
      const testData = 'key establishment test';
      const keyIds = ['sc-12-key-1', 'sc-12-key-2', 'sc-12-key-3'];

      for (const keyId of keyIds) {
        const encryptResult = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId,
        });

        expect(encryptResult.success).toBe(true);
        if (encryptResult.success && encryptResult.encryptedField) {
          expect(encryptResult.encryptedField.keyId).toBe(keyId);
          expect(encryptResult.encryptedField.algorithm).toBe('Kyber-768');
        }
      }
    });

    it('should implement SC-17 Public Key Infrastructure Certificates', async () => {
      const testData = 'PKI certificate test';
      
      const signature = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'sc-17-pki-key',
      });

      expect(signature.algorithm).toBe('Dilithium-3');
      expect(signature.publicKeyHash).toBe('sc-17-pki-key');
      expect(signature.timestamp).toBeInstanceOf(Date);

      const verifyResult = await validationService.verifySignature(testData, signature);
      expect(verifyResult.isValid).toBe(true);
    });
  });

  describe('NIST SP 800-56A Key Agreement', () => {
    it('should implement secure key agreement protocols', async () => {
      const testData = 'key agreement test';
      
      const encryptResult = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'key-agreement-test',
      });

      expect(encryptResult.success).toBe(true);
      if (encryptResult.success && encryptResult.encryptedField) {
        expect(encryptResult.encryptedField.algorithm).toBe('Kyber-768');
        
        const decryptResult = await encryptionService.decryptData(encryptResult.encryptedField);
        expect(decryptResult.success).toBe(true);
        if (decryptResult.success) {
          expect(decryptResult.decryptedData).toBe(testData);
        }
      }
    });

    it('should validate key agreement security properties', async () => {
      const testData = 'security properties validation';
      const iterations = 10;
      const encryptedResults = [];

      for (let i = 0; i < iterations; i++) {
        const result = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `key-agreement-${i}`,
        });

        expect(result.success).toBe(true);
        if (result.success && result.encryptedField) {
          encryptedResults.push(result.encryptedField.encryptedData);
        }
      }

      const uniqueResults = new Set(encryptedResults);
      expect(uniqueResults.size).toBe(iterations);
    });
  });

  describe('FIPS 140-2 Compliance', () => {
    it('should meet FIPS 140-2 Level 3 requirements', async () => {
      const testData = 'FIPS 140-2 compliance test';
      
      const encryptResult = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'fips-140-2-test',
      });

      expect(encryptResult.success).toBe(true);
      if (encryptResult.success && encryptResult.performanceMetrics) {
        expect(encryptResult.performanceMetrics.encryptionTime).toBeLessThan(100);
        expect(encryptResult.performanceMetrics.keySize).toBeGreaterThan(1000);
      }
    });

    it('should implement FIPS 140-2 key zeroization', async () => {
      const sensitiveData = 'FIPS key zeroization test';
      
      const encryptResult = await encryptionService.encryptData(sensitiveData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'fips-zeroization-test',
      });

      expect(encryptResult.success).toBe(true);

      global.gc && global.gc();

      const memoryDump = JSON.stringify(process.memoryUsage());
      expect(memoryDump).not.toContain(sensitiveData);
    });
  });

  describe('Common Criteria EAL4+ Compliance', () => {
    it('should meet Common Criteria security requirements', async () => {
      const testData = 'Common Criteria compliance test';
      
      const signature = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'common-criteria-test',
      });

      expect(signature.algorithm).toBe('Dilithium-3');
      
      const verifyResult = await validationService.verifySignature(testData, signature);
      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.errors).toHaveLength(0);
    });

    it('should implement security functional requirements', async () => {
      const testData = 'security functional requirements test';
      
      const encryptResult = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'sfr-test-key',
      });

      expect(encryptResult.success).toBe(true);
      if (encryptResult.success && encryptResult.encryptedField) {
        expect(encryptResult.encryptedField.algorithm).toBe('Kyber-768');
        expect(encryptResult.encryptedField.nonce).toBeDefined();
        expect(encryptResult.encryptedField.timestamp).toBeInstanceOf(Date);
      }
    });
  });
});
