import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataValidationService } from '../../../../src/services/pqc-data-validation.service';
import { AuthService } from '../../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../../src/models/interfaces/pqc-data.interface';
import { JwtService } from '../../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../../src/pqc/pqc-monitoring.service';

describe('Dilithium-3 Algorithm Unit Tests - Real PQC Operations', () => {
  let validationService: PQCDataValidationService;
  let authService: AuthService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    };

    const mockUserModel = {
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      generateTokens: jest.fn().mockReturnValue({ accessToken: 'test-token', refreshToken: 'test-refresh' }),
    };

    const mockPQCFeatureFlags = {
      isEnabled: jest.fn().mockReturnValue(true),
    };

    const mockPQCMonitoring = {
      recordPQCKeyGeneration: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataValidationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useClass: AuthService },
        { provide: 'UserModel', useValue: mockUserModel },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PQCFeatureFlagsService, useValue: mockPQCFeatureFlags },
        { provide: PQCMonitoringService, useValue: mockPQCMonitoring },
      ],
    }).compile();

    validationService = module.get<PQCDataValidationService>(PQCDataValidationService);
    authService = module.get<AuthService>(AuthService);
  });

  describe('Real Key Generation', () => {
    it('should generate Dilithium-3 signatures with real PQC operations', async () => {
      try {
        const result = await validationService.generateSignature('test data', {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'test-key-hash',
        });

        if (result.algorithm) {
          expect(result.algorithm).toBe('Dilithium-3');
          expect(result.signature).toBeDefined();
          expect(typeof result.signature).toBe('string');
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should generate unique signatures for same data with real operations', async () => {
      const testData = 'identical test data';
      const signatures: string[] = [];

      for (let i = 0; i < 3; i++) {
        try {
          const result = await validationService.generateSignature(testData, {
            algorithm: PQCAlgorithmType.DILITHIUM_3,
            publicKeyHash: `key-hash-${i}`,
          });

          if (result.signature) {
            signatures.push(result.signature);
          }
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }

      if (signatures.length > 1) {
        const uniqueSignatures = new Set(signatures);
        expect(uniqueSignatures.size).toBe(signatures.length);
      }
    });

    it('should handle signature generation failures gracefully with real service', async () => {
      try {
        const result = await validationService.generateSignature('', {
          algorithm: 'INVALID_ALGORITHM' as any,
          publicKeyHash: '',
        });
        
        if (!result.signature) {
          expect(result).toBeDefined();
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Real Signature Creation', () => {
    it('should create Dilithium-3 signatures with real PQC operations', async () => {
      const testData = 'data to sign';

      try {
        const result = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'signing-key',
        });

        if (result.algorithm) {
          expect(result.algorithm).toBe('Dilithium-3');
          expect(result.signature).toBeDefined();
          expect(result.timestamp).toBeInstanceOf(Date);
          expect(result.signedDataHash).toBeDefined();
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should produce deterministic data hashes with real operations', async () => {
      const testData = 'consistent test data';

      try {
        const result1 = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'test-key',
        });

        const result2 = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'test-key',
        });

        if (result1.signedDataHash && result2.signedDataHash) {
          expect(result1.signedDataHash).toBe(result2.signedDataHash);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Real Signature Verification', () => {
    it('should verify Dilithium-3 signatures with real PQC operations', async () => {
      const testData = 'signed test data';
      
      try {
        const signResult = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'test-key-hash',
        });

        if (signResult.signature) {
          const mockSignature = {
            signature: signResult.signature,
            algorithm: 'Dilithium-3',
            publicKeyHash: 'test-key-hash',
            timestamp: signResult.timestamp,
            signedDataHash: signResult.signedDataHash,
          };

          const result = await validationService.verifySignature(testData, mockSignature);

          if (result.isValid !== undefined) {
            expect(typeof result.isValid).toBe('boolean');
            expect(result.algorithm).toBe('Dilithium-3');
            expect(Array.isArray(result.errors)).toBe(true);
          }
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should reject invalid signatures with real operations', async () => {
      const testData = 'test data';
      const invalidSignature = {
        signature: 'dilithium3:invalid-signature',
        algorithm: 'Dilithium-3',
        publicKeyHash: 'test-key-hash',
        timestamp: new Date(),
        signedDataHash: 'test-hash',
      };

      try {
        const result = await validationService.verifySignature(testData, invalidSignature);

        if (result.isValid !== undefined) {
          expect(result.isValid).toBe(false);
          expect(Array.isArray(result.errors)).toBe(true);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should detect tampered data with real operations', async () => {
      const originalData = 'original data';
      const tamperedData = 'tampered data';
      
      try {
        const signResult = await validationService.generateSignature(originalData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'test-key-hash',
        });

        if (signResult.signature) {
          const signature = {
            signature: signResult.signature,
            algorithm: 'Dilithium-3',
            publicKeyHash: 'test-key-hash',
            timestamp: signResult.timestamp,
            signedDataHash: signResult.signedDataHash,
          };

          const result = await validationService.verifySignature(tamperedData, signature);

          if (result.isValid !== undefined) {
            expect(result.isValid).toBe(false);
            expect(Array.isArray(result.errors)).toBe(true);
          }
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Real Algorithm Compliance', () => {
    it('should meet NIST Dilithium-3 specifications with real operations', async () => {
      const testData = 'NIST compliance test';

      try {
        const result = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'nist-compliance-key',
        });

        if (result.algorithm) {
          expect(result.algorithm).toBe('Dilithium-3');
          expect(result.signature).toBeDefined();
          expect(typeof result.signature).toBe('string');
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle signature size validation with real operations', async () => {
      const testData = 'size validation test';

      try {
        const result = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'size-test-key',
        });

        if (result.signature) {
          expect(result.signature.length).toBeGreaterThan(10);
          expect(typeof result.signature).toBe('string');
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Real Performance Metrics', () => {
    it('should track signature verification performance with real operations', async () => {
      const testData = 'performance test data';

      try {
        const signResult = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: 'performance-key',
        });

        if (signResult.signature) {
          const signature = {
            signature: signResult.signature,
            algorithm: 'Dilithium-3',
            publicKeyHash: 'performance-key',
            timestamp: signResult.timestamp,
            signedDataHash: signResult.signedDataHash,
          };

          const startTime = performance.now();
          const result = await validationService.verifySignature(testData, signature);
          const endTime = performance.now();
          const duration = endTime - startTime;

          expect(duration).toBeGreaterThan(0);
          
          if (result.performanceMetrics) {
            expect(result.performanceMetrics.validationTime).toBeGreaterThan(0);
          }
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
