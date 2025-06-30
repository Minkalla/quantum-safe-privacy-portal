# PQC Testing Troubleshooting Guide

**Document ID**: PQC-TESTING-TROUBLESHOOT-v1.0  
**Created**: June 30, 2025  
**Purpose**: Comprehensive troubleshooting guide for PQC testing framework issues  
**Audience**: Engineers debugging PQC testing problems

## 🚨 **CRITICAL ISSUES & IMMEDIATE SOLUTIONS**

### Issue #1: "Property 'callPythonPQCService' is private and only accessible within class 'AuthService'"

**Symptoms**:
```typescript
ERROR: Property 'callPythonPQCService' is private and only accessible within class 'AuthService'
ERROR: Property 'mockResolvedValue' does not exist on type '(operation: string, params: any) => Promise<any>'
```

**Root Cause**: Attempting to mock private methods or use Jest mocks on real PQC operations.

**IMMEDIATE SOLUTION**:
```typescript
// ❌ WRONG - Don't do this
authService.callPythonPQCService.mockResolvedValue(fakeResult);

// ✅ CORRECT - Use real service integration
const module: TestingModule = await Test.createTestingModule({
  providers: [
    PQCDataEncryptionService,
    { provide: AuthService, useClass: AuthService }, // Real service
    { provide: ConfigService, useValue: mockConfigService },
  ],
}).compile();

const service = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
// Use real service calls - no mocking
```

### Issue #2: Test Timeouts with Real PQC Operations

**Symptoms**:
```
Timeout - Async callback was not invoked within the 5000ms timeout
```

**Root Cause**: Real cryptographic operations take longer than default Jest timeouts.

**IMMEDIATE SOLUTION**:
```json
// package.json - Update test scripts with appropriate timeouts
{
  "scripts": {
    "test:unit:pqc": "jest test/unit/pqc --testTimeout=30000",
    "test:integration:pqc": "jest test/integration/pqc --testTimeout=60000",
    "test:performance:pqc": "jest test/performance/pqc --testTimeout=120000",
    "test:security:pqc": "jest test/security/pqc --testTimeout=60000"
  }
}
```

### Issue #3: "Cannot find module" Errors

**Symptoms**:
```
Cannot find module '../../../src/services/pqc-data-encryption.service'
```

**Root Cause**: Incorrect import paths in test files.

**IMMEDIATE SOLUTION**:
```typescript
// ✅ CORRECT import pattern for PQC tests
import { PQCDataEncryptionService } from '../../../src/services/pqc-data-encryption.service';
import { AuthService } from '../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../src/models/interfaces/pqc-data.interface';
```

## 🔧 **COMMON TESTING PATTERNS**

### Pattern 1: Real PQC Service Setup

```typescript
// Standard setup for all PQC tests
describe('PQC Service Tests', () => {
  let service: PQCDataEncryptionService;
  let authService: AuthService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataEncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useClass: AuthService }, // REAL service
      ],
    }).compile();

    service = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    authService = module.get<AuthService>(AuthService);
  });

  it('should perform real PQC operations', async () => {
    // Use real service calls - no mocking
    const result = await service.encryptData('test data', {
      algorithm: PQCAlgorithmType.KYBER_768,
      publicKeyHash: 'test-key',
    });

    expect(result.success).toBe(true);
    // Validate real cryptographic results
  });
});
```

### Pattern 2: Performance Testing with Real Operations

```typescript
// Performance testing pattern
it('should meet NIST performance thresholds', async () => {
  const iterations = 10;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    // Real PQC operation
    const result = await service.generateKyberKeyPair();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    times.push(duration);

    // Validate real results
    expect(result.publicKey).toHaveLength(1184); // NIST spec
    expect(duration).toBeLessThan(100); // Performance threshold
  }

  const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  expect(averageTime).toBeLessThan(50); // Average performance
});
```

### Pattern 3: Error Handling with Real Services

```typescript
// Real error handling testing
it('should handle real PQC operation failures', async () => {
  try {
    // Attempt operation with invalid parameters
    const result = await service.encryptData('', {
      algorithm: 'INVALID_ALGORITHM' as any,
      publicKeyHash: '',
    });
    
    fail('Should have thrown error for invalid parameters');
  } catch (error) {
    // Validate real error conditions
    expect(error.message).toContain('Invalid algorithm');
    expect(error).toBeInstanceOf(Error);
  }
});
```

## 🐛 **DEBUGGING STRATEGIES**

### Strategy 1: Enable Detailed Logging

```typescript
// Add logging to understand real PQC operation flow
beforeEach(() => {
  // Enable debug logging for PQC operations
  process.env.PQC_DEBUG = 'true';
  process.env.LOG_LEVEL = 'debug';
});

afterEach(() => {
  // Clean up debug settings
  delete process.env.PQC_DEBUG;
  delete process.env.LOG_LEVEL;
});
```

### Strategy 2: Isolate PQC Service Issues

```typescript
// Test PQC service independently
describe('PQC Service Isolation Tests', () => {
  it('should verify AuthService.callPythonPQCService works', async () => {
    const authService = new AuthService(configService);
    
    // Direct service call test
    const result = await authService.callPythonPQCService('get_status', {});
    
    expect(result.success).toBe(true);
    console.log('PQC Service Status:', result);
  });
});
```

### Strategy 3: Memory Leak Detection

```typescript
// Memory monitoring for performance tests
describe('Memory Leak Detection', () => {
  it('should not leak memory during repeated operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform many operations
    for (let i = 0; i < 100; i++) {
      const result = await service.encryptData(`test-${i}`, config);
      expect(result.success).toBe(true);
      
      // Force garbage collection periodically
      if (i % 10 === 0 && global.gc) {
        global.gc();
      }
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);
    
    expect(memoryIncrease).toBeLessThan(50); // Max 50MB increase
  });
});
```

## 🚫 **WHAT NOT TO DO**

### ❌ Never Mock PQC Operations

```typescript
// ❌ WRONG - This defeats the purpose of PQC testing
jest.mock('../../../src/auth/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    callPythonPQCService: jest.fn().mockResolvedValue({
      success: true,
      publicKey: 'fake-key', // This is meaningless for crypto validation
    }),
  })),
}));
```

### ❌ Never Use Fake Cryptographic Data

```typescript
// ❌ WRONG - Fake data tells us nothing about real PQC
const fakeResult = {
  success: true,
  publicKey: 'fake-public-key',
  secretKey: 'fake-secret-key',
};

// ✅ CORRECT - Validate real cryptographic properties
expect(result.publicKey).toHaveLength(1184); // Real NIST ML-KEM-768 spec
expect(result.secretKey).toHaveLength(2400); // Real NIST ML-KEM-768 spec
```

### ❌ Never Skip Performance Validation

```typescript
// ❌ WRONG - Not testing real performance
it('should be fast', async () => {
  const result = await mockService.fastOperation();
  expect(result).toBeDefined(); // Meaningless for performance
});

// ✅ CORRECT - Real performance validation
it('should meet NIST performance requirements', async () => {
  const startTime = performance.now();
  const result = await realService.generateKyberKeyPair();
  const duration = performance.now() - startTime;
  
  expect(duration).toBeLessThan(100); // Real NIST threshold
});
```

## 🔍 **DIAGNOSTIC COMMANDS**

### Check PQC Service Health

```bash
# Verify Python PQC service is operational
cd src/portal/mock-qynauth/src/python_app
python3 -c "
from pqc_bindings import PQCLibraryV2, KyberKeyPair
lib = PQCLibraryV2()
kp = KyberKeyPair(lib)
print('PQC Service OK')
"
```

### Test Individual Components

```bash
# Test specific PQC test categories
npm run test:unit:pqc:algorithms     # Algorithm tests only
npm run test:unit:pqc:services       # Service tests only
npm run test:integration:pqc         # Integration tests only
npm run test:performance:pqc         # Performance tests only
npm run test:security:pqc           # Security tests only
```

### Generate Detailed Test Reports

```bash
# Generate comprehensive test report with real operation metrics
npm run test:report:pqc

# View generated reports
ls -la test-reports/
cat test-reports/pqc-test-report.json
```

## 📊 **PERFORMANCE TROUBLESHOOTING**

### Expected Performance Ranges

| Operation | Expected Time | Threshold | Troubleshoot If |
|-----------|---------------|-----------|-----------------|
| Kyber-768 Key Gen | 20-80ms | <100ms | >100ms |
| Kyber-768 Encapsulation | 10-40ms | <50ms | >50ms |
| Dilithium-3 Signing | 50-150ms | <200ms | >200ms |
| Dilithium-3 Verification | 20-80ms | <100ms | >100ms |

### Performance Debugging

```typescript
// Detailed performance analysis
it('should provide performance breakdown', async () => {
  const metrics = {
    keyGeneration: [],
    encapsulation: [],
    decapsulation: [],
  };

  for (let i = 0; i < 10; i++) {
    // Key generation timing
    let start = performance.now();
    const keyPair = await service.generateKyberKeyPair();
    metrics.keyGeneration.push(performance.now() - start);

    // Encapsulation timing
    start = performance.now();
    const encapsulated = await service.encapsulate(keyPair.publicKey, 'test-data');
    metrics.encapsulation.push(performance.now() - start);

    // Decapsulation timing
    start = performance.now();
    const decapsulated = await service.decapsulate(keyPair.secretKey, encapsulated);
    metrics.decapsulation.push(performance.now() - start);
  }

  // Analyze performance patterns
  console.log('Performance Metrics:', {
    keyGenAvg: metrics.keyGeneration.reduce((a, b) => a + b) / 10,
    encapAvg: metrics.encapsulation.reduce((a, b) => a + b) / 10,
    decapAvg: metrics.decapsulation.reduce((a, b) => a + b) / 10,
  });
});
```

## 🆘 **ESCALATION PROCEDURES**

### When to Escalate to User

1. **PQC Service Completely Unavailable**: Python service not responding
2. **Systematic Test Failures**: >50% of tests failing consistently
3. **Performance Regression**: Operations exceeding thresholds by >100%
4. **Memory Leaks**: Consistent memory growth >100MB per test run
5. **Security Validation Failures**: NIST compliance tests failing

### Escalation Information to Provide

```
🚨 PQC Testing Issue Escalation

Issue Type: [Service/Performance/Security/Memory]
Affected Tests: [List specific test files]
Error Messages: [Copy exact error messages]
Performance Metrics: [Include timing data if relevant]
Environment: [Node.js version, OS, memory available]
Reproduction Steps: [Exact commands to reproduce]
Expected vs Actual: [What should happen vs what happens]
```

## 📚 **RELATED TROUBLESHOOTING RESOURCES**

- `PQC_TESTING_FRAMEWORK_ARCHITECTURE.md` - Complete architecture overview
- `NEW_ENGINEER_ONBOARDING_MESSAGE.md` - Setup and configuration guide
- `WBS_STATUS_REPORT.md` - Implementation details and known working configurations
- `GREEN_STATUS_GUARANTEE.md` - Quality standards and success criteria

---

**Document Owner**: WBS 4.1 Testing Framework Development Implementation  
**Last Updated**: June 30, 2025  
**Next Review**: Upon new issues discovery or framework updates  
**Status**: ACTIVE - Primary troubleshooting reference for PQC testing issues
