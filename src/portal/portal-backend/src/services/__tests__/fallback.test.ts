import { Test, TestingModule } from '@nestjs/testing';
import { HybridCryptoService } from '../hybrid-crypto.service';
import { PQCDataEncryptionService } from '../pqc-data-encryption.service';
import { ClassicalCryptoService } from '../classical-crypto.service';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { EnhancedErrorBoundaryService } from '../enhanced-error-boundary.service';
import { PQCBridgeService } from '../pqc-bridge.service';
import { PQCErrorTaxonomyService } from '../pqc-error-taxonomy.service';

describe('Fallback Behavior Validation', () => {
  let hybridService: HybridCryptoService;
  let pqcService: jest.Mocked<PQCDataEncryptionService>;
  let classicalService: jest.Mocked<ClassicalCryptoService>;
  let circuitBreaker: jest.Mocked<CircuitBreakerService>;

  beforeEach(async () => {
    const mockPqcService = {
      encryptData: jest.fn(),
      decryptData: jest.fn(),
    };

    const mockClassicalService = {
      encryptRSA: jest.fn(),
      decryptRSA: jest.fn(),
      signRSA: jest.fn(),
      verifyRSA: jest.fn(),
      generateRSAKeyPair: jest.fn(),
      healthCheck: jest.fn(),
    };

    const mockCircuitBreaker = {
      executeWithCircuitBreaker: jest.fn(),
      isCircuitOpen: jest.fn(),
      getCircuitStats: jest.fn(),
      getHealthStatus: jest.fn(),
    };

    const mockErrorBoundaryService = {
      executeWithErrorBoundary: jest.fn().mockImplementation(async (fn) => await fn()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridCryptoService,
        PQCBridgeService,
        PQCErrorTaxonomyService,
        { provide: PQCDataEncryptionService, useValue: mockPqcService },
        { provide: ClassicalCryptoService, useValue: mockClassicalService },
        { provide: CircuitBreakerService, useValue: mockCircuitBreaker },
        { provide: EnhancedErrorBoundaryService, useValue: mockErrorBoundaryService },
      ],
    }).compile();

    hybridService = module.get<HybridCryptoService>(HybridCryptoService);
    pqcService = module.get(PQCDataEncryptionService);
    classicalService = module.get(ClassicalCryptoService);
    circuitBreaker = module.get(CircuitBreakerService);
  });

  describe('PQC Service Failure Scenarios', () => {
    it('should fallback to RSA when PQC service is completely unavailable', async () => {
      const testData = 'Service unavailable test';
      const publicKey = 'test-public-key';

      circuitBreaker.executeWithCircuitBreaker.mockImplementation(async (circuitName, operation, fallback) => {
        try {
          return await operation();
        } catch (error) {
          if (fallback) {
            return await fallback();
          }
          throw error;
        }
      });

      pqcService.encryptData.mockRejectedValue(new Error('PQC service unavailable'));
      classicalService.encryptRSA.mockResolvedValue({
        encryptedData: 'rsa-fallback-result',
        metadata: { algorithm: 'RSA-2048' },
      });

      const result = await hybridService.encryptWithFallback(testData, publicKey);

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.fallbackUsed).toBe(true);
      expect(result.metadata.fallbackReason).toBe('PQC_SERVICE_UNAVAILABLE');
      expect(classicalService.encryptRSA).toHaveBeenCalledWith(testData, publicKey);
    });

    it('should fallback to RSA when PQC returns unsuccessful result', async () => {
      const testData = 'PQC failure test';
      const publicKey = 'test-public-key';

      circuitBreaker.executeWithCircuitBreaker.mockImplementation(async (circuitName, operation, fallback) => {
        try {
          return await operation();
        } catch (error) {
          if (fallback) {
            return await fallback();
          }
          throw error;
        }
      });

      pqcService.encryptData.mockResolvedValue({
        success: false,
        error: 'Key generation failed',
      });
      classicalService.encryptRSA.mockResolvedValue({
        encryptedData: 'rsa-fallback-result',
        metadata: { algorithm: 'RSA-2048' },
      });

      const result = await hybridService.encryptWithFallback(testData, publicKey);

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.fallbackUsed).toBe(true);
      expect(result.metadata.fallbackReason).toBe('PQC_SERVICE_UNAVAILABLE');
    });

    it('should fallback to RSA when PQC times out', async () => {
      const testData = 'PQC timeout test';
      const publicKey = 'test-public-key';

      circuitBreaker.executeWithCircuitBreaker.mockImplementation(async (circuitName, operation, fallback) => {
        try {
          return await operation();
        } catch (error) {
          if (fallback) {
            return await fallback();
          }
          throw error;
        }
      });

      pqcService.encryptData.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), 100),
        ),
      );
      classicalService.encryptRSA.mockResolvedValue({
        encryptedData: 'rsa-timeout-fallback',
        metadata: { algorithm: 'RSA-2048' },
      });

      const result = await hybridService.encryptWithFallback(testData, publicKey);

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.fallbackUsed).toBe(true);
      expect(result.metadata.fallbackReason).toBe('PQC_SERVICE_UNAVAILABLE');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should use circuit breaker to prevent cascading failures', async () => {
      const testData = 'Circuit breaker test';
      const publicKey = 'test-public-key';

      circuitBreaker.executeWithCircuitBreaker.mockRejectedValue(new Error('Circuit breaker open'));

      classicalService.encryptRSA.mockResolvedValue({
        encryptedData: 'circuit-breaker-fallback',
        metadata: { algorithm: 'RSA-2048' },
      });

      const result = await hybridService.encryptWithFallback(testData, publicKey);

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.fallbackUsed).toBe(true);
      expect(result.metadata.fallbackReason).toBe('PQC_SERVICE_UNAVAILABLE');
    });

    it('should record success when PQC works correctly', async () => {
      const testData = 'Success recording test';
      const publicKey = 'test-public-key';

      circuitBreaker.executeWithCircuitBreaker.mockImplementation(async (circuitName, operation, fallback) => {
        return await operation();
      });

      pqcService.encryptData.mockResolvedValue({
        success: true,
        encryptedField: {
          encryptedData: 'pqc-success-result',
          algorithm: 'ML-KEM-768',
          keyId: 'test-key',
          nonce: 'test-nonce',
          timestamp: new Date(),
        },
        performanceMetrics: {
          encryptionTime: 15,
          keySize: 1184,
        },
      });

      const result = await hybridService.encryptWithFallback(testData, publicKey);

      expect(result.algorithm).toBe('ML-KEM-768');
      expect(result.fallbackUsed).toBe(false);
    });

    it('should record failure when PQC fails', async () => {
      const testData = 'Failure recording test';
      const publicKey = 'test-public-key';

      circuitBreaker.executeWithCircuitBreaker.mockImplementation(async (circuitName, operation, fallback) => {
        try {
          return await operation();
        } catch (error) {
          if (fallback) {
            return await fallback();
          }
          throw error;
        }
      });

      pqcService.encryptData.mockRejectedValue(new Error('PQC failure'));
      classicalService.encryptRSA.mockResolvedValue({
        encryptedData: 'failure-fallback-result',
        metadata: { algorithm: 'RSA-2048' },
      });

      const result = await hybridService.encryptWithFallback(testData, publicKey);

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.fallbackUsed).toBe(true);
    });
  });

  describe('Service Recovery Scenarios', () => {
    it('should switch back to PQC when service recovers', async () => {
      const testData = 'Recovery test';
      const publicKey = 'test-public-key';

      circuitBreaker.executeWithCircuitBreaker.mockImplementation(async (circuitName, operation, fallback) => {
        return await operation();
      });

      pqcService.encryptData.mockResolvedValue({
        success: true,
        encryptedField: {
          encryptedData: 'pqc-recovered-result',
          algorithm: 'ML-KEM-768',
          keyId: 'recovery-key',
          nonce: 'recovery-nonce',
          timestamp: new Date(),
        },
        performanceMetrics: {
          encryptionTime: 12,
          keySize: 1184,
        },
      });

      const result = await hybridService.encryptWithFallback(testData, publicKey);

      expect(result.algorithm).toBe('ML-KEM-768');
      expect(result.fallbackUsed).toBe(false);
      expect(result.ciphertext).toBe('pqc-recovered-result');
    });
  });

  describe('Health Status Monitoring', () => {
    it('should accurately report service health status', async () => {
      pqcService.encryptData.mockResolvedValue({
        success: true,
        encryptedField: {
          encryptedData: 'health-test',
          algorithm: 'ML-KEM-768',
          keyId: 'health-key',
          nonce: 'health-nonce',
          timestamp: new Date(),
        },
        performanceMetrics: {
          encryptionTime: 10,
          keySize: 1184,
        },
      });
      classicalService.healthCheck.mockResolvedValue(undefined);

      const healthStatus = await hybridService.getHealthStatus();

      expect(healthStatus.pqc).toBe(true);
      expect(healthStatus.classical).toBe(true);
      expect(healthStatus.fallbackActive).toBe(false);
    });

    it('should indicate fallback is active when PQC is unhealthy', async () => {
      pqcService.encryptData.mockRejectedValue(new Error('PQC unhealthy'));
      classicalService.healthCheck.mockResolvedValue(undefined);

      const healthStatus = await hybridService.getHealthStatus();

      expect(healthStatus.pqc).toBe(false);
      expect(healthStatus.classical).toBe(true);
      expect(healthStatus.fallbackActive).toBe(true);
    });
  });

  describe('Zero Downtime Validation', () => {
    it('should maintain service availability during PQC outages', async () => {
      const testRequests = Array.from({ length: 10 }, (_, i) => ({
        data: `Request ${i}`,
        publicKey: `key-${i}`,
      }));

      circuitBreaker.executeWithCircuitBreaker.mockImplementation(async (circuitName, operation, fallback) => {
        try {
          return await operation();
        } catch (error) {
          if (fallback) {
            return await fallback();
          }
          throw error;
        }
      });

      pqcService.encryptData.mockRejectedValue(new Error('PQC outage'));
      classicalService.encryptRSA.mockImplementation(async (data) => ({
        encryptedData: `rsa-${data}`,
        metadata: { algorithm: 'RSA-2048' },
      }));

      const results = await Promise.all(
        testRequests.map(req =>
          hybridService.encryptWithFallback(req.data, req.publicKey),
        ),
      );

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.algorithm).toBe('RSA-2048');
        expect(result.fallbackUsed).toBe(true);
        expect(result.ciphertext).toBe(`rsa-Request ${index}`);
      });
    });
  });
});
