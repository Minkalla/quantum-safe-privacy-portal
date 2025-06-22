# Observability Setup for Minkalla Portal Backend

This document outlines the setup and configuration of observability tools for the Minkalla Quantum-Safe Privacy Portal backend.

## 1. AWS X-Ray Integration (API Tracing)

-   **Objective:** Enable endpoint tracing for API requests to provide runtime visibility.
-   **Configuration:**
    -   X-Ray SDK (`aws-xray-sdk@3.5.0`) installed.
    -   `src/main.ts` configured for global HTTP/HTTPS capture and Express middleware (`AWSXRay.express.openSegment`, `AWSXRay.express.closeSegment`).
    -   `docker-compose.yml` includes `xray-daemon` service (`amazon/aws-xray-daemon:latest`) and `backend` service is configured with `AWS_XRAY_DAEMON_ADDRESS`.
    -   **Note on MongoDB Tracing:** MongoDB tracing via X-Ray is currently deferred due to `TypeError: AWSXRay.captureMongoDB is not a function` during startup. This will be addressed in a future task.

## 2. AWS CloudTrail Configuration (API and IAM Logging)

-   **Objective:** Log all API calls and IAM actions for auditability and security monitoring.
-   **Configuration:**
    -   CloudTrail trail created: `minkalla-main-trail`.
    -   Associated S3 bucket for log storage: `aws-cloudtrail-logs-651483628273-c680896d`.
    -   Associated KMS key for log encryption: `alias/minkalla-cloudtrail-kms`.
    -   IAM user (`minkalla-ci-cd-user`) updated with `MinkallaCloudTrailPutObjectPolicy` granting `s3:PutObject` and `s3:GetBucketAcl` permissions on the CloudTrail S3 bucket.
-   **Verification:**
    -   S3 bucket exists and is accessible: `aws-cloudtrail-logs-651483628273-c680896d`.
    -   Log delivery verified by `aws s3 ls s3://aws-cloudtrail-logs-651483628273-c680896d/` showing `PRE AWSLogs/`.

## 3. AWS GuardDuty Configuration (Threat Detection)

-   **Objective:** Enable intelligent threat detection for suspicious activities and unauthorized behavior.
-   **Configuration:**
    -   (Details to be added in Activity 1.5.5.3)

## 4. SAST/DAST Scanning (Code and Runtime Security)

-   **Objective:** Integrate static and dynamic application security testing into the CI/CD pipeline.
-   **Configuration:**
    -   (Details to be added in Activity 1.5.5.4)