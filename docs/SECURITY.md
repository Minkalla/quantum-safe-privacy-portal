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

_Last updated: 2025-06-21_
