# DEBUGGING.md

## Minkalla Quantum-Safe Privacy Portal: Troubleshooting Knowledge Base

This document serves as the definitive technical troubleshooting and debugging knowledge base for the backend and CI/CD pipeline. It is designed to help engineers quickly diagnose, resolve, and understand issues encountered during development, testing, and deployment.

---

## Implementation Plan for Diagnosing Silent NestJS Crash in GitHub Actions CI

**Artifact ID:** 7d2e8b1a-9c5f-4d7c-a3e6-f2a3b4c5d678  
**Version:** 1.1

### Objective
Diagnose and resolve the issue where the NestJS backend would silently crash or fail to start in the GitHub Actions CI environment, despite working locally.

### Operational Notes & Activities

#### 1. Environment Variable Propagation
- **Issue:** `.env` file not found or environment variables not passed correctly in CI, causing the app to fail silently.
- **Resolution:** Switched to using a job-level `env:` block in `.github/workflows/backend.yml` to ensure all required variables are explicitly set for the backend service.

#### 2. SecretsService Bypass
- **Issue:** The backend attempted to connect to AWS Secrets Manager with dummy credentials in CI, causing a crash.
- **Resolution:** Introduced the `SKIP_SECRETS_MANAGER` environment variable. When set to `true`, the backend returns dummy secrets and skips AWS calls. Implemented logic in `secrets.service.ts` and set the variable in `backend.yml`.

#### 3. Dockerfile `ENV NODE_OPTIONS` Syntax Error
- **Issue:** Persistent Dockerfile parsing error on the `ENV NODE_OPTIONS` line, even after multiple syntax fixes.
- **Resolution:** Manually removed all trailing characters and comments from the `ENV NODE_OPTIONS` line (and the `FROM` line if present). Dockerfile parsing is extremely strict—no inline comments or extra whitespace allowed on these lines.

#### 4. Node.js Flag Rejection
- **Issue:** Error: `node: --enable-source-maps is not allowed` when starting the app in Docker.
- **Resolution:** Ensured `NODE_OPTIONS` was set correctly and compatible with the Node.js version in use. Cleared or adjusted the flag as needed.

#### 5. Backend API Readiness (Trailing Slash)
- **Issue:** Health check and ZAP scan failed with 404 errors due to missing trailing slash in `/api-docs` URL.
- **Resolution:** Updated health check and ZAP scan URLs in `backend.yml` to include the trailing slash, matching the actual route served by the backend.

#### 6. Overall Impact
- These fixes collectively enabled the NestJS backend to start, run, and pass all health checks and security scans in CI/CD. The debugging process is now fully documented for future reference.

---

## Additional Debugging Tips

- **Always check environment variable propagation in CI/CD.**
- **Use explicit, job-level `env:` blocks in workflows for clarity.**
- **Avoid inline comments or extra whitespace on critical Dockerfile lines (`FROM`, `ENV`).**
- **Validate all health check URLs match the actual backend routes.**
- **Document every fix and resolution for future maintainers.**

---

_Last updated: 2025-06-21_
