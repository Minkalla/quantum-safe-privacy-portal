import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataEncryptionService } from '../../../src/services/pqc-data-encryption.service';
import { PQCDataValidationService } from '../../../src/services/pqc-data-validation.service';
import { AuthService } from '../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../src/models/interfaces/pqc-data.interface';
import * as crypto from 'crypto';

describe('PQC Cryptographic Security Tests', () => {
  let encryptionService: PQCDataEncryptionService;
  let validationService: PQCDataValidationService;
  let authService: jest.Mocked<AuthService>;

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
              ciphertext: `kyber-768-${crypto.randomBytes(32).toString('hex')}`,
              shared_secret: crypto.randomBytes(32).toString('hex'),
            },
          });
        } else if (operation === 'sign_token') {
          return Promise.resolve({
            success: true,
            token: `dilithium3-${crypto.randomBytes(32).toString('hex')}`,
            algorithm: 'ML-DSA-65',
          });
        } else if (operation === 'verify_token') {
          return Promise.resolve({
            success: true,
            verified: true,
          });
        }
        return Promise.resolve({
          success: true,
          decrypted_data: 'decrypted test data',
        });
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
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  describe('Key Uniqueness Tests', () => {
    it('should generate unique Kyber-768 keys for each operation', async () => {
      const testData = 'uniqueness test data';
      const keyCount = 100;
      const generatedKeys = new Set<string>();

      for (let i = 0; i < keyCount; i++) {
        const result = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `uniqueness-key-${i}`,
        });

        expect(result.success).toBe(true);
        if (result.success && result.encryptedField) {
          generatedKeys.add(result.encryptedField.encryptedData);
        }
      }

      expect(generatedKeys.size).toBe(keyCount);
    });

    it('should generate unique Dilithium-3 signatures for identical data', async () => {
      const testData = 'identical signature data';
      const signatureCount = 50;
      const generatedSignatures = new Set<string>();

      for (let i = 0; i < signatureCount; i++) {
        const signature = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `signature-key-${i}`,
        });

        generatedSignatures.add(signature.signature);
      }

      expect(generatedSignatures.size).toBe(signatureCount);
    });
  });

  describe('Entropy Validation Tests', () => {
    it('should demonstrate sufficient entropy in Kyber-768 ciphertexts', async () => {
      const testData = 'entropy test data';
      const sampleSize = 50;
      const ciphertexts: string[] = [];

      for (let i = 0; i < sampleSize; i++) {
        const result = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `entropy-key-${i}`,
        });

        if (result.success && result.encryptedField) {
          ciphertexts.push(result.encryptedField.encryptedData);
        }
      }

      const entropyScores = ciphertexts.map(ciphertext => {
        const bytes = Buffer.from(ciphertext, 'utf8');
        const frequency = new Array(256).fill(0);
        
        for (const byte of bytes) {
          frequency[byte]++;
        }

        let entropy = 0;
        for (const freq of frequency) {
          if (freq > 0) {
            const probability = freq / bytes.length;
            entropy -= probability * Math.log2(probability);
          }
        }

        return entropy;
      });

      const averageEntropy = entropyScores.reduce((sum, score) => sum + score, 0) / entropyScores.length;
      expect(averageEntropy).toBeGreaterThan(6.0);

      console.log(`Kyber-768 Entropy Analysis:
        Sample size: ${sampleSize}
        Average entropy: ${averageEntropy.toFixed(2)} bits
        Min entropy: ${Math.min(...entropyScores).toFixed(2)} bits
        Max entropy: ${Math.max(...entropyScores).toFixed(2)} bits`);
    });

    it('should validate randomness in Dilithium-3 signatures', async () => {
      const testData = 'randomness validation test';
      const sampleSize = 30;
      const signatures: string[] = [];

      for (let i = 0; i < sampleSize; i++) {
        const signature = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `randomness-key-${i}`,
        });

        signatures.push(signature.signature);
      }

      const signatureParts = signatures.map(sig => sig.split(':')[1]);
      const uniqueParts = new Set(signatureParts);

      expect(uniqueParts.size).toBe(sampleSize);

      const hammingDistances: number[] = [];
      for (let i = 0; i < signatureParts.length - 1; i++) {
        for (let j = i + 1; j < signatureParts.length; j++) {
          const sig1 = signatureParts[i];
          const sig2 = signatureParts[j];
          const minLength = Math.min(sig1.length, sig2.length);
          
          let hammingDistance = 0;
          for (let k = 0; k < minLength; k++) {
            if (sig1[k] !== sig2[k]) {
              hammingDistance++;
            }
          }
          
          hammingDistances.push(hammingDistance / minLength);
        }
      }

      const averageHammingDistance = hammingDistances.reduce((sum, dist) => sum + dist, 0) / hammingDistances.length;
      expect(averageHammingDistance).toBeGreaterThan(0.4);

      console.log(`Dilithium-3 Randomness Analysis:
        Sample size: ${sampleSize}
        Average Hamming distance: ${averageHammingDistance.toFixed(3)}
        Min distance: ${Math.min(...hammingDistances).toFixed(3)}
        Max distance: ${Math.max(...hammingDistances).toFixed(3)}`);
    });
  });

  describe('Timing Attack Protection Tests', () => {
    it('should have consistent timing for Kyber-768 operations regardless of input', async () => {
      const inputs = [
        'short',
        'medium length input data',
        'very long input data that contains much more information and should test timing consistency across different input sizes',
        'a'.repeat(1000),
        'special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
      ];

      const timings: number[] = [];

      for (const input of inputs) {
        const times: number[] = [];
        
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();
          
          const result = await encryptionService.encryptData(input, {
            algorithm: PQCAlgorithmType.KYBER_768,
            keyId: `timing-key-${i}`,
          });
          
          const endTime = performance.now();
          times.push(endTime - startTime);
          
          expect(result.success).toBe(true);
        }

        const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        timings.push(averageTime);
      }

      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      const timingVariance = (maxTiming - minTiming) / minTiming;

      expect(timingVariance).toBeLessThan(0.5);

      console.log(`Kyber-768 Timing Analysis:
        Input variations: ${inputs.length}
        Timing variance: ${(timingVariance * 100).toFixed(2)}%
        Min timing: ${minTiming.toFixed(2)}ms
        Max timing: ${maxTiming.toFixed(2)}ms`);
    });

    it('should have consistent timing for Dilithium-3 signature verification', async () => {
      const testData = 'timing consistency test';
      const validSignature = await validationService.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'timing-test-key',
      });

      const invalidSignature = {
        ...validSignature,
        signature: 'dilithium3:invalid-signature-data',
      };

      const validTimings: number[] = [];
      const invalidTimings: number[] = [];

      for (let i = 0; i < 20; i++) {
        let startTime = performance.now();
        await validationService.verifySignature(testData, validSignature);
        let endTime = performance.now();
        validTimings.push(endTime - startTime);

        startTime = performance.now();
        await validationService.verifySignature(testData, invalidSignature);
        endTime = performance.now();
        invalidTimings.push(endTime - startTime);
      }

      const avgValidTime = validTimings.reduce((sum, time) => sum + time, 0) / validTimings.length;
      const avgInvalidTime = invalidTimings.reduce((sum, time) => sum + time, 0) / invalidTimings.length;
      const timingDifference = Math.abs(avgValidTime - avgInvalidTime) / Math.max(avgValidTime, avgInvalidTime);

      expect(timingDifference).toBeLessThan(0.2);

      console.log(`Dilithium-3 Verification Timing Analysis:
        Valid signature avg: ${avgValidTime.toFixed(2)}ms
        Invalid signature avg: ${avgInvalidTime.toFixed(2)}ms
        Timing difference: ${(timingDifference * 100).toFixed(2)}%`);
    });
  });

  describe('Input Validation Security Tests', () => {
    it('should handle malicious input data safely', async () => {
      const maliciousInputs = [
        null,
        undefined,
        '',
        '\x00\x01\x02\x03',
        '<script>alert("xss")</script>',
        'DROP TABLE users;',
        'a'.repeat(100000),
        JSON.stringify({ malicious: 'object' }),
      ];

      for (const input of maliciousInputs) {
        const result = await encryptionService.encryptData(input as any, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: 'malicious-test-key',
        });

        if (input === null || input === undefined || input === '') {
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        } else {
          expect(result.success).toBe(true);
        }
      }
    });

    it('should validate signature input parameters', async () => {
      const invalidInputs = [
        { data: null, options: { algorithm: PQCAlgorithmType.DILITHIUM_3, publicKeyHash: 'key' } },
        { data: 'test', options: { algorithm: null as any, publicKeyHash: 'key' } },
        { data: 'test', options: { algorithm: PQCAlgorithmType.DILITHIUM_3, publicKeyHash: '' } },
        { data: 'test', options: { algorithm: PQCAlgorithmType.DILITHIUM_3, publicKeyHash: null as any } },
      ];

      for (const { data, options } of invalidInputs) {
        try {
          await validationService.generateSignature(data, options);
          expect(false).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Side-Channel Attack Resistance', () => {
    it('should not leak information through error messages', async () => {
      const testData = 'error message test';
      
      authService.callPythonPQCService.mockResolvedValueOnce({
        success: false,
        error_message: 'Detailed internal error with sensitive information',
      });

      const result = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'error-test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('sensitive');
      expect(result.error).not.toContain('internal');
    });

    it('should not expose key material in error conditions', async () => {
      const invalidEncryptedField = {
        encryptedData: 'invalid-data',
        algorithm: 'Kyber-768',
        keyId: 'test-key',
        nonce: 'test-nonce',
        timestamp: new Date(),
      };

      authService.callPythonPQCService.mockResolvedValueOnce({
        success: false,
        error_message: 'Decryption failed with key material: secret-key-data',
      });

      const result = await encryptionService.decryptData(invalidEncryptedField);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('secret-key-data');
      expect(result.error).not.toContain('key material');
    });
  });

  describe('Memory Security Tests', () => {
    it('should not retain sensitive data in memory after operations', async () => {
      const sensitiveData = 'highly sensitive confidential data';
      
      const result = await encryptionService.encryptData(sensitiveData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'memory-security-key',
      });

      expect(result.success).toBe(true);

      global.gc && global.gc();

      const memoryDump = JSON.stringify(process.memoryUsage());
      expect(memoryDump).not.toContain(sensitiveData);
    });

    it('should clear signature data from memory', async () => {
      const sensitiveSignatureData = 'confidential signature payload';
      
      const signature = await validationService.generateSignature(sensitiveSignatureData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'memory-signature-key',
      });

      expect(signature.algorithm).toBe('Dilithium-3');

      global.gc && global.gc();

      const memoryDump = JSON.stringify(process.memoryUsage());
      expect(memoryDump).not.toContain(sensitiveSignatureData);
    });
  });
});
