# CI/CD Pipeline Guide for Minkalla Quantum-Safe Privacy Portal

**Artifact ID**: CICD_GUIDE  
**Version**: 1.0  
**Last Updated**: 2025-07-01  
**Owner**: Minkalla Engineering

---

## 🧱 Workflow Structure

| Workflow | File | Description |
|----------|------|-------------|
| Backend Build/Test/Deploy | `.github/workflows/backend.yml` | Builds backend Docker image, runs Jest tests, pushes to Elastic Beanstalk |
| Frontend Build/Test/Deploy | `.github/workflows/frontend.yml` | Runs Vite build, ESLint/Prettier, deploys to S3 or Amplify |
| Monorepo Orchestration | `.github/workflows/monorepo.yml` | Triggers backend + frontend pipelines, configures Slack notifications |

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
| `push` to `main` | Deploys backend to Elastic Beanstalk, frontend to Amplify |
| `pull_request` | Runs test-only pipelines (no deploy) for validation |
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
