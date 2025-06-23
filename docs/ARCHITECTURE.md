# ARCHITECTURE.md

## Technical Architecture: Minkalla Quantum-Safe Privacy Portal Backend

This document provides a high-level and component-level overview of the backend architecture, including major modules, data flow, and integration points.

---

## 1. High-Level Overview
- **Framework:** NestJS (TypeScript)
- **Containerization:** Docker, Docker Compose
- **Database:** MongoDB (local via Docker Compose, Atlas for production)
- **Observability:** AWS X-Ray, CloudTrail, GuardDuty
- **Security:** JWT, bcryptjs, Helmet, CORS, HPP, rate limiting
- **CI/CD:** GitHub Actions, Trivy, OWASP ZAP

---

## 2. Component Diagram

```
+-------------------+      +-------------------+      +-------------------+
|   Frontend (SPA)  |<---> |  Backend (NestJS) |<---> |    MongoDB        |
+-------------------+      +-------------------+      +-------------------+
         |                        |  |                        |
         |                        v  |                        |
         |                +-------------------+               |
         |                |   X-Ray Daemon    |               |
         |                +-------------------+               |
         |                        |                            |
         |                        v                            |
         |                +-------------------+               |
         |                |   AWS Services    |               |
         |                | (X-Ray, S3, etc.) |               |
         |                +-------------------+               |
```

---

## 3. Key Modules & Files
- **src/config/**: App configuration (security, swagger, etc.)
- **src/controllers/**: API endpoint logic (e.g., authController.ts)
- **src/middleware/**: Express/NestJS middleware (error handling, rate limiting)
- **src/models/**: Mongoose schemas
- **src/routes/**: API route definitions
- **src/utils/**: Utility functions (logger, jwtService, appError)
- **src/types/**: Custom TypeScript types
- **src/main.ts**: App bootstrap, middleware, global pipes, X-Ray init
- **src/app.module.ts**: Main NestJS module, imports, providers
- **Dockerfile**: Multi-stage build for backend
- **docker-compose.yml**: Orchestrates backend, MongoDB, X-Ray daemon

---

## 4. Data Flow
- **User/API Request** → **Backend (NestJS)** → **MongoDB**
- **Backend** emits traces to **X-Ray Daemon** (sidecar)
- **X-Ray Daemon** forwards traces to **AWS X-Ray** (if configured)
- **CI/CD** runs SAST (Trivy) and DAST (ZAP) scans on backend image/API

---

## 5. Integration Points
- **AWS X-Ray SDK:** Initialized in `main.ts`, traces HTTP requests and MongoDB (future)
- **CloudTrail/GuardDuty:** AWS-side, no direct code integration
- **Trivy:** Runs in CI/CD, scans Docker image
- **OWASP ZAP:** Runs in CI/CD, scans running API

---

_Last updated: 2025-06-21_
