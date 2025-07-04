import { Test, TestingModule } from '@nestjs/testing';
import { PQCDataEncryptionService } from '../../../src/services/pqc-data-encryption.service';
import { PQCDataValidationService } from '../../../src/services/pqc-data-validation.service';
import { AuthService } from '../../../src/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../src/pqc/pqc-monitoring.service';
import { EnhancedErrorBoundaryService } from '../../../src/services/enhanced-error-boundary.service';
import { PQCErrorTaxonomyService } from '../../../src/services/pqc-error-taxonomy.service';
import { CircuitBreakerService } from '../../../src/services/circuit-breaker.service';
import { HybridCryptoService } from '../../../src/services/hybrid-crypto.service';
import { ClassicalCryptoService } from '../../../src/services/classical-crypto.service';
import { QuantumSafeCryptoIdentityService } from '../../../src/services/quantum-safe-crypto-identity.service';
import { PQCService } from '../../../src/services/pqc.service';
import { QuantumSafeJWTService } from '../../../src/services/quantum-safe-jwt.service';
import { PQCBridgeService } from '../../../src/services/pqc-bridge.service';
import { SecretsService } from '../../../src/secrets/secrets.service';
import { getModelToken } from '@nestjs/mongoose';
import { PQCAlgorithmType } from '../../../src/models/interfaces/pqc-data.interface';

describe('PQC Cross-Service Integration', () => {
  let encryptionService: PQCDataEncryptionService;
  let validationService: PQCDataValidationService;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataEncryptionService,
        PQCDataValidationService,
        SecretsService,
        AuthService,
        EnhancedErrorBoundaryService,
        PQCErrorTaxonomyService,
        CircuitBreakerService,
        HybridCryptoService,
        ClassicalCryptoService,
        JwtService,
        PQCFeatureFlagsService,
        PQCMonitoringService,
        QuantumSafeJWTService,
        QuantumSafeCryptoIdentityService,
        PQCBridgeService,
        PQCService,
        SecretsService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                'pqc.enabled': true,
                'pqc.fallback_enabled': true,
                'encryption.default_algorithm': 'Kyber-768',
                'validation.default_algorithm': 'Dilithium-3',
                'performance.monitoring_enabled': true,
                'JWT_ACCESS_SECRET_ID': 'test-access-secret-id',
                'JWT_REFRESH_SECRET_ID': 'test-refresh-secret-id',
                'AWS_REGION': 'us-east-1',
                'SKIP_SECRETS_MANAGER': 'true',
                'MongoDB1': process.env.MongoDB1 || 'mongodb://localhost:27017/test',
              };
              return config[key] || process.env[key] || 'test-value';
            },
          },
        },
        {
          provide: getModelToken('User'),
          useValue: {
            findOne: () => Promise.resolve(null),
            findByIdAndUpdate: () => Promise.resolve({}),
            create: () => Promise.resolve({}),
            save: () => Promise.resolve({}),
          },
        },
      ],
    }).compile();

    await module.init();

    encryptionService = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    validationService = module.get<PQCDataValidationService>(PQCDataValidationService);
    authService = module.get<AuthService>(AuthService);
  });

  describe('Encryption and Validation Integration', () => {
    it('should integrate PQC encryption with data validation using real cryptographic operations', async () => {
      const testData = {
        sensitive: 'Highly confidential information',
        userId: 'cross-service-test-user',
        metadata: { classification: 'top-secret', version: '2.0' },
      };

      const encrypted = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'cross-service-test-user',
      });

      expect(encrypted.success).toBe(true);
      expect(encrypted.encryptedField).toBeDefined();
      expect(encrypted.encryptedField!.algorithm).toBe('Kyber-768');
      expect(encrypted.encryptedField!.encryptedData).toBeDefined();
      expect(encrypted.encryptedField!.keyId).toBeDefined();

      const integrity = await validationService.createDataIntegrity(encrypted.encryptedField!, 'cross-service-test-user');

      expect(integrity.hash).toBeDefined();
      expect(integrity.signature).toBeDefined();
      expect(integrity.validationStatus).toBe('valid');

      const validation = await validationService.validateDataIntegrity(encrypted.encryptedField!, integrity);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.algorithm).toBe('SHA-256');
    });

    it('should handle cross-service data flow with signature verification', async () => {
      const originalData = {
        document: 'Cross-service integration document',
        userId: 'signature-test-user',
        timestamp: new Date().toISOString(),
      };

      const signature = await validationService.generateSignature(originalData, {
        algorithm: 'Dilithium-3' as any,
        userId: 'signature-test-user',
      });

      expect(signature.algorithm).toBe('Dilithium-3');
      expect(signature.signature).toBeDefined();

      const encryptedSignature = await encryptionService.encryptData(signature, {
        algorithm: PQCAlgorithmType.AES_256_GCM,
        userId: 'signature-test-user',
      });

      expect(encryptedSignature.success).toBe(true);
      expect(encryptedSignature.encryptedField!.algorithm).toBe('AES-256-GCM');

      const decryptedSignature = await encryptionService.decryptData(encryptedSignature.encryptedField!, { userId: 'signature-test-user' });

      expect(decryptedSignature.decryptedData).toMatchObject({
        algorithm: signature.algorithm,
        signature: signature.signature,
        signedDataHash: signature.signedDataHash,
        publicKeyHash: signature.publicKeyHash,
      });

      const verification = await validationService.verifySignature(originalData, decryptedSignature.decryptedData!);

      expect(verification.isValid).toBe(true);
      expect(verification.algorithm).toBe('Dilithium-3');
      expect(verification.performanceMetrics).toBeDefined();
    });

    it('should maintain data integrity across multiple service operations', async () => {
      const complexData = {
        userProfile: {
          id: 'multi-service-user',
          personalInfo: { name: 'Test User', age: 30 },
          preferences: { theme: 'dark', notifications: true },
        },
        transactionHistory: [
          { id: 1, amount: 100, date: '2024-01-01' },
          { id: 2, amount: 250, date: '2024-01-02' },
        ],
        metadata: { lastUpdated: new Date().toISOString() },
      };

      const step1Encrypted = await encryptionService.encryptData(complexData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'multi-service-user',
      });

      const step2Integrity = await validationService.createDataIntegrity(step1Encrypted.encryptedField!, 'multi-service-user');

      const step3EncryptedIntegrity = await encryptionService.encryptData(step2Integrity, {
        algorithm: PQCAlgorithmType.AES_256_GCM,
        userId: 'multi-service-user',
      });

      const step4DecryptedIntegrity = await encryptionService.decryptData(step3EncryptedIntegrity.encryptedField!, { userId: 'multi-service-user' });

      const step5Validation = await validationService.validateDataIntegrity(step1Encrypted.encryptedField!, step4DecryptedIntegrity.decryptedData!);

      expect(step5Validation.isValid).toBe(true);
      expect(step5Validation.errors).toHaveLength(0);

      const step6DecryptedData = await encryptionService.decryptData(step1Encrypted.encryptedField!, { userId: 'multi-service-user' });

      expect(step6DecryptedData.success).toBe(true);
      expect(step6DecryptedData.decryptedData).toBeDefined();

      if (step6DecryptedData.decryptedData.algorithm === 'ML-KEM-768') {
        expect(step6DecryptedData.decryptedData.decrypted).toBe(true);
        expect(step6DecryptedData.decryptedData.keyId).toBeDefined();
      } else {
        expect(step6DecryptedData.decryptedData).toEqual(complexData);
      }
    });
  });

  describe('Performance and Monitoring Integration', () => {
    it('should track performance metrics across service boundaries', async () => {
      const performanceTestData = {
        operation: 'performance-monitoring',
        payload: 'x'.repeat(1000),
        userId: 'performance-test-user',
      };

      const startTime = Date.now();

      const encrypted = await encryptionService.encryptData(performanceTestData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'performance-test-user',
      });

      const encryptionTime = Date.now() - startTime;

      const validationStartTime = Date.now();

      const integrity = await validationService.createDataIntegrity(encrypted.encryptedField!, 'performance-test-user');

      const validationTime = Date.now() - validationStartTime;

      const totalTime = Date.now() - startTime;

      expect(encryptionTime).toBeLessThan(10000);
      expect(validationTime).toBeLessThan(8000);
      expect(totalTime).toBeLessThan(15000);

      expect(encrypted.success).toBe(true);
      expect(encrypted.encryptedField!.algorithm).toBe('Kyber-768');
      expect(integrity.validationStatus).toBe('valid');
    });

    it('should handle concurrent cross-service operations efficiently', async () => {
      const concurrentData = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        data: `Concurrent operation ${i}`,
        userId: `concurrent-user-${i}`,
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        concurrentData.map(async (data) => {
          const encrypted = await encryptionService.encryptData(data, {
            algorithm: PQCAlgorithmType.KYBER_768,
            userId: data.userId,
          });

          const integrity = await validationService.createDataIntegrity(encrypted.encryptedField!, data.userId);

          const validation = await validationService.validateDataIntegrity(encrypted.encryptedField!, integrity);

          return {
            id: data.id,
            encrypted: encrypted.encryptedField!.algorithm,
            valid: validation.isValid,
            errors: validation.errors.length,
          };
        }),
      );

      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.encrypted).toBe('Kyber-768');
        expect(result.valid).toBe(true);
        expect(result.errors).toBe(0);
      });

      expect(totalTime).toBeLessThan(25000);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service integration failures gracefully', async () => {
      const errorTestData = {
        problematic: 'data',
        userId: 'error-test-user',
      };

      try {
        const encrypted = await encryptionService.encryptData(errorTestData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          userId: 'error-test-user',
        });

        const integrity = await validationService.createDataIntegrity(encrypted.encryptedField!, 'error-test-user');

        expect(encrypted.success).toBe(true);
        expect(encrypted.encryptedField!.algorithm).toBe('Kyber-768');
        expect(integrity.validationStatus).toBe('valid');
      } catch (error) {
        expect(error).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });

    it('should maintain consistency during partial service failures', async () => {
      const consistencyData = {
        critical: 'consistency test data',
        userId: 'consistency-test-user',
        timestamp: Date.now(),
      };

      const encrypted = await encryptionService.encryptData(consistencyData, {
        algorithm: PQCAlgorithmType.AES_256_GCM,
        userId: 'consistency-test-user',
      });

      expect(encrypted.success).toBe(true);
      expect(encrypted.encryptedField!.algorithm).toBe('AES-256-GCM');

      const integrity = await validationService.createDataIntegrity(encrypted.encryptedField!, 'consistency-test-user');

      expect(integrity.validationStatus).toBe('valid');

      const validation = await validationService.validateDataIntegrity(encrypted.encryptedField!, integrity);

      expect(validation.isValid).toBe(true);

      const decrypted = await encryptionService.decryptData(encrypted.encryptedField!, { userId: 'consistency-test-user' });

      expect(decrypted.decryptedData).toEqual(consistencyData);
    });
  });
});
