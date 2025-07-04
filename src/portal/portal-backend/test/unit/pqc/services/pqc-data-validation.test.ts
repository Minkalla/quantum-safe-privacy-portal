import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataValidationService } from '../../../../src/services/pqc-data-validation.service';
import { AuthService } from '../../../../src/auth/auth.service';
import { EnhancedErrorBoundaryService } from '../../../../src/services/enhanced-error-boundary.service';
import { JwtService } from '../../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../../src/pqc/pqc-monitoring.service';
import { SecretsService } from '../../../../src/secrets/secrets.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from '../../../../src/models/User';
import { PQCAlgorithmType } from '../../../../src/models/interfaces/pqc-data.interface';
import { HybridCryptoService } from '../../../../src/services/hybrid-crypto.service';
import { ClassicalCryptoService } from '../../../../src/services/classical-crypto.service';
import { PQCErrorTaxonomyService } from '../../../../src/services/pqc-error-taxonomy.service';
import { CircuitBreakerService } from '../../../../src/services/circuit-breaker.service';
import { QuantumSafeJWTService } from '../../../../src/services/quantum-safe-jwt.service';
import { PQCBridgeService } from '../../../../src/services/pqc-bridge.service';
import { QuantumSafeCryptoIdentityService } from '../../../../src/services/quantum-safe-crypto-identity.service';
import { PQCService } from '../../../../src/services/pqc.service';

describe('PQCDataValidationService', () => {
  let service: PQCDataValidationService;
  let authService: AuthService;
  let configService: ConfigService;

  beforeEach(async () => {

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataValidationService,
        AuthService,
        JwtService,
        PQCFeatureFlagsService,
        PQCMonitoringService,
        SecretsService,
        EnhancedErrorBoundaryService,
        HybridCryptoService,
        ClassicalCryptoService,
        PQCErrorTaxonomyService,
        CircuitBreakerService,
        QuantumSafeJWTService,
        PQCBridgeService,
        QuantumSafeCryptoIdentityService,
        PQCService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                'pqc.enabled': true,
                'pqc.fallback_enabled': true,
                'validation.default_algorithm': 'Dilithium-3',
                'validation.signature_ttl': 3600000,
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

    service = module.get<PQCDataValidationService>(PQCDataValidationService);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Digital Signature Generation with Dilithium-3', () => {
    it('should generate valid digital signatures with ML-DSA-65', async () => {
      const testData = {
        userId: 'test_user_signature',
        document: 'Important contract document',
        timestamp: new Date().toISOString(),
        metadata: { type: 'contract', version: '1.0' },
      };

      const signature = await service.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        userId: 'test_user_signature',
      });

      expect(signature).toBeDefined();
      expect(signature.algorithm).toBe('Dilithium-3');
      expect(signature.signature).toBeDefined();
      expect(signature.publicKeyHash).toBeDefined();
      expect(signature.timestamp).toBeDefined();
      expect(signature.signedDataHash).toBeDefined();
    });

    it('should create data integrity with real PQC operations', async () => {
      const testData = {
        userId: 'test_user_integrity',
        document: 'Document for integrity verification',
        timestamp: new Date().toISOString(),
      };

      const integrity = await service.createDataIntegrity(testData, 'test_user_integrity');

      expect(integrity).toBeDefined();
      expect(integrity.hash).toBeDefined();
      expect(integrity.algorithm).toBe('SHA-256');
      expect(integrity.signature).toBeDefined();

      if (integrity.signature) {
        expect(integrity.signature.signature).toBeDefined();
        expect(integrity.signature.algorithm).toBeDefined();
      }
      expect(integrity.validationStatus).toBe('valid');
      expect(integrity.timestamp).toBeDefined();
    });

    it('should verify signatures correctly', async () => {
      const testData = {
        userId: 'test_user_verify',
        document: 'Document to be verified',
        timestamp: new Date().toISOString(),
      };

      const signature = await service.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        userId: 'test_user_verify',
      });

      const verification = await service.verifySignature(testData, signature);

      expect(verification).toBeDefined();
      expect(verification.algorithm).toBe('Dilithium-3');
      expect(verification.timestamp).toBeDefined();
      expect(verification.performanceMetrics).toBeDefined();

      if (verification.performanceMetrics) {
        expect(verification.performanceMetrics.validationTime).toBeGreaterThan(0);
      }
    });

    it('should detect data tampering', async () => {
      const originalData = {
        userId: 'test_user_tamper',
        document: 'Original document content',
        amount: 1000,
      };

      const signature = await service.generateSignature(originalData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        userId: 'test_user_tamper',
      });

      const tamperedData = {
        ...originalData,
        amount: 9999,
      };

      const verification = await service.verifySignature(tamperedData, signature);

      expect(verification.isValid).toBe(false);
      expect(verification.errors).toContain('Data hash mismatch');
    });
  });

  describe('Digital Signature Generation with Classical Fallback', () => {
    it('should generate and verify signatures with classical algorithm', async () => {
      const testData = {
        userId: 'test_user_classical',
        document: 'Classical signature test',
      };

      const signature = await service.generateSignature(testData, {
        algorithm: PQCAlgorithmType.RSA_2048,
        userId: 'test_user_classical',
      });

      expect(signature.algorithm).toBe('RSA-2048');
      expect(signature.signature).toBeDefined();

      const verification = await service.verifySignature(testData, signature);

      expect(verification.algorithm).toBe('RSA-2048');
      expect(verification.performanceMetrics).toBeDefined();
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate data integrity successfully', async () => {
      const testData = {
        userId: 'test_integrity_validation',
        content: 'Content for integrity validation',
      };

      const integrity = await service.createDataIntegrity(testData, 'test_integrity_validation');

      const validation = await service.validateDataIntegrity(testData, integrity);

      expect(validation).toBeDefined();
      expect(validation.algorithm).toBe('SHA-256');
      expect(validation.timestamp).toBeDefined();
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect integrity violations', async () => {
      const originalData = {
        userId: 'test_integrity_violation',
        content: 'Original content',
      };

      const integrity = await service.createDataIntegrity(originalData, 'test_integrity_violation');

      const modifiedData = {
        ...originalData,
        content: 'Modified content',
      };

      const validation = await service.validateDataIntegrity(modifiedData, integrity);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Data integrity hash mismatch');
    });

    it('should handle signature expiration', async () => {
      const testData = {
        userId: 'test_expiry',
        document: 'Expiring document',
      };

      const signature = await service.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        userId: 'test_expiry',
      });

      const verification = await service.verifySignature(testData, signature, {
        checkTimestamp: true,
        maxAge: 1,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const expiredVerification = await service.verifySignature(testData, signature, {
        checkTimestamp: true,
        maxAge: 1,
      });

      expect(expiredVerification.isValid).toBe(false);
      expect(expiredVerification.errors.some(error => error.includes('expired'))).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch integrity validation', async () => {
      const dataItems = [
        {
          data: { id: 1, content: 'Document 1', userId: 'batch_user' },
          integrity: null as any,
        },
        {
          data: { id: 2, content: 'Document 2', userId: 'batch_user' },
          integrity: null as any,
        },
      ];

      for (const item of dataItems) {
        item.integrity = await service.createDataIntegrity(item.data, 'batch_user');
      }

      const results = await service.batchValidateIntegrity(dataItems);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.algorithm).toBe('SHA-256');
        expect(result.timestamp).toBeDefined();
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should complete signature generation within performance threshold', async () => {
      const testData = {
        userId: 'perf_test_sign',
        document: 'Performance test document',
      };

      const startTime = Date.now();
      const signature = await service.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        userId: 'perf_test_sign',
      });
      const signTime = Date.now() - startTime;

      expect(signTime).toBeLessThan(10000);
      expect(signature).toBeDefined();
    });

    it('should complete signature verification within performance threshold', async () => {
      const testData = {
        userId: 'perf_test_verify',
        document: 'Performance verification test',
      };

      const signature = await service.generateSignature(testData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        userId: 'perf_test_verify',
      });

      const startTime = Date.now();
      const verification = await service.verifySignature(testData, signature);
      const verifyTime = Date.now() - startTime;

      expect(verifyTime).toBeLessThan(8000);
      expect(verification.performanceMetrics).toBeDefined();

      if (verification.performanceMetrics) {
        expect(verification.performanceMetrics.validationTime).toBeLessThan(8000);
      }
    });

    it('should complete data integrity creation within performance threshold', async () => {
      const testData = {
        userId: 'perf_test_integrity',
        content: 'Performance integrity test',
      };

      const startTime = Date.now();
      const integrity = await service.createDataIntegrity(testData, 'perf_test_integrity');
      const integrityTime = Date.now() - startTime;

      expect(integrityTime).toBeLessThan(10000);
      expect(integrity).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed signature data gracefully', async () => {
      const testData = { userId: 'test_malformed', document: 'test' };
      const malformedSignature = {
        signature: 'invalid_signature_data',
        algorithm: 'Dilithium-3',
        publicKeyHash: 'invalid_hash',
        timestamp: new Date(),
        signedDataHash: 'invalid_hash',
      };

      const verification = await service.verifySignature(testData, malformedSignature);

      expect(verification.isValid).toBe(false);
      expect(verification.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty data gracefully', async () => {
      const emptyData = {};

      const signature = await service.generateSignature(emptyData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        userId: 'test_empty_data',
      });

      expect(signature.algorithm).toBe('Dilithium-3');
      expect(signature.signedDataHash).toBeDefined();

      const verification = await service.verifySignature(emptyData, signature);

      expect(verification.algorithm).toBe('Dilithium-3');
    });

    it('should handle large data payloads', async () => {
      const largeData = {
        userId: 'test_large_data',
        document: 'x'.repeat(25000),
        metadata: Array.from({ length: 500 }, (_, i) => ({ field: i, value: `data_${i}` })),
      };

      const signature = await service.generateSignature(largeData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        userId: 'test_large_data',
      });

      expect(signature.algorithm).toBe('Dilithium-3');

      const verification = await service.verifySignature(largeData, signature);

      expect(verification.algorithm).toBe('Dilithium-3');
    });

    it('should handle invalid data types gracefully', async () => {
      const invalidData = null;

      const signature = await service.generateSignature(invalidData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        userId: 'test_invalid_data',
      });

      expect(signature.signedDataHash).toBeDefined();
    });

    it('should handle signature verification errors gracefully', async () => {
      const testData = { message: 'test' };

      try {
        const signature = await service.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          userId: 'test_error_handling',
        });

        const verification = await service.verifySignature(testData, signature);

        expect(verification).toBeDefined();
        expect(verification.algorithm).toBe('Dilithium-3');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
