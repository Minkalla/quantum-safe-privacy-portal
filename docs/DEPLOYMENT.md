# DEPLOYMENT.md

## Deployment Guide: Minkalla Quantum-Safe Privacy Portal Backend

This document provides step-by-step instructions for deploying the backend in local, staging, and production environments, including the WBS 1.2.2 Rust toolchain with NIST Post-Quantum Cryptography (PQC) dependencies.

---

## 1. Local Development (Docker Compose)
- **Prerequisites:** Docker Desktop, Node.js, npm, Rust 1.83.0+, Poetry
- **Steps:**
  1. Clone the repository
  2. Copy `.env.example` to `.env` and fill in required values
  3. **Build Rust PQC Library (WBS 1.2.2):**
     ```bash
     cd src/portal/mock-qynauth/src/rust_lib
     cargo build --features kyber768,dilithium3
     ```
  4. Run `docker compose up --build` in `src/portal/portal-backend/`
  5. Access backend at `http://localhost:8080/`
  6. Access Swagger UI at `http://localhost:8080/api-docs/`
  7. **QynAuth PQC Service:** `http://localhost:3001/docs`

---

## 2. Staging/Production (Cloud, e.g., AWS)
- **Prerequisites:** AWS account, Docker, AWS CLI, MongoDB Atlas (or managed DB)
- **Steps:**
  1. Build Docker image: `docker build -t minkalla/portal-backend:latest .`
  2. Push image to container registry (ECR, Docker Hub, etc.)
  3. Set environment variables via AWS Secrets Manager or ECS/Beanstalk config
  4. Deploy using ECS, EKS, or Elastic Beanstalk
  5. Ensure X-Ray daemon is running as a sidecar or managed service
  6. Configure CloudTrail and GuardDuty in AWS Console

---

## 3. Environment Variables
- See `.env.example` for all required variables
- Use AWS Secrets Manager for production secrets

---

## 4. CI/CD Integration
- The main workflow is `.github/workflows/backend.yml`
- **WBS 1.2.2 Rust PQC Validation:** `.github/workflows/ci-cd-validation.yml`
- CI/CD handles build, test, SAST/DAST scans, and artifact upload
- **PQC Dependencies:** Validates pqcrypto-kyber v0.8.1, pqcrypto-dilithium v0.5.0
- **Rust Toolchain:** Automated build, lint, and script validation

---

## 5. Troubleshooting
- See `docs/DEBUGGING.md` for common issues and resolutions
- Check CI logs and AWS CloudWatch/X-Ray for runtime errors

---

_Last updated: 2025-06-26 (WBS 1.2.2 Rust PQC Integration)_
