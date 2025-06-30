import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataValidationService } from '../../../src/services/pqc-data-validation.service';
import { AuthService } from '../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../src/models/interfaces/pqc-data.interface';

describe('Dilithium-3 Performance Tests', () => {
  let validationService: PQCDataValidationService;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    };

    const mockAuthService = {
      callPythonPQCService: jest.fn().mockImplementation((operation: string) => {
        if (operation === 'sign_token') {
          return Promise.resolve({
            success: true,
            token: `dilithium3-performance-signature-${Math.random()}`,
            algorithm: 'ML-DSA-65',
          });
        } else if (operation === 'verify_token') {
          return Promise.resolve({
            success: true,
            verified: true,
          });
        }
        return Promise.resolve({ success: false });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataValidationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    validationService = module.get<PQCDataValidationService>(PQCDataValidationService);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  describe('Signature Generation Performance', () => {
    it('should generate Dilithium-3 signatures within 200ms', async () => {
      const testData = 'performance signature test';
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const result = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `performance-key-${i}`,
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        times.push(duration);

        expect(result.algorithm).toBe('Dilithium-3');
        expect(duration).toBeLessThan(200);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      expect(averageTime).toBeLessThan(100);
      expect(maxTime).toBeLessThan(200);

      console.log(`Dilithium-3 Signature Generation Performance:
        Average: ${averageTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms
        Min: ${minTime.toFixed(2)}ms`);
    });

    it('should maintain performance under concurrent signing', async () => {
      const testData = 'concurrent signature test';
      const concurrentOperations = 15;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentOperations; i++) {
        const promise = validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `concurrent-key-${i}`,
        });
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      results.forEach(result => {
        expect(result.algorithm).toBe('Dilithium-3');
      });

      const averageTimePerOperation = totalTime / concurrentOperations;
      expect(averageTimePerOperation).toBeLessThan(300);

      console.log(`Dilithium-3 Concurrent Signing Performance:
        Total time for ${concurrentOperations} operations: ${totalTime.toFixed(2)}ms
        Average per operation: ${averageTimePerOperation.toFixed(2)}ms`);
    });
  });

  describe('Signature Verification Performance', () => {
    it('should verify Dilithium-3 signatures within 100ms', async () => {
      const testData = 'verification performance test';
      const iterations = 15;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const signature = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `verify-perf-key-${i}`,
        });

        const startTime = performance.now();
        
        const result = await validationService.verifySignature(testData, signature);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        times.push(duration);

        expect(result.isValid).toBe(true);
        expect(duration).toBeLessThan(100);
        expect(result.performanceMetrics?.validationTime).toBeLessThan(100);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      expect(averageTime).toBeLessThan(50);

      console.log(`Dilithium-3 Signature Verification Performance:
        Average: ${averageTime.toFixed(2)}ms
        Iterations: ${iterations}`);
    });

    it('should handle batch verification efficiently', async () => {
      const testData = 'batch verification test';
      const batchSize = 10;
      const signatures: any[] = [];

      for (let i = 0; i < batchSize; i++) {
        const signature = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `batch-key-${i}`,
        });
        signatures.push(signature);
      }

      const startTime = performance.now();

      const verificationPromises = signatures.map(signature =>
        validationService.verifySignature(testData, signature)
      );

      const results = await Promise.all(verificationPromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });

      const averageTimePerVerification = totalTime / batchSize;
      expect(averageTimePerVerification).toBeLessThan(150);

      console.log(`Dilithium-3 Batch Verification Performance:
        Batch size: ${batchSize}
        Total time: ${totalTime.toFixed(2)}ms
        Average per verification: ${averageTimePerVerification.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during signature operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const testData = 'memory test signature';

      for (let i = 0; i < 500; i++) {
        const signature = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `memory-test-key-${i}`,
        });

        const verifyResult = await validationService.verifySignature(testData, signature);
        expect(verifyResult.isValid).toBe(true);

        if (i % 50 === 0) {
          global.gc && global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);

      expect(memoryIncrease).toBeLessThan(50);

      console.log(`Dilithium-3 Memory Usage Test:
        Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB
        Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB
        Increase: ${memoryIncrease.toFixed(2)}MB`);
    });
  });

  describe('Throughput Tests', () => {
    it('should achieve target throughput for signature operations', async () => {
      const testData = 'throughput signature test';
      const duration = 3000;
      const startTime = Date.now();
      let signatureCount = 0;

      while (Date.now() - startTime < duration) {
        const signature = await validationService.generateSignature(testData, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `throughput-key-${signatureCount}`,
        });

        expect(signature.algorithm).toBe('Dilithium-3');
        signatureCount++;
      }

      const actualDuration = Date.now() - startTime;
      const signaturesPerSecond = (signatureCount / actualDuration) * 1000;

      expect(signaturesPerSecond).toBeGreaterThan(5);

      console.log(`Dilithium-3 Signature Throughput Test:
        Signatures: ${signatureCount}
        Duration: ${actualDuration}ms
        Throughput: ${signaturesPerSecond.toFixed(2)} sigs/sec`);
    });
  });
});
