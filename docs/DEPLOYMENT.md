# 🚀 Deployment Guide for Minkalla Portal Backend

## Overview
This guide outlines the process for deploying the `portal-backend` service (version 0.2.0) to AWS Elastic Beanstalk using Docker and MongoDB Atlas. This deployment establishes a cost-effective, secure, and ready-for-future-cryptography foundation for the Quantum-Safe Privacy Portal. It adheres to "no regrets" quality standards by emphasizing clarity, automation readiness, and compliance.

### Key Deployment Principles (Top-Tier Standard)
* **Container-First:** Utilizes Docker for consistent environments across development and deployment.
* **Cloud-Native:** Leverages AWS managed services for scalability, reliability, and reduced operational overhead.
* **Security & Compliance Embedded:** Integrates security best practices and compliance considerations from the outset.
* **Automation-Ready:** Lays the groundwork for future automated CI/CD pipelines.

## 📋 Prerequisites

Before proceeding with deployment, ensure you have:

* **AWS Account:** An active AWS account (`minkalla-main-ops`) with associated Root User credentials.
* **IAM User for CI/CD/CLI:** An IAM user (`minkalla-ci-cd-user`) with programmatic access and the following AWS Managed Policies attached:
    * `AdministratorAccess-AWSElasticBeanstalk`
    * `AmazonEC2ContainerRegistryPowerUser`
    * `AmazonS3FullAccess`
* **AWS CLI v2:** Installed and configured locally with the `minkalla-ci-cd-user`'s credentials (`aws configure`).
* **MongoDB Atlas Cluster:** An M0 Sandbox cluster (`MinkallaPortalCluster`) in `N. Virginia (us-east-1)`, with a dedicated database user (`minkalla-backend-user`) and network access (your local IP whitelisted, plus future EB IPs).
* **Docker Desktop:** Installed and running locally.
* **Git:** Installed locally.
* **Local `portal-backend` Setup:** Ensure your `portal-backend` is functional locally via `docker compose up --build`.

## ⚙️ Deployment Setup Instructions (High-Level Steps)

This section provides a high-level overview of the major setup steps. Detailed console/CLI instructions are part of the ongoing implementation.

### 1. AWS Elastic Beanstalk Environment Setup (Task 1.5.7)
* Create a new Elastic Beanstalk Application (`portal-backend`).
* Launch a new Elastic Beanstalk Environment for the application, selecting the **Docker platform**.
* Configure environment properties (environment variables) for the EB instance (e.g., `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`, `ENABLE_SWAGGER_DOCS=false`).
* Configure HTTPS using AWS Certificate Manager (ACM) for your custom domain (if applicable) or a default EB domain.
* Set up minimal VPC and Security Group rules to allow inbound traffic on ports 80 (HTTP) and 443 (HTTPS) to the Elastic Beanstalk Load Balancer.
* Enable CloudWatch logging for the Elastic Beanstalk environment.

### 2. AWS Elastic Container Registry (ECR) Setup (Part of Task 1.5.8)
* Create a new ECR Repository in `us-east-1` named `portal-backend` to store your Docker images.

### 3. GitHub Actions CI/CD Pipeline (Task 1.5.8)
* Create a GitHub Actions workflow file (`.github/workflows/deploy.yml`) in your repository.
* Configure the workflow to:
    * Checkout code from `main` branch.
    * Set up Node.js.
    * Authenticate to AWS ECR using GitHub Secrets (AWS Access Key ID, AWS Secret Access Key, AWS Region).
    * Run `npm test` for backend unit/integration tests.
    * Build the `portal-backend` Docker image.
    * Push the Docker image to your ECR repository.
    * Deploy the new image version to your Elastic Beanstalk environment.

### 4. Basic CloudWatch Alarms & Notifications (Task 1.5.11)
* Set up fundamental CloudWatch Alarms for Elastic Beanstalk environment health (e.g., Degraded, Severe status).
* Configure SNS topics for notifications (e.g., email alerts to operations/CTO).

### 5. Docker Image Vulnerability Scanning (Task 1.5.12)
* Implement a basic vulnerability scanning step for your Docker image within the CI/CD pipeline (e.g., enable AWS ECR's built-in scanning or use a third-party tool like Trivy/Clair before pushing to ECR).

## 🔑 Environment Variable Management

All sensitive environment variables for the deployed `portal-backend` will be securely managed:

* **AWS Elastic Beanstalk Environment Properties:** For initial deployments, variables (`MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV`, `ENABLE_SWAGGER_DOCS`, `FRONTEND_URL`) will be configured here.
* **Future (Strategic Enhancement):** Transition to [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) for stricter secret rotation and fine-grained access control in later phases.

## 🔒 Security Considerations

* **Least Privilege IAM:** The `minkalla-ci-cd-user` has only necessary permissions.
* **HTTPS Everywhere:** All traffic to/from the application will be encrypted with TLS/SSL.
* **Network Isolation:** Minimal VPC and Security Group rules will restrict unauthorized network access.
* **Automated Security Scans:** Docker image vulnerability scanning will proactively identify issues.
* **No Public Swagger UI:** `ENABLE_SWAGGER_DOCS` will be set to `false` in production.

## 📈 Monitoring & Troubleshooting

* **AWS CloudWatch:** Collects application logs and metrics from Elastic Beanstalk, providing centralized observability.
* **Elastic Beanstalk Health Monitoring:** Provides real-time insights into environment health and performance.

## 📄 Compliance References (Key Controls)

This deployment implicitly or explicitly addresses the following compliance controls:

* **NIST SP 800-53:** CM-2, CM-3, CM-6, SA-9, SC-8, AU-2.
* **ISO 27001:** A.12.1.1, A.12.1.4, A.14.1.2, A.16.1.2.
* **PCI DSS:** 4.1, 6.2, 6.5.3.
* **CMMC:** CM.L2-3.4.5, SC.L2-3.13.8, RM.L2-3.11.2, CA.L2-3.2.2.
* **FedRAMP:** CM-2, CM-8, SC-13, RA-5, SI-4, IR-4.
* **PSD2:** Article 95 (for secure communication).

---

Please create the `docs` folder first if it doesn't exist, then create this `DEPLOYMENT.md` file manually inside it, and paste this content into it. Save the file once done. Type "done" to confirm.