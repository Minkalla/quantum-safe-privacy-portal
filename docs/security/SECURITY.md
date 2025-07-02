# SECURITY.md

## Security Model & Practices: Minkalla Quantum-Safe Privacy Portal Backend

This document details the security architecture, threat mitigations, and secure coding practices implemented in the backend. It is intended for developers, security engineers, and auditors.

**Current Status**: ✅ **100% E2E Security Test Validation** (57/57 tests passing)  
**WBS 1.2.2 Status**: ✅ **Rust Toolchain with NIST PQC Dependencies Configured** (Zero technical debt)

---

## 1. Enhanced Authentication & Authorization

### Core Authentication Security
- **JWT-based Auth:** Dual-token strategy (short-lived access, long-lived refresh)
- **Password Hashing:** bcryptjs with strong salt
- **Brute-Force Protection:** Account lockout and rate limiting on login endpoints
- **Role-based Access Control:** (Planned) for future multi-tenancy

### E2E Validated Security Features (Sub-task 1.5.6d)
- **SQL Injection Detection:** Custom validation returning proper 401 status codes
- **Authentication Flow Testing:** 15/15 tests passing with comprehensive security validation
- **Token Security:** Enhanced JWT and refresh token handling with E2E validation
- **Input Sanitization:** Malicious input detection with proper error responses

## 2. Security Middleware

### Production Security Headers
- **Helmet:** Sets HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS:** Configurable allowed origins
- **HPP:** HTTP Parameter Pollution protection
- **Rate Limiting:** Global and endpoint-specific, with Redis-ready design

### E2E Validated Middleware
- **ValidationPipe Security:** Custom exceptionFactory prevents information leakage
- **Error Response Security:** Standardized error messages maintain security posture
- **Contract-First Validation:** Ensures consistent security across all endpoints

## 3. Enhanced Secure Coding Practices

### Input Validation & Security
- **Enhanced ValidationPipe:** Custom exceptionFactory for secure error handling
- **SQL Injection Prevention:** Pattern detection with proper 401 responses
- **Contract-First Validation:** Shared constants ensure consistent security messages
- **Error Handling:** Centralized error handler, no stack traces in production
- **Environment Variable Validation:** envalid at startup
- **Secrets Management:** AWS Secrets Manager (bypass for CI/testing)

## 4. Comprehensive Security Testing & Validation

### E2E Security Testing Framework
- **Authentication Security:** 15/15 tests validating login flows and token handling
- **SQL Injection Testing:** Automated detection and proper 401 status responses
- **Validation Security:** 42/42 tests ensuring secure error message formats
- **Contract Security:** Exact error message validation preventing information leakage

### Security Scanning & Monitoring
- **AWS X-Ray:** Distributed tracing for security monitoring
- **Trivy:** SAST for Docker images and Rust dependencies
- **OWASP ZAP:** DAST for API endpoints
- **CloudTrail/GuardDuty:** AWS-side threat detection and audit
- **Cypress E2E:** Comprehensive security workflow validation
- **Cargo Audit:** Rust dependency vulnerability scanning (WBS 1.2.2)
- **Clippy Security Linting:** Rust code security analysis with zero warnings

## 5. Enhanced Dependency Management
- **npm audit:** Run in CI/CD with 0 vulnerabilities found
- **Trivy:** Detects vulnerable dependencies in Docker images and Rust crates
- **E2E Dependency Testing:** Validates security of all authentication dependencies
- **Automated Security Gates:** CI/CD pipeline blocks on security issues
- **NIST PQC Dependencies:** Verified secure versions (pqcrypto-kyber v0.8.1, pqcrypto-dilithium v0.5.0)
- **Rust Security Crates:** Memory-safe cryptographic operations with zeroize, secrecy, and subtle

## 6. Secure Deployment & Configuration
- **Dockerized:** Multi-stage builds, non-root user
- **.env.example:** No secrets in code, all secrets via env vars or AWS Secrets Manager
- **CI/CD:** Automated security gates, artifact upload for review
- **ValidationPipe Security:** Production-ready error handling preventing information disclosure

---

## Dependency Audit Results (Sub-task 1.5.6)

- **Date:** 2025-06-23
- **Tool:** npm audit (run in src/portal/portal-backend)
- **Result:** 0 vulnerabilities found (high or above)
- **CI/CD:** Automated validation step added to `.github/workflows/backend.yml` to run `npm audit` on every build.
- **Ongoing:** Trivy scan of the Docker image is also performed in CI for additional security validation.

## Dependency Audit Results (Sub-task 1.5.6b)

- **Date:** 2025-06-24
- **Tool:** npm audit (run in src/portal/portal-backend)
- **Result:** 0 vulnerabilities found ✅
- **Test Coverage:** 99.3% achieved for consent module
- **Security Testing:** 17/17 tests passing including authentication and authorization
- **CI/CD:** Automated validation step added to `.github/workflows/backend.yml` to run `npm audit` on every build.
- **Ongoing:** Trivy scan of the Docker image is also performed in CI for additional security validation.

## E2E Security Test Results (Sub-task 1.5.6d & 1.5.6.7)

### Trivy Security Scan Results (June 25, 2025)
- **Date**: 2025-06-25
- **Tool**: Trivy v0.63 (aquasec/trivy:latest)
- **Target**: src/portal/portal-backend/package-lock.json
- **Result**: 0 HIGH/CRITICAL vulnerabilities found ✅
- **Status**: CLEAN - No security findings detected
- **Scan Type**: Filesystem scan with vulnerability and secret detection

### npm audit Security Results (June 25, 2025)
- **Date**: 2025-06-25
- **Tool**: npm audit (audit-level=moderate)
- **Result**: 0 vulnerabilities found ✅
- **Status**: CLEAN - All dependencies secure

### Authentication & Authorization Testing (15/15 passing)
- ✅ **Missing Authorization Header**: Returns 401 Unauthorized
- ✅ **Invalid JWT Token**: Returns 401 Unauthorized  
- ✅ **Malformed Bearer Token**: Returns 401 Unauthorized
- ✅ **Token Validation**: Proper JWT verification implemented
- ✅ **SQL Injection Detection**: Returns 401 for malicious login attempts
- ✅ **RefreshToken Security**: Proper token generation when rememberMe=true

### Input Validation Security (42/42 passing)
- ✅ **Data Type Validation**: Strict TypeScript and class-validator rules
- ✅ **Length Validation**: Maximum field length enforcement with exact error messages
- ✅ **Format Validation**: IP address and enum validation
- ✅ **Injection Prevention**: MongoDB with Mongoose ODM (NoSQL injection resistant)
- ✅ **ValidationPipe Security**: Custom exceptionFactory prevents information leakage
- ✅ **Contract-First Validation**: Exact error message format compliance

### Error Handling Security (Enhanced)
- ✅ **Information Disclosure**: Proper error messages without sensitive data
- ✅ **HTTP Status Codes**: Appropriate status codes for security events (401, 409, 400)
- ✅ **Logging Security**: No sensitive data in logs
- ✅ **ValidationPipe Security**: Single error message format prevents information leakage
- ✅ **SQL Injection Response**: Generic error messages for malicious inputs

## Security Prevention Framework

### ValidationPipe Security Configuration
```typescript
// Secure ValidationPipe configuration in main.ts
app.useGlobalPipes(new ValidationPipe({
  exceptionFactory: (errors) => {
    const errorMessages: string[] = [];
    errors.forEach((error) => {
      if (error.constraints) {
        const constraintMessages = Object.values(error.constraints);
        if (constraintMessages.length > 0) {
          errorMessages.push(constraintMessages[0] as string);
        }
      }
    });
    return new BadRequestException({
      statusCode: 400,
      message: errorMessages.length === 1 ? errorMessages[0] : errorMessages,
      error: 'Bad Request',
    });
  },
}));
```

### SQL Injection Prevention
- Pattern detection in authentication endpoints
- Generic error responses for malicious inputs
- Proper 401 status codes for authentication failures
- No information leakage in error responses

### E2E Test Security Validation Framework (Sub-task 1.5.6.7)
- **Comprehensive Coverage**: 57/57 tests validate security across all consent flow endpoints
- **SQL Injection Prevention**: Automated detection and proper error responses in login flow tests
- **ValidationPipe Security**: Custom exceptionFactory prevents information leakage across all endpoints
- **Authentication Security**: JWT token validation, refresh token handling, and authorization testing
- **Input Sanitization**: Malicious input detection with standardized error responses
- **Contract-First Security**: Exact error message validation prevents security information disclosure

### Security Documentation References
- `docs/E2E_TESTING_BEST_PRACTICES.md` - Comprehensive security testing post-mortem
- `docs/VALIDATION_CONTRACTS.md` - Secure error message standardization
- `docs/DEBUGGING.md` - Security-focused troubleshooting guide
- `test/e2e/*.cy.js` - E2E security test implementations with comprehensive coverage

## 7. Post-Quantum Cryptography Security (WBS 1.2.2)

### NIST-Approved PQC Implementation
- **Kyber-768:** Key encapsulation mechanism for quantum-resistant key exchange
- **Dilithium-3:** Digital signature algorithm for quantum-resistant authentication
- **Memory Safety:** Rust implementation with automatic memory management and zero-copy operations
- **Side-Channel Resistance:** Constant-time implementations in pqcrypto crates

### PQC Security Dependencies
```toml
# NIST-approved post-quantum cryptographic algorithms
pqcrypto-kyber = "0.8.1"        # Key encapsulation (NIST standardized)
pqcrypto-dilithium = "0.5.0"    # Digital signatures (NIST standardized)
pqcrypto-traits = "0.3.4"       # Common cryptographic traits

# Security-focused utility crates
zeroize = "1.7"                 # Secure memory clearing
secrecy = "0.8"                 # Secret value protection
subtle = "2.5"                  # Constant-time operations
```

### Rust Security Configuration
- **Build Optimization:** CPU-specific optimizations with AES/SSE support for performance
- **Linting:** Zero Clippy warnings with security-focused analysis
- **Memory Safety:** Comprehensive safety documentation for all unsafe FFI operations
- **CI/CD Integration:** Automated PQC dependency validation and security scanning

### Compliance Validation
- **NIST SP 800-53 (SA-11):** Developer security testing with PQC algorithm validation
- **ISO/IEC 27701 (7.5.2):** Privacy-preserving cryptographic implementations
- **Technical Debt:** Zero tolerance approach with comprehensive testing and documentation

## 8. Dockerfile Hardening (WBS 1.7)

### Summary
Legacy debugging artifacts were removed from `src/portal/portal-backend/Dockerfile` to align with production-grade security and CI/CD expectations.

### Changes Implemented
- Removed `|| sleep infinity` fallback that masked container crashes
- Removed `--trace-warnings` and `--unhandled-rejections=strict` flags from `CMD`
- Replaced `CMD ["sh", "-c", "..."]` with clean `CMD ["node", "dist/main.js"]`
- Preserved `NODE_OPTIONS="--enable-source-maps"` for dev observability

### Compliance Impact
- **NIST SP 800-53 CM-2/CM-3**: Eliminates non-deterministic debug behavior in production images
- **OWASP Docker Security**: Aligns with best practices for container entrypoints
- **CI/CD Stability**: Prevents silent hangs and improves test pipeline reliability

_Last updated: 2025-07-01 (WBS 1.7 completion)_
