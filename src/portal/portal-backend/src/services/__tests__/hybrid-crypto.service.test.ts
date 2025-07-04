import { Test, TestingModule } from '@nestjs/testing';
import { HybridCryptoService } from '../hybrid-crypto.service';
import { PQCDataEncryptionService } from '../pqc-data-encryption.service';
import { ClassicalCryptoService } from '../classical-crypto.service';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { EnhancedErrorBoundaryService } from '../enhanced-error-boundary.service';
import { PQCBridgeService } from '../pqc-bridge.service';
import { PQCErrorTaxonomyService } from '../pqc-error-taxonomy.service';
import { PQCAlgorithmType } from '../../models/interfaces/pqc-data.interface';

describe('HybridCryptoService', () => {
  let service: HybridCryptoService;
  let pqcService: jest.Mocked<PQCDataEncryptionService>;
  let classicalService: jest.Mocked<ClassicalCryptoService>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;
  let errorBoundaryService: jest.Mocked<EnhancedErrorBoundaryService>;

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

    const mockCircuitBreakerService = {
      executeWithCircuitBreaker: jest.fn(),
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
      getState: jest.fn(),
      isOpen: jest.fn(),
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
        { provide: CircuitBreakerService, useValue: mockCircuitBreakerService },
        { provide: EnhancedErrorBoundaryService, useValue: mockErrorBoundaryService },
      ],
    }).compile();

    service = module.get<HybridCryptoService>(HybridCryptoService);
    pqcService = module.get(PQCDataEncryptionService);
    classicalService = module.get(ClassicalCryptoService);
    circuitBreakerService = module.get(CircuitBreakerService);
    errorBoundaryService = module.get(EnhancedErrorBoundaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encryptWithFallback', () => {
    it('should use PQC encryption when available', async () => {
      const testData = 'test data';
      const publicKey = 'test-public-key';
      const mockPqcResult = {
        success: true,
        encryptedField: {
          encryptedData: 'pqc-encrypted-data',
          keyId: 'test-key-id',
          algorithm: 'ML-KEM-768',
          nonce: 'test-nonce',
          timestamp: new Date(),
        },
        performanceMetrics: {
          encryptionTime: 0.1,
          keySize: 1184,
        },
      };

      const mockHybridResult = {
        algorithm: 'ML-KEM-768' as const,
        ciphertext: 'pqc-encrypted-data',
        fallbackUsed: false,
        metadata: {
          keyId: 'test-key-id',
          timestamp: expect.any(String),
          performance: mockPqcResult.performanceMetrics,
        },
      };

      pqcService.encryptData.mockResolvedValue(mockPqcResult);
      
      errorBoundaryService.executeWithErrorBoundary.mockImplementation(async (fn, options) => {
        return await fn();
      });

      const result = await service.encryptWithFallback(testData, publicKey);

      expect(result.algorithm).toBe('ML-KEM-768');
      expect(result.ciphertext).toBe('pqc-encrypted-data');
      expect(result.fallbackUsed).toBe(false);
      expect(result.metadata.keyId).toBe('test-key-id');
    });

    it('should fallback to RSA when PQC fails', async () => {
      const testData = 'test data';
      const publicKey = 'test-public-key';
      const mockClassicalResult = {
        encryptedData: 'rsa-encrypted-data',
        algorithm: 'RSA-2048',
      };

      circuitBreakerService.executeWithCircuitBreaker.mockRejectedValue(new Error('PQC_SERVICE_UNAVAILABLE'));
      classicalService.encryptRSA.mockResolvedValue(mockClassicalResult);

      const result = await service.encryptWithFallback(testData, publicKey);

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.ciphertext).toBe('rsa-encrypted-data');
      expect(result.fallbackUsed).toBe(true);
      expect(result.metadata.fallbackReason).toBe('PQC_SERVICE_UNAVAILABLE');
      expect(classicalService.encryptRSA).toHaveBeenCalledWith(testData, publicKey);
    });

    it('should fallback to RSA when PQC returns unsuccessful result', async () => {
      const testData = 'test data';
      const publicKey = 'test-public-key';
      const mockClassicalResult = {
        encryptedData: 'rsa-encrypted-data',
        algorithm: 'RSA-2048',
      };

      circuitBreakerService.executeWithCircuitBreaker.mockRejectedValue(new Error('Key generation failed'));
      classicalService.encryptRSA.mockResolvedValue(mockClassicalResult);

      const result = await service.encryptWithFallback(testData, publicKey);

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.ciphertext).toBe('rsa-encrypted-data');
      expect(result.fallbackUsed).toBe(true);
      expect(result.metadata.fallbackReason).toBe('PQC_SERVICE_UNAVAILABLE');
    });
  });

  describe('decryptWithFallback', () => {
    it('should decrypt PQC-encrypted data', async () => {
      const encryptedData = {
        algorithm: 'ML-KEM-768' as const,
        ciphertext: 'pqc-encrypted-data',
        metadata: { keyId: 'test-key-id' },
      };
      const privateKey = 'test-private-key';
      const mockDecryptResult = {
        success: true,
        decryptedData: 'decrypted data',
      };

      pqcService.decryptData.mockResolvedValue(mockDecryptResult);

      const result = await service.decryptWithFallback(encryptedData, privateKey);

      expect(result).toBe('decrypted data');
      expect(pqcService.decryptData).toHaveBeenCalledWith({
        encryptedData: 'pqc-encrypted-data',
        algorithm: PQCAlgorithmType.ML_KEM_768.toString(),
        keyId: privateKey,
        nonce: '',
        timestamp: expect.any(Date),
        metadata: { keyId: 'test-key-id' },
      });
    });

    it('should decrypt RSA-encrypted data', async () => {
      const encryptedData = {
        algorithm: 'RSA-2048' as const,
        ciphertext: 'rsa-encrypted-data',
      };
      const privateKey = 'test-private-key';
      const mockDecryptResult = {
        encryptedData: 'decrypted data',
        algorithm: 'RSA-2048',
      };

      classicalService.decryptRSA.mockResolvedValue(mockDecryptResult);

      const result = await service.decryptWithFallback(encryptedData, privateKey);

      expect(result).toBe('decrypted data');
      expect(classicalService.decryptRSA).toHaveBeenCalledWith('rsa-encrypted-data', privateKey);
    });

    it('should throw error for unknown algorithm', async () => {
      const encryptedData = {
        algorithm: 'UNKNOWN' as any,
        ciphertext: 'encrypted-data',
      };
      const privateKey = 'test-private-key';

      await expect(service.decryptWithFallback(encryptedData, privateKey))
        .rejects.toThrow('Unknown encryption algorithm: UNKNOWN');
    });
  });

  describe('generateKeyPairWithFallback', () => {
    it('should fallback to RSA key generation when PQC is not available', async () => {
      const mockRSAKeyPair = {
        publicKey: 'rsa-public-key',
        privateKey: 'rsa-private-key',
      };

      classicalService.generateRSAKeyPair.mockResolvedValue(mockRSAKeyPair);

      const result = await service.generateKeyPairWithFallback();

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.publicKey).toBe('rsa-public-key');
      expect(result.privateKey).toBe('rsa-private-key');
      expect(classicalService.generateRSAKeyPair).toHaveBeenCalled();
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status for both services', async () => {
      const mockPqcResult = {
        success: true,
        encryptedField: {
          encryptedData: 'test',
          algorithm: 'AES-256-GCM',
          keyId: 'test-key',
          nonce: 'test-nonce',
          timestamp: new Date(),
        },
        performanceMetrics: {
          encryptionTime: 0.1,
          keySize: 256,
        },
      };

      pqcService.encryptData.mockResolvedValue(mockPqcResult);
      classicalService.healthCheck.mockResolvedValue(undefined);

      const result = await service.getHealthStatus();

      expect(result.pqc).toBe(true);
      expect(result.classical).toBe(true);
      expect(result.fallbackActive).toBe(false);
    });

    it('should indicate fallback is active when PQC is unhealthy', async () => {
      pqcService.encryptData.mockRejectedValue(new Error('PQC service down'));
      classicalService.healthCheck.mockResolvedValue(undefined);

      const result = await service.getHealthStatus();

      expect(result.pqc).toBe(false);
      expect(result.classical).toBe(true);
      expect(result.fallbackActive).toBe(true);
    });
  });
});
