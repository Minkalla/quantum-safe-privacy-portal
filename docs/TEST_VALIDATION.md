# TEST_VALIDATION.md

## Automated Test & Validation State: Minkalla Quantum-Safe Privacy Portal Backend

This document describes the current state of automated tests, validation steps, and artifact handling for the backend. It is intended for developers and CI/CD maintainers.

---

## 1. Backend Jest Tests
- **Current State:**
  - The original Express.js-based test suite was removed during the NestJS refactor.
  - As of now, running `npm test` in the monorepo root or backend yields "No tests found" (Jest exit code 1).
  - The CI workflow (`.github/workflows/backend.yml`) sets `continue-on-error: true` for this step, so the pipeline does not fail due to missing tests.
- **Planned:**
  - Sub-task 1.5.6 will implement a new Jest test suite for the NestJS backend.

## 2. Trivy SAST Scan
- **Current State:**
  - Trivy is run in CI to scan the backend Docker image for vulnerabilities.
  - The scan is configured to detect `HIGH` and `CRITICAL` issues and outputs results to `src/portal/portal-backend/trivy-results.txt`.
  - The scan is set to `continue-on-error: true` to allow the pipeline to proceed even if vulnerabilities are found.
  - The `trivy-scan-results` artifact is uploaded for review.

## 3. OWASP ZAP DAST Scan
- **Current State:**
  - OWASP ZAP is run in CI against the running backend API at `http://backend:8080/api-docs`.
  - The ZAP report is generated as `owasp_zap_report.html` and uploaded as an artifact.
  - The workflow treats ZAP exit code 2 (warnings) as a pass, so only critical issues fail the pipeline.

## 4. Artifact Access
- **Trivy Results:** Download from the `trivy-scan-results` artifact in the GitHub Actions workflow run.
- **ZAP Report:** Download from the `owasp-zap-report` artifact in the workflow run.

## 5. Example CI Runs
- See the GitHub Actions tab for recent workflow runs and artifact uploads.

---

_Last updated: 2025-06-21_
