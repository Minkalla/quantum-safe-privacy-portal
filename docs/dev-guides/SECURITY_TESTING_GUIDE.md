# Security Testing Guide - Quantum Safe Privacy Portal

**Document ID**: SEC-TEST-GUIDE-v1.0  
**Created**: July 02, 2025  
**Purpose**: Comprehensive guide for testing security features and cryptographic implementations  
**Status**: CURRENT - Reflects WBS 1.14 Security Risk Mitigation Framework  

## 🎯 Executive Summary

This guide provides comprehensive testing strategies for validating the security features of the Quantum Safe Privacy Portal, with special focus on Post-Quantum Cryptography (PQC) implementations, hybrid fallback mechanisms, and enterprise SSO integration. All security testing must use **real cryptographic operations** without mocking to ensure authentic validation.

## 🔐 Security Testing Philosophy

### Core Principles

#### 1. **Real Cryptography Only**
```typescript
// ❌ NEVER do this - mocking crypto invalidates security tests
jest.mock('./pqc.service', () => ({
  encrypt: jest.fn().mockResolvedValue('fake-encrypted-data')
}));

// ✅ ALWAYS do this - test with real crypto operations
const keyPair = await pqcService.generateKeyPair();
const encrypted = await pqcService.encrypt(testData, keyPair.publicKey);
const decrypted = await pqcService.decrypt(encrypted, keyPair.privateKey);
expect(decrypted).toBe(testData);
```

#### 2. **Comprehensive Coverage**
- **Algorithm Validation**: Test both PQC and classical crypto paths
- **Fallback Mechanisms**: Validate hybrid service behavior under failure conditions
- **Security Boundaries**: Test authentication, authorization, and data protection
- **Performance Benchmarks**: Ensure crypto operations meet timing requirements

#### 3. **Compliance Validation**
- **NIST Standards**: Verify FIPS 203 algorithm compliance
- **Regulatory Requirements**: Test GDPR, ISO 27001, and FedRAMP controls
- **Accessibility**: Validate WCAG 2.1 compliance for security interfaces
- **Audit Trails**: Ensure comprehensive security event logging

## 🧪 Testing Categories

### 1. Cryptographic Algorithm Testing

#### ML-KEM-768 Key Encapsulation Testing
```typescript
describe('ML-KEM-768 Key Encapsulation', () => {
  let pqcService: PqcDataService;
  
  beforeEach(() => {
    pqcService = new PqcDataService();
  });

  it('should generate unique key pairs', async () => {
    const keyPair1 = await pqcService.generateKeyPair();
    const keyPair2 = await pqcService.generateKeyPair();
    
    expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
    expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    expect(keyPair1.publicKey).toMatch(/^PQC_MLKEM768_/);
  });

  it('should encrypt and decrypt successfully', async () => {
    const testData = 'sensitive-user-data-' + Date.now();
    const keyPair = await pqcService.generateKeyPair();
    
    const encrypted = await pqcService.encrypt(testData, keyPair.publicKey);
    const decrypted = await pqcService.decrypt(encrypted, keyPair.privateKey);
    
    expect(decrypted).toBe(testData);
    expect(encrypted).not.toBe(testData);
    expect(encrypted).toMatch(/^PQC:/);
  });

  it('should meet performance benchmarks', async () => {
    const startTime = Date.now();
    const keyPair = await pqcService.generateKeyPair();
    const keyGenTime = Date.now() - startTime;
    
    expect(keyGenTime).toBeLessThan(50); // <50ms requirement
    
    const encryptStart = Date.now();
    await pqcService.encrypt('test-data', keyPair.publicKey);
    const encryptTime = Date.now() - encryptStart;
    
    expect(encryptTime).toBeLessThan(20); // <20ms requirement
  });
});
```

#### ML-DSA-65 Digital Signature Testing
```typescript
describe('ML-DSA-65 Digital Signatures', () => {
  it('should sign and verify successfully', async () => {
    const message = 'authentication-token-payload';
    const keyPair = await pqcService.generateSigningKeyPair();
    
    const signature = await pqcService.sign(message, keyPair.privateKey);
    const isValid = await pqcService.verify(message, signature, keyPair.publicKey);
    
    expect(isValid).toBe(true);
    expect(signature).toMatch(/^MLDSA65_/);
  });

  it('should reject invalid signatures', async () => {
    const message = 'original-message';
    const tamperedMessage = 'tampered-message';
    const keyPair = await pqcService.generateSigningKeyPair();
    
    const signature = await pqcService.sign(message, keyPair.privateKey);
    const isValid = await pqcService.verify(tamperedMessage, signature, keyPair.publicKey);
    
    expect(isValid).toBe(false);
  });
});
```

### 2. Hybrid Cryptography Testing

#### HybridCryptoService Fallback Testing
```typescript
describe('HybridCryptoService Fallback Mechanism', () => {
  let hybridService: HybridCryptoService;
  let pqcService: PqcDataService;
  let classicalService: ClassicalCryptoService;
  let auditService: AuditService;

  beforeEach(() => {
    hybridService = new HybridCryptoService(pqcService, classicalService, auditService);
  });

  it('should use PQC when service is healthy', async () => {
    const testData = 'user-authentication-data';
    const userId = 'test-user-123';
    
    const result = await hybridService.encryptWithFallback(testData, userId);
    
    expect(result.algorithm).toBe('ML-KEM-768');
    expect(result.metadata.fallbackUsed).toBe(false);
    expect(result.encryptedData).toMatch(/^PQC:/);
  });

  it('should fallback to RSA when PQC fails', async () => {
    // Simulate PQC service failure
    jest.spyOn(pqcService, 'encrypt').mockRejectedValue(new Error('PQC service unavailable'));
    
    const testData = 'user-authentication-data';
    const userId = 'test-user-123';
    
    const result = await hybridService.encryptWithFallback(testData, userId);
    
    expect(result.algorithm).toBe('RSA-2048');
    expect(result.metadata.fallbackUsed).toBe(true);
    expect(result.metadata.fallbackReason).toBe('PQC_SERVICE_FAILURE');
    expect(result.encryptedData).toMatch(/^RSA:/);
  });

  it('should log telemetry events for fallback usage', async () => {
    const logSpy = jest.spyOn(auditService, 'logSecurityEvent');
    jest.spyOn(pqcService, 'encrypt').mockRejectedValue(new Error('Timeout'));
    
    await hybridService.encryptWithFallback('test-data', 'user-123');
    
    expect(logSpy).toHaveBeenCalledWith('CRYPTO_FALLBACK_USED', {
      fallbackReason: 'PQC_TIMEOUT',
      algorithm: 'RSA-2048',
      userId: 'user-123',
      operation: 'encryption',
      timestamp: expect.any(String),
      originalAlgorithm: 'ML-KEM-768'
    });
  });
});
```

#### Circuit Breaker Testing
```typescript
describe('Circuit Breaker Integration', () => {
  it('should open circuit after consecutive failures', async () => {
    const circuitBreaker = new CircuitBreakerService();
    
    // Simulate 5 consecutive failures (threshold)
    for (let i = 0; i < 5; i++) {
      try {
        await circuitBreaker.execute(() => {
          throw new Error('Service failure');
        }, 'pqc-service');
      } catch (error) {
        // Expected failures
      }
    }
    
    expect(circuitBreaker.getState('pqc-service')).toBe('OPEN');
  });

  it('should use fallback when circuit is open', async () => {
    const circuitBreaker = new CircuitBreakerService();
    circuitBreaker.setState('pqc-service', 'OPEN');
    
    const result = await hybridService.encryptWithFallback('test-data', 'user-123');
    
    expect(result.algorithm).toBe('RSA-2048');
    expect(result.metadata.fallbackReason).toBe('CIRCUIT_BREAKER_OPEN');
  });
});
```

### 3. Authentication Security Testing

#### SSO SAML Security Testing
```typescript
describe('SSO SAML Security', () => {
  let ssoService: SsoService;
  
  it('should validate SAML assertions properly', async () => {
    const validSamlResponse = createValidSamlResponse();
    
    const result = await ssoService.validateSamlResponse(validSamlResponse);
    
    expect(result.isValid).toBe(true);
    expect(result.user.email).toBe('test@company.com');
    expect(result.sessionIndex).toBeDefined();
  });

  it('should reject tampered SAML assertions', async () => {
    const tamperedSamlResponse = createTamperedSamlResponse();
    
    const result = await ssoService.validateSamlResponse(tamperedSamlResponse);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid signature');
  });

  it('should prevent replay attacks', async () => {
    const samlResponse = createValidSamlResponse();
    
    // First validation should succeed
    const firstResult = await ssoService.validateSamlResponse(samlResponse);
    expect(firstResult.isValid).toBe(true);
    
    // Second validation with same response should fail
    const secondResult = await ssoService.validateSamlResponse(samlResponse);
    expect(secondResult.isValid).toBe(false);
    expect(secondResult.error).toContain('Replay attack detected');
  });
});
```

#### JWT Token Security Testing
```typescript
describe('JWT Token Security', () => {
  it('should generate quantum-safe JWT tokens', async () => {
    const user = { id: 'user-123', email: 'test@example.com' };
    
    const token = await jwtService.generatePQCToken(user);
    
    expect(token).toMatch(/^eyJ/); // JWT format
    const decoded = await jwtService.verifyPQCToken(token);
    expect(decoded.sub).toBe(user.id);
    expect(decoded.algorithm).toBe('ML-DSA-65');
  });

  it('should reject expired tokens', async () => {
    const expiredToken = await jwtService.generatePQCToken(
      { id: 'user-123' }, 
      { expiresIn: '-1h' }
    );
    
    await expect(jwtService.verifyPQCToken(expiredToken))
      .rejects.toThrow('Token expired');
  });

  it('should reject tokens with invalid signatures', async () => {
    const validToken = await jwtService.generatePQCToken({ id: 'user-123' });
    const tamperedToken = validToken.slice(0, -10) + 'tampered123';
    
    await expect(jwtService.verifyPQCToken(tamperedToken))
      .rejects.toThrow('Invalid signature');
  });
});
```

### 4. Data Protection Testing

#### Field-Level Encryption Testing
```typescript
describe('Field-Level Encryption', () => {
  it('should encrypt sensitive user data', async () => {
    const sensitiveData = {
      ssn: '123-45-6789',
      creditCard: '4111-1111-1111-1111',
      medicalRecord: 'Patient has diabetes'
    };
    
    const encrypted = await dataEncryptionService.encryptFields(sensitiveData);
    
    expect(encrypted.ssn).toMatch(/^PQC:/);
    expect(encrypted.creditCard).toMatch(/^PQC:/);
    expect(encrypted.medicalRecord).toMatch(/^PQC:/);
    
    const decrypted = await dataEncryptionService.decryptFields(encrypted);
    expect(decrypted).toEqual(sensitiveData);
  });

  it('should use different encryption keys per field', async () => {
    const data = { field1: 'value1', field2: 'value2' };
    
    const encrypted = await dataEncryptionService.encryptFields(data);
    
    // Encrypted values should be different even for same input
    expect(encrypted.field1).not.toBe(encrypted.field2);
  });
});
```

### 5. Performance Security Testing

#### Crypto Performance Benchmarks
```typescript
describe('Cryptographic Performance', () => {
  it('should meet key generation performance requirements', async () => {
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await pqcService.generateKeyPair();
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / iterations;
    
    expect(avgTime).toBeLessThan(50); // <50ms per key generation
  });

  it('should handle concurrent crypto operations', async () => {
    const concurrentOperations = 50;
    const promises = [];
    
    for (let i = 0; i < concurrentOperations; i++) {
      promises.push(pqcService.encrypt(`data-${i}`, publicKey));
    }
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    expect(results).toHaveLength(concurrentOperations);
    expect(totalTime).toBeLessThan(1000); // <1s for 50 concurrent operations
  });
});
```

#### Memory Leak Testing
```typescript
describe('Memory Management', () => {
  it('should not leak memory during crypto operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform 1000 crypto operations
    for (let i = 0; i < 1000; i++) {
      const keyPair = await pqcService.generateKeyPair();
      await pqcService.encrypt('test-data', keyPair.publicKey);
      
      // Force garbage collection every 100 operations
      if (i % 100 === 0) {
        global.gc && global.gc();
      }
    }
    
    global.gc && global.gc();
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be minimal (<50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});
```

## 🔍 Security Vulnerability Testing

### 1. Input Validation Testing
```typescript
describe('Input Validation Security', () => {
  it('should reject malicious input in authentication', async () => {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      '<script>alert("xss")</script>',
      '../../etc/passwd',
      'null\x00byte',
      'A'.repeat(10000) // Buffer overflow attempt
    ];
    
    for (const input of maliciousInputs) {
      await expect(authService.login(input, 'password'))
        .rejects.toThrow('Invalid input');
    }
  });

  it('should sanitize SAML responses', async () => {
    const maliciousSaml = createSamlWithXSS();
    
    const result = await ssoService.validateSamlResponse(maliciousSaml);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Malicious content detected');
  });
});
```

### 2. Timing Attack Prevention
```typescript
describe('Timing Attack Prevention', () => {
  it('should have consistent timing for invalid credentials', async () => {
    const validEmail = 'valid@example.com';
    const invalidEmail = 'invalid@example.com';
    const password = 'password123';
    
    const times = [];
    
    // Test multiple attempts to get average timing
    for (let i = 0; i < 10; i++) {
      const start = process.hrtime.bigint();
      try {
        await authService.login(invalidEmail, password);
      } catch (error) {
        // Expected failure
      }
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1000000); // Convert to ms
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const variance = times.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / times.length;
    
    // Timing should be consistent (low variance)
    expect(variance).toBeLessThan(10); // <10ms variance
  });
});
```

### 3. Session Security Testing
```typescript
describe('Session Security', () => {
  it('should invalidate sessions on logout', async () => {
    const user = await authService.login('user@example.com', 'password');
    const token = user.token;
    
    // Token should be valid initially
    const validResult = await jwtService.verifyPQCToken(token);
    expect(validResult).toBeDefined();
    
    // Logout should invalidate token
    await authService.logout(token);
    
    await expect(jwtService.verifyPQCToken(token))
      .rejects.toThrow('Token invalidated');
  });

  it('should prevent session fixation attacks', async () => {
    const initialSession = await sessionService.createSession();
    
    // Attempt login with existing session
    const user = await authService.login('user@example.com', 'password', initialSession.id);
    
    // Session ID should change after authentication
    expect(user.sessionId).not.toBe(initialSession.id);
  });
});
```

## 🧪 Integration Testing

### End-to-End Security Flow Testing
```typescript
describe('End-to-End Security Flows', () => {
  it('should complete full SSO authentication flow', async () => {
    // 1. Initiate SSO login
    const ssoUrl = await ssoService.generateSamlRequest('test-user@company.com');
    expect(ssoUrl).toContain('SAMLRequest=');
    
    // 2. Simulate IdP response
    const samlResponse = createValidSamlResponse();
    const authResult = await ssoService.handleSamlCallback(samlResponse);
    
    expect(authResult.success).toBe(true);
    expect(authResult.user.email).toBe('test-user@company.com');
    expect(authResult.token).toMatch(/^eyJ/);
    
    // 3. Verify token can access protected resources
    const protectedData = await apiService.getProtectedData(authResult.token);
    expect(protectedData).toBeDefined();
  });

  it('should handle PQC to RSA fallback in authentication flow', async () => {
    // Simulate PQC service failure
    jest.spyOn(pqcService, 'encrypt').mockRejectedValue(new Error('PQC unavailable'));
    
    const user = await authService.register({
      email: 'test@example.com',
      password: 'SecurePassword123!'
    });
    
    expect(user.cryptoAlgorithm).toBe('RSA-2048');
    expect(user.fallbackUsed).toBe(true);
    
    // Login should also use fallback
    const loginResult = await authService.login('test@example.com', 'SecurePassword123!');
    expect(loginResult.algorithm).toBe('RSA-2048');
  });
});
```

## 📊 Security Metrics & Monitoring

### Telemetry Validation Testing
```typescript
describe('Security Telemetry', () => {
  it('should log all security events with proper structure', async () => {
    const auditSpy = jest.spyOn(auditService, 'logSecurityEvent');
    
    await authService.login('user@example.com', 'password');
    
    expect(auditSpy).toHaveBeenCalledWith('AUTH_SUCCESS', {
      userId: expect.any(String),
      algorithm: expect.stringMatching(/^(ML-KEM-768|RSA-2048)$/),
      timestamp: expect.any(String),
      ipAddress: expect.any(String),
      userAgent: expect.any(String)
    });
  });

  it('should track fallback usage metrics', async () => {
    const metricsSpy = jest.spyOn(metricsService, 'incrementCounter');
    
    // Force fallback
    jest.spyOn(pqcService, 'encrypt').mockRejectedValue(new Error('PQC failure'));
    
    await hybridService.encryptWithFallback('test-data', 'user-123');
    
    expect(metricsSpy).toHaveBeenCalledWith('crypto.fallback.used', {
      reason: 'PQC_FAILURE',
      algorithm: 'RSA-2048'
    });
  });
});
```

## 🚀 Testing Commands & Scripts

### Backend Security Testing
```bash
# Navigate to backend directory
cd src/portal/portal-backend

# Run all security tests
npm run test:security

# Run specific security test suites
npm run test:crypto          # Cryptographic algorithm tests
npm run test:auth           # Authentication security tests
npm run test:fallback       # Hybrid fallback mechanism tests
npm run test:performance    # Performance security tests

# Run with coverage
npm run test:security:coverage

# Run security tests in watch mode
npm run test:security:watch
```

### Frontend Security Testing
```bash
# Navigate to frontend directory
cd src/portal/portal-frontend

# Run security-focused tests
npm run test:security

# Run accessibility tests
npm run test:a11y

# Run end-to-end security tests
npm run test:e2e:security
```

### Full System Security Testing
```bash
# Run comprehensive security test suite
npm run test:security:full

# Run NIST compliance validation
npm run test:nist:compliance

# Run performance benchmarks
npm run test:performance:security

# Generate security test report
npm run test:security:report
```

## 🔧 Test Environment Setup

### Required Environment Variables
```bash
# Test environment configuration
export NODE_ENV=test
export PQC_ENABLED=true
export PQC_FALLBACK_ENABLED=true
export CRYPTO_TEST_MODE=real  # Never use 'mock' for security tests

# Test database (MongoDB Atlas - local Docker deprecated)
export TEST_DB_URL=${MONGO_URI}/quantum-portal-test # Use MongoDB Atlas connection from environment

# Test secrets (use test values only)
export TEST_JWT_SECRET=test-jwt-secret-for-security-testing
export TEST_SAML_CERT=test-saml-certificate
```

### Test Data Management
```typescript
// Test data should be realistic but not production data
const createTestUser = () => ({
  email: `test-${Date.now()}@example.com`,
  password: 'SecureTestPassword123!',
  profile: {
    firstName: 'Test',
    lastName: 'User'
  }
});

// Never use hardcoded or predictable test data for crypto
const generateTestCryptoData = () => ({
  data: `test-data-${crypto.randomBytes(16).toString('hex')}`,
  timestamp: Date.now(),
  nonce: crypto.randomBytes(32).toString('hex')
});
```

## 📋 Security Testing Checklist

### Pre-Test Validation
- [ ] All tests use real cryptographic operations (no mocking)
- [ ] Test environment is properly isolated
- [ ] Test data is realistic but not production data
- [ ] Performance benchmarks are defined and measurable

### Cryptographic Testing
- [ ] ML-KEM-768 key generation and encryption tested
- [ ] ML-DSA-65 signature generation and verification tested
- [ ] Hybrid fallback mechanism validated
- [ ] Circuit breaker integration tested
- [ ] Performance requirements verified

### Authentication Testing
- [ ] SSO SAML security validated
- [ ] JWT token security tested
- [ ] Session management security verified
- [ ] Input validation tested against malicious inputs

### Vulnerability Testing
- [ ] Timing attack prevention validated
- [ ] Session fixation prevention tested
- [ ] XSS and injection attack prevention verified
- [ ] Memory leak testing completed

### Integration Testing
- [ ] End-to-end security flows tested
- [ ] Fallback scenarios validated
- [ ] Telemetry and monitoring tested
- [ ] Compliance requirements verified

### Post-Test Validation
- [ ] All tests pass with 100% success rate
- [ ] Performance benchmarks met
- [ ] Security metrics collected and analyzed
- [ ] Test coverage meets requirements (100%)

## 🔮 Advanced Security Testing

### Penetration Testing Integration
```bash
# Run automated penetration tests
npm run test:pentest

# OWASP ZAP integration
npm run test:owasp:zap

# SQL injection testing
npm run test:sqli

# XSS vulnerability scanning
npm run test:xss
```

### Compliance Testing
```bash
# NIST SP 800-53 controls validation
npm run test:nist:controls

# GDPR compliance testing
npm run test:gdpr:compliance

# ISO 27001 security testing
npm run test:iso27001

# FedRAMP security validation
npm run test:fedramp
```

---

## 📞 Support & Resources

**Security Team**: Quantum-Safe Privacy Portal Security Team  
**Documentation**: `/docs/SECURITY.md` for additional security guidelines  
**Incident Response**: Follow procedures in `/docs/INCIDENT_RESPONSE.md`  
**Compliance**: See `/docs/COMPLIANCE_REPORT.md` for regulatory requirements  

---

**Document Status**: ✅ COMPLETE  
**Last Updated**: July 02, 2025 04:11 UTC  
**Next Review**: Upon security framework updates  
**Maintainer**: Security & Development Team  

*This guide provides comprehensive security testing strategies for the Quantum Safe Privacy Portal. All security testing must follow these guidelines to ensure authentic validation of cryptographic implementations and security features.*
