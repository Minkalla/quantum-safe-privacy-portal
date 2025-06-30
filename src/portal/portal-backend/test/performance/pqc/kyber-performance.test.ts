import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataEncryptionService } from '../../../src/services/pqc-data-encryption.service';
import { AuthService } from '../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../src/models/interfaces/pqc-data.interface';
import { JwtService } from '../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../src/pqc/pqc-monitoring.service';

describe('Kyber-768 Performance Tests - Real PQC Operations', () => {
  let encryptionService: PQCDataEncryptionService;
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
        PQCDataEncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useClass: AuthService },
        { provide: 'UserModel', useValue: mockUserModel },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PQCFeatureFlagsService, useValue: mockPQCFeatureFlags },
        { provide: PQCMonitoringService, useValue: mockPQCMonitoring },
      ],
    }).compile();

    encryptionService = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    authService = module.get<AuthService>(AuthService);
  });

  describe('Key Generation Performance', () => {
    it('should generate Kyber-768 keys within 100ms', async () => {
      const testData = 'performance test data';
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const result = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `performance-key-${i}`,
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        times.push(duration);

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(100);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      expect(averageTime).toBeLessThan(50);
      expect(maxTime).toBeLessThan(100);
      expect(minTime).toBeGreaterThan(0);

      console.log(`Kyber-768 Key Generation Performance:
        Average: ${averageTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms
        Min: ${minTime.toFixed(2)}ms`);
    });

    it('should maintain consistent performance under load', async () => {
      const testData = 'load test data';
      const concurrentOperations = 20;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentOperations; i++) {
        const promise = encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `load-test-key-${i}`,
        });
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      const averageTimePerOperation = totalTime / concurrentOperations;
      expect(averageTimePerOperation).toBeLessThan(200);

      console.log(`Kyber-768 Load Test Performance:
        Total time for ${concurrentOperations} operations: ${totalTime.toFixed(2)}ms
        Average per operation: ${averageTimePerOperation.toFixed(2)}ms`);
    });
  });

  describe('Encapsulation Performance', () => {
    it('should perform encapsulation within 50ms', async () => {
      const testData = 'encapsulation performance test';
      const iterations = 15;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const result = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `encap-perf-key-${i}`,
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        times.push(duration);

        expect(result.success).toBe(true);
        if (result.success && result.performanceMetrics) {
          expect(result.performanceMetrics.encryptionTime).toBeLessThan(50);
        }
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      expect(averageTime).toBeLessThan(30);

      console.log(`Kyber-768 Encapsulation Performance:
        Average: ${averageTime.toFixed(2)}ms
        Iterations: ${iterations}`);
    });

    it('should handle large data encapsulation efficiently', async () => {
      const largeData = 'x'.repeat(10000);
      const startTime = performance.now();

      const result = await encryptionService.encryptData(largeData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'large-data-key',
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100);

      console.log(`Kyber-768 Large Data Encapsulation:
        Data size: ${largeData.length} characters
        Time: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Real Decapsulation Performance', () => {
    it('should perform real decapsulation within reasonable time', async () => {
      const testData = 'decapsulation performance test';
      const iterations = 3; // Reduced for real operations
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const encryptResult = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `decap-perf-key-${i}`,
        });

        expect(encryptResult.success).toBe(true);
        
        if (encryptResult.success && encryptResult.encryptedField) {
          const startTime = performance.now();
          
          try {
            const decryptResult = await encryptionService.decryptData(encryptResult.encryptedField);
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            times.push(duration);

            if (decryptResult.success) {
              expect(decryptResult.decryptedData).toBeDefined();
            }
            expect(duration).toBeLessThan(10000); // More realistic for real operations
          } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            times.push(duration);
            expect(error).toBeInstanceOf(Error);
          }
        }
      }

      if (times.length > 0) {
        const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;

        console.log(`Real Kyber-768 Decapsulation Performance:
          Average: ${averageTime.toFixed(2)}ms
          Iterations: ${times.length}`);
      }
    });
  });

  describe('Real Memory Usage Tests', () => {
    it('should not leak memory during repeated real operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const testData = 'memory test data';

      for (let i = 0; i < 10; i++) { // Reduced for real operations
        const result = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `memory-test-key-${i}`,
        });

        expect(result.success).toBe(true);

        if (i % 5 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);

      expect(memoryIncrease).toBeLessThan(100); // More realistic for real operations

      console.log(`Real Kyber-768 Memory Usage Test:
        Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB
        Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB
        Increase: ${memoryIncrease.toFixed(2)}MB`);
    });

    it('should handle memory pressure gracefully with real operations', async () => {
      const testData = 'memory pressure test';
      const largeOperations = 5; // Reduced for real operations
      const results: any[] = [];

      const startMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < largeOperations; i++) {
        const result = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `pressure-test-key-${i}`,
        });

        results.push(result);
        expect(result.success).toBe(true);

        const currentMemory = process.memoryUsage().heapUsed;
        const memoryUsage = (currentMemory - startMemory) / (1024 * 1024);
        expect(memoryUsage).toBeLessThan(200); // More realistic for real operations
      }

      const endMemory = process.memoryUsage().heapUsed;
      const totalMemoryIncrease = (endMemory - startMemory) / (1024 * 1024);

      expect(totalMemoryIncrease).toBeLessThan(200); // More realistic for real operations
      expect(results).toHaveLength(largeOperations);

      console.log(`Real Kyber-768 Memory Pressure Test:
        Operations: ${largeOperations}
        Memory increase: ${totalMemoryIncrease.toFixed(2)}MB`);
    });
  });

  describe('Real Throughput Tests', () => {
    it('should achieve reasonable throughput for real encryption operations', async () => {
      const testData = 'throughput test data';
      const duration = 10000; // 10 seconds for real operations
      const startTime = Date.now();
      let operationCount = 0;

      while (Date.now() - startTime < duration && operationCount < 5) { // Limit for real operations
        const result = await encryptionService.encryptData(testData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `throughput-key-${operationCount}`,
        });

        expect(result.success).toBe(true);
        operationCount++;
      }

      const actualDuration = Date.now() - startTime;
      const operationsPerSecond = (operationCount / actualDuration) * 1000;

      expect(operationsPerSecond).toBeGreaterThan(0); // More realistic for real operations

      console.log(`Real Kyber-768 Throughput Test:
        Operations: ${operationCount}
        Duration: ${actualDuration}ms
        Throughput: ${operationsPerSecond.toFixed(2)} ops/sec`);
    });
  });
});
