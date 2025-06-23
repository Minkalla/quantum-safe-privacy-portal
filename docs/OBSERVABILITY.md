# OBSERVABILITY.md

## Observability & Security Tooling for Minkalla Quantum-Safe Privacy Portal Backend

This document provides step-by-step technical instructions for setting up, configuring, and verifying all observability and security scanning tools integrated into the backend. It is intended for developers, DevOps, and security engineers.

---

## 1. AWS X-Ray SDK Integration
- **Purpose:** Distributed tracing for backend requests and service interactions.
- **Setup:**
  - Install `aws-xray-sdk` via npm.
  - In `main.ts`, initialize X-Ray with `captureHTTPsGlobal` and configure segment management in `app.module.ts`.
  - The `xray-daemon` service is included in `docker-compose.yml` for local development. This sidecar receives trace data from the backend and forwards it to AWS X-Ray (if credentials are set).
  - **Note:** MongoDB tracing is deferred for future implementation.
- **Verification:**
  - Run `docker compose up` and check logs for X-Ray segment creation.
  - Access the AWS X-Ray console to view traces (if running in AWS environment).

## 2. AWS CloudTrail Configuration
- **Purpose:** Audit logging of all AWS API activity for compliance and forensics.
- **Setup:**
  - Create a CloudTrail trail in the AWS Console.
  - Configure an S3 bucket (e.g., `minkalla-logs`) for log storage.
  - Update IAM policies for `minkalla-ci-cd-user` to allow CloudTrail and S3 access.
- **Verification:**
  - Use `aws s3 ls s3://minkalla-logs` to confirm log delivery.
  - Review CloudTrail logs in the AWS Console.

## 3. AWS GuardDuty Enablement
- **Purpose:** Real-time threat detection and alerting for AWS account activity.
- **Setup:**
  - Enable GuardDuty in the AWS Console.
  - Configure an SNS topic (e.g., `minkalla-guardduty-alerts`) for alert notifications.
  - Subscribe your email or webhook to the SNS topic.
- **Verification:**
  - Trigger a sample finding in GuardDuty and confirm alert delivery.

## 4. Trivy SAST Scanning
- **Purpose:** Static Application Security Testing (SAST) for Docker images.
- **Setup:**
  - Trivy is configured in `.github/workflows/backend.yml` to scan the backend Docker image after build.
  - The scan outputs results in table format to `src/portal/portal-backend/trivy-results.txt`.
  - The scan is set to `continue-on-error: true` to allow the pipeline to proceed even if vulnerabilities are found.
- **Verification:**
  - Check the `trivy-scan-results` artifact in CI for scan output.
  - Review and address any `HIGH` or `CRITICAL` vulnerabilities.

## 5. OWASP ZAP DAST Scanning
- **Purpose:** Dynamic Application Security Testing (DAST) for the running backend API.
- **Setup:**
  - OWASP ZAP is run in CI via Docker in the `dast-scan-backend` job.
  - The scan targets the running backend API at `http://backend:8080/api-docs`.
  - The ZAP report is generated as `owasp_zap_report.html` and uploaded as a CI artifact.
  - Exit code 2 (warnings) is treated as a pass in the workflow.
- **Verification:**
  - Download and review the `owasp-zap-report` artifact from CI.
  - Address any critical findings as needed.

---

## Dashboard Access & Troubleshooting
- **AWS X-Ray Console:** https://console.aws.amazon.com/xray/
- **AWS CloudTrail Console:** https://console.aws.amazon.com/cloudtrail/
- **AWS GuardDuty Console:** https://console.aws.amazon.com/guardduty/
- **CI Artifacts:** GitHub Actions > Workflow Run > Artifacts

**Troubleshooting Tips:**
- Ensure all required AWS credentials and environment variables are set in `.env` and CI/CD workflows.
- For local development, the X-Ray daemon runs as a sidecar in Docker Compose; check its logs for trace forwarding issues.
- Review CI logs for Trivy and ZAP scan output and errors.

---

_Last updated: 2025-06-21_
