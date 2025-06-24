# SECURITY.md

## Security Model & Practices: Minkalla Quantum-Safe Privacy Portal Backend

This document details the security architecture, threat mitigations, and secure coding practices implemented in the backend. It is intended for developers, security engineers, and auditors.

---

## 1. Authentication & Authorization
- **JWT-based Auth:** Dual-token strategy (short-lived access, long-lived refresh)
- **Password Hashing:** bcryptjs with strong salt
- **Brute-Force Protection:** Account lockout and rate limiting on login endpoints
- **Role-based Access Control:** (Planned) for future multi-tenancy

## 2. Security Middleware
- **Helmet:** Sets HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS:** Configurable allowed origins
- **HPP:** HTTP Parameter Pollution protection
- **Rate Limiting:** Global and endpoint-specific, with Redis-ready design

## 3. Secure Coding Practices
- **Input Validation:** Joi DTO validation, global pipes
- **Error Handling:** Centralized error handler, no stack traces in production
- **Environment Variable Validation:** envalid at startup
- **Secrets Management:** AWS Secrets Manager (bypass for CI/testing)

## 4. Observability & Security Scanning
- **AWS X-Ray:** Distributed tracing for security monitoring
- **Trivy:** SAST for Docker images
- **OWASP ZAP:** DAST for API endpoints
- **CloudTrail/GuardDuty:** AWS-side threat detection and audit

## 5. Dependency Management
- **npm audit:** Run in CI/CD
- **Trivy:** Detects vulnerable dependencies in Docker images

## 6. Secure Deployment
- **Dockerized:** Multi-stage builds, non-root user
- **.env.example:** No secrets in code, all secrets via env vars or AWS Secrets Manager
- **CI/CD:** Automated security gates, artifact upload for review

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

## ZynConsent Security Test Results

### Authentication & Authorization Testing
- ✅ **Missing Authorization Header**: Returns 401 Unauthorized
- ✅ **Invalid JWT Token**: Returns 401 Unauthorized  
- ✅ **Malformed Bearer Token**: Returns 401 Unauthorized
- ✅ **Token Validation**: Proper JWT verification implemented

### Input Validation Security
- ✅ **Data Type Validation**: Strict TypeScript and class-validator rules
- ✅ **Length Validation**: Maximum field length enforcement
- ✅ **Format Validation**: IP address and enum validation
- ✅ **Injection Prevention**: MongoDB with Mongoose ODM (NoSQL injection resistant)

### Error Handling Security
- ✅ **Information Disclosure**: Proper error messages without sensitive data
- ✅ **HTTP Status Codes**: Appropriate status codes for security events
- ✅ **Logging Security**: No sensitive data in logs

_Last updated: 2025-06-24_
