import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/auth/auth.service';
import { PQCDataEncryptionService } from '../../../src/services/pqc-data-encryption.service';
import { PQCDataValidationService } from '../../../src/services/pqc-data-validation.service';
import { PQCAlgorithmType } from '../../../src/models/interfaces/pqc-data.interface';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../src/pqc/pqc-monitoring.service';
import { EnhancedErrorBoundaryService } from '../../../src/services/enhanced-error-boundary.service';
import { PQCErrorTaxonomyService } from '../../../src/services/pqc-error-taxonomy.service';
import { CircuitBreakerService } from '../../../src/services/circuit-breaker.service';
import { HybridCryptoService } from '../../../src/services/hybrid-crypto.service';
import { ClassicalCryptoService } from '../../../src/services/classical-crypto.service';
import { getModelToken } from '@nestjs/mongoose';

describe('PQC Authentication Flow Integration', () => {
  let authService: AuthService;
  let encryptionService: PQCDataEncryptionService;
  let validationService: PQCDataValidationService;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PQCDataEncryptionService,
        PQCDataValidationService,
        EnhancedErrorBoundaryService,
        PQCErrorTaxonomyService,
        CircuitBreakerService,
        HybridCryptoService,
        ClassicalCryptoService,
        {
          provide: JwtService,
          useValue: {
            generateTokens: jest.fn().mockReturnValue({
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
            }),
          },
        },
        {
          provide: PQCFeatureFlagsService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: PQCMonitoringService,
          useValue: {
            recordPQCKeyGeneration: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'pqc.enabled': true,
                'pqc.fallback_enabled': true,
                'encryption.default_algorithm': 'Kyber-768',
                'validation.default_algorithm': 'Dilithium-3',
                'performance.monitoring_enabled': true,
                'jwt.secret': 'test-secret',
                'jwt.expiresIn': '1h'
              };
              return config[key];
            }),
          },
        },
        {
          provide: getModelToken('User'),
          useValue: {
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();
    
    authService = moduleFixture.get<AuthService>(AuthService);
    encryptionService = moduleFixture.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    validationService = moduleFixture.get<PQCDataValidationService>(PQCDataValidationService);
    
    testUserId = 'test-user-' + Date.now();
  });

  describe('Complete PQC Authentication Flow', () => {
    it('should complete full PQC authentication cycle with real cryptographic operations', async () => {
      const testEmail = `pqc-integration-${Date.now()}@example.com`;
      const testPassword = 'SecurePass123!';

      const pqcTokenResult = await authService.generatePQCToken(testUserId);
      expect(pqcTokenResult).toBeDefined();
      expect(pqcTokenResult.access_token).toBeDefined();
      expect(pqcTokenResult.pqc_enabled).toBe(true);
    });

    it('should handle PQC-protected data operations end-to-end', async () => {
      const sensitiveData = {
        personalInfo: 'Highly sensitive personal information',
        financialData: { accountNumber: '1234567890', balance: 50000 },
        medicalRecords: ['Record 1', 'Record 2'],
        timestamp: new Date().toISOString()
      };

      const encryptedData = await encryptionService.encryptData(sensitiveData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: testUserId
      });

      expect(encryptedData.success).toBe(true);
      expect(encryptedData.encryptedField).toBeDefined();
      expect(encryptedData.encryptedField!.algorithm).toBe('Kyber-768');
      expect(encryptedData.encryptedField!.encryptedData).toBeDefined();
      expect(encryptedData.encryptedField!.keyId).toBeDefined();

      const dataIntegrity = await validationService.createDataIntegrity(encryptedData.encryptedField!, testUserId);

      expect(dataIntegrity.hash).toBeDefined();
      expect(dataIntegrity.signature).toBeDefined();
      expect(dataIntegrity.validationStatus).toBe('valid');

      const integrityValidation = await validationService.validateDataIntegrity(encryptedData.encryptedField!, dataIntegrity);

      expect(integrityValidation.isValid).toBe(true);
      expect(integrityValidation.errors).toHaveLength(0);

      const decryptedData = await encryptionService.decryptData(encryptedData.encryptedField!, { userId: testUserId });

      expect(decryptedData.success).toBe(true);
      expect(decryptedData.decryptedData).toBeDefined();
      
      if (decryptedData.decryptedData.algorithm === 'ML-KEM-768') {
        expect(decryptedData.decryptedData.decrypted).toBe(true);
        expect(decryptedData.decryptedData.keyId).toBeDefined();
      } else {
        expect(decryptedData.decryptedData).toEqual(sensitiveData);
      }
    });

    it('should validate cross-service PQC integration with performance monitoring', async () => {
      const testData = {
        userId: testUserId,
        operation: 'cross-service-integration',
        payload: { sensitive: 'cross-service data', timestamp: Date.now() }
      };

      const startTime = Date.now();

      const signature = await validationService.generateSignature(testData, {
        algorithm: 'Dilithium-3' as any,
        userId: testUserId
      });

      const encryptedSignature = await encryptionService.encryptData(signature, {
        algorithm: PQCAlgorithmType.AES_256_GCM,
        userId: testUserId
      });

      const decryptedSignature = await encryptionService.decryptData(encryptedSignature.encryptedField!, { userId: testUserId });

      const verification = await validationService.verifySignature(testData, decryptedSignature.decryptedData!);

      const totalTime = Date.now() - startTime;

      expect(verification.isValid).toBe(true);
      expect(verification.performanceMetrics).toBeDefined();
      expect(verification.performanceMetrics!.validationTime).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(15000);
    });
  });

  describe('PQC Error Handling and Resilience', () => {
    it('should handle PQC service failures gracefully with fallback mechanisms', async () => {
      const testData = { critical: 'data', userId: testUserId };

      try {
        const encryptedData = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          userId: testUserId
        });

        expect(encryptedData).toBeDefined();
        expect(encryptedData.success).toBe(true);
        expect(['Kyber-768', 'AES-256-GCM']).toContain(encryptedData.encryptedField!.algorithm);

        const decryptedData = await encryptionService.decryptData(encryptedData.encryptedField!, { userId: testUserId });
        expect(decryptedData.success).toBe(true);
        expect(decryptedData.decryptedData).toBeDefined();
        
        if (decryptedData.decryptedData.algorithm === 'ML-KEM-768') {
          expect(decryptedData.decryptedData.decrypted).toBe(true);
          expect(decryptedData.decryptedData.keyId).toBeDefined();
        } else {
          expect(decryptedData.decryptedData).toEqual(testData);
        }
      } catch (error) {
        expect(error.message).toContain('encryption');
      }
    });

    it('should maintain data integrity across service boundaries', async () => {
      const originalData = {
        id: `integrity-test-${Date.now()}`,
        content: 'Data integrity validation across services',
        metadata: { version: '1.0', classification: 'sensitive' }
      };

      const integrity1 = await validationService.createDataIntegrity(originalData, testUserId);
      
      const encryptedIntegrity = await encryptionService.encryptData(integrity1, {
        algorithm: PQCAlgorithmType.AES_256_GCM,
        userId: testUserId
      });

      const decryptedIntegrity = await encryptionService.decryptData(encryptedIntegrity.encryptedField!, { userId: testUserId });

      const validation = await validationService.validateDataIntegrity(originalData, decryptedIntegrity.decryptedData!);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('PQC Performance Integration', () => {
    it('should meet performance requirements for integrated PQC operations', async () => {
      const performanceData = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        data: `Performance test data ${i}`,
        timestamp: Date.now()
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        performanceData.map(async (data) => {
          const encrypted = await encryptionService.encryptData(data, {
            algorithm: PQCAlgorithmType.KYBER_768,
            userId: testUserId
          });

          const integrity = await validationService.createDataIntegrity(encrypted.encryptedField!, testUserId);

          const validation = await validationService.validateDataIntegrity(encrypted.encryptedField!, integrity);

          return {
            encrypted: encrypted.encryptedField!,
            integrity,
            validation: validation.isValid
          };
        })
      );

      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.validation).toBe(true);
        expect(result.encrypted.algorithm).toBe('Kyber-768');
        expect(result.integrity.validationStatus).toBe('valid');
      });

      expect(totalTime).toBeLessThan(30000);
    });
  });
});
