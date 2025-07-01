# CI/CD Pipeline Guide for Minkalla Quantum-Safe Privacy Portal

**Artifact ID**: CICD_GUIDE  
**Version**: 1.0  
**Last Updated**: 2025-07-01  
**Owner**: Minkalla Engineering

---

## 🧱 Workflow Structure

| Workflow | File | Description |
|----------|------|-------------|
| Backend Build/Test/Deploy | `.github/workflows/backend.yml` | Builds backend Docker image, runs Jest tests, validates TypeScript |
| Frontend Build/Test/Deploy | `.github/workflows/frontend.yml` | Runs Vite build, ESLint/Prettier, includes PQC/FFI safeguards |
| Monorepo Orchestration | `.github/workflows/monorepo.yml` | Triggers backend + frontend pipelines based on path changes |

## Implementation Status

✅ **WBS 1.8.1 - Backend Workflow CI**: Implemented with minimal CI approach
- TypeScript checking and ESLint validation
- Jest unit tests with MongoDB service
- Build validation and artifact generation

✅ **WBS 1.8.2 - Frontend Workflow CI**: Implemented with PQC safeguards
- Vite build process and TypeScript validation
- ESLint checking and test execution
- PQC/FFI file change detection and enforcement

✅ **WBS 1.8.3 - Monorepo Workflow**: Implemented with path-based triggering
- Automatic detection of backend vs frontend changes
- Conditional pipeline execution for efficiency
- Centralized status reporting and notifications

✅ **WBS 1.8.4 - CI/CD Documentation**: Updated with implementation details
- Workflow descriptions and trigger conditions
- Secret configuration requirements
- Troubleshooting guidelines and best practices

## Workflow Triggers

---

## 🔐 Secret Management

Store AWS and Slack credentials in GitHub Secrets for secure pipeline execution:

| Secret Name | Purpose |
|-------------|---------|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Used by Beanstalk/S3/Amplify deploys |
| `SLACK_WEBHOOK_URL` | Posts failure alerts to Slack channels |

Secrets should be scoped to the repository and rotated every 90 days.

---

## ✅ Pipeline Triggers

| Trigger | Action |
|---------|--------|
| `push` to `main` | Runs full monorepo orchestration with conditional pipelines |
| `pull_request` | Runs targeted pipelines based on changed paths |
| Manual Dispatch | Enables dev-triggered workflows for staging previews |

---

## 🧪 Trivy & ZAP Scans

- Trivy: SCA + Dockerfile scan (runs in backend.yml)  
- ZAP: DAST scan for backend APIs (`/portal/auth`, `/portal/consent`)  
- Reports stored in GitHub Actions artifacts (per job)

---

## 🧯 Troubleshooting

| Symptom | Diagnosis | Fix |
|--------|-----------|-----|
| `jest --coverage` fails | Missing test files | Add in `/src/**/*.spec.ts` |
| ZAP scan skips endpoints | Server not up in CI | Check `wait-on` or curl readiness probe |
| AWS deploy fails | Credentials misconfigured | Re-upload to GitHub Secrets |
| Slack not posting | Webhook incorrect | Re-gen Slack webhook + update in repo secrets |

---

## 📌 References

- `docs/WBS_1.8.md` — Task-level metadata  
- `docs/DEVELOPER.md` — Onboarding instructions  
- `src/portal/README.md` — Badge status and per-service CI linkbacks    
