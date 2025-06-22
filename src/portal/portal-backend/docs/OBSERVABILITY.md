# Observability Setup for Minkalla Portal Backend

This document outlines the setup and configuration of observability tools for the Minkalla Quantum-Safe Privacy Portal backend.

## 1. AWS X-Ray Integration (API Tracing)

-   [cite_start]**Objective:** Enable endpoint tracing for API requests to provide runtime visibility.
-   **Configuration:**
    -   [cite_start]X-Ray SDK (`aws-xray-sdk@3.5.0`) installed.
    -   `src/main.ts` configured for global HTTP/HTTPS capture and Express middleware (`AWSXRay.express.openSegment`, `AWSXRay.express.closeSegment`).
    -   `docker-compose.yml` includes `xray-daemon` service (`amazon/aws-xray-daemon:latest`) and `backend` service is configured with `AWS_XRAY_DAEMON_ADDRESS`.
    -   **Note on MongoDB Tracing:** MongoDB tracing via X-Ray is currently deferred due to `TypeError: AWSXRay.captureMongoDB is not a function` during startup. This will be addressed in a future task.

## 2. AWS CloudTrail Configuration (API and IAM Logging)

-   [cite_start]**Objective:** Log all API calls and IAM actions for auditability and security monitoring.
-   **Configuration:**
    -   CloudTrail trail created: `minkalla-main-trail`.
    -   [cite_start]Associated S3 bucket for log storage: `aws-cloudtrail-logs-651483628273-c680896d`.
    -   Associated KMS key for log encryption: `alias/minkalla-cloudtrail-kms`.
    -   [cite_start]IAM user (`minkalla-ci-cd-user`) updated with `cloudtrail:PutObject` permission for log delivery.
-   **Verification:**
    -   [cite_start]S3 bucket exists and is accessible: `aws-cloudtrail-logs-651483628273-c680896d`.
    -   [cite_start]Log delivery verified via AWS CLI.

## 3. AWS GuardDuty Configuration (Threat Detection)

-   [cite_start]**Objective:** Enable intelligent threat detection for suspicious activities and unauthorized behavior.
-   **Configuration:**
    -   [cite_start]**Enabled Account-wide:** GuardDuty is enabled for the `minkalla-main-ops` AWS account.
    -   [cite_start]**Alerting via SNS:** An Amazon SNS topic, `minkalla-guardduty-alerts`, has been created to receive and forward GuardDuty findings. This SNS topic has an email subscription for notifications.
    -   **EventBridge Rule:** An EventBridge (formerly CloudWatch Events) rule named `GuardDutyToSnsAlerts` is configured to capture all `aws.guardduty` events with `detail-type` of `GuardDuty Finding` and forward them to the `minkalla-guardduty-alerts` SNS topic.
-   **Verification:**
    -   Sample GuardDuty findings successfully generated in the GuardDuty console and appeared as expected.
    -   The EventBridge rule `GuardDutyToSnsAlerts` showed successful `MatchedEvents` and `Invocations` for the generated findings.
    -   Email alerts containing details of the GuardDuty findings were successfully received via the `minkalla-guardduty-alerts` SNS topic.

## 4. SAST/DAST Scanning (Code and Runtime Security)

-   [cite_start]**Objective:** Integrate static and dynamic application security testing into the CI/CD pipeline.
-   **Configuration:**
    -   (Details to be added in Activity 1.5.5.4)