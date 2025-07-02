RUN_TESTS_IF.md

✅ Run the ffi-verification Test Suite:

When to Run:

Any WBS that touches /portal/auth, /portal/consent, or crypto-related API contracts

Any change that imports or modifies pqc_service_bridge.py, pqc_ffi, or how TS spawns the Python layer

Any refactor involving spawn logic, path resolution, or environment config (PYTHON_PATH, etc.)

Whenever CI behaves unexpectedly related to Python ↔ Rust ↔ TypeScript crypto bridge

When It’s Optional:

Pure UI layout tasks (e.g., CSS work, pixel alignment)

Frontend-only component refactors that don’t hit the API or FFI bridge at all

Static content additions (copy updates, help text, etc.)

✅ WBS Tasks That Must Run PQC Integration Tests (pnpm test ffi-verification):

WBS 1.6.x

Frontend components or services that call /portal/auth or /portal/consent endpoints

Example: 1.6.2 (Login UI + token flow), 1.6.4 (Consent UI interaction), 1.6.5 (API error handling)

These interact—directly or indirectly—with the cryptographic service layer

Future WBS 1.7+ or 1.9.x

Any client-crypto components, such as if you explore in-browser PQC verification or pre-signed payloads

Example: A hypothetical WBS 1.9.3: “Integrate hybrid key exchange UX flow”

WBS 3.x or 4.x (If revisited)

Any updates to the TypeScript ↔ Python ↔ Rust bridge

Maintenance on the FFI test harness or enhancements to pqc_service_bridge.py

🟡 WBS Tasks That Should Not Require PQC Tests:

Pure UI/Styling Tasks (1.6.1, 1.6.3)

E.g., Sidebar layout, reusable UI component setup—no auth, no crypto

Static Content or Marketing UX

Landing pages, help text, non-crypto-related analytics

Internal Dev Tooling

Modifying storybook configs, linting rules, etc.

We can even bake this logic into a line inside each WBS file:

“🧪 Requires PQC integration verification: Yes/No”

Let me know if you’d like me to prep that checklist in docs/WBS_METADATA_GUIDE.md so future Devins don’t need to guess.

Handover Notes

Artifact ID: HANDOVER_REPORT_V2.5 Version ID: v2.5 Date: June 23, 2025

Objective: Provide a concise, comprehensive handover for the Minkalla Quantum-Safe Privacy Portal, detailing Sub-task 1.5.5 resolution, current state, and next steps for Qodo Teams and future engineers, ensuring continuity and enterprise-grade quality.

Project Overview

Vision: Build a universal data infrastructure platform for managing user consent, quantum-safe authentication, and ethical data valuation, compliant with GDPR, CCPA, HIPAA, NIST SP 800-53, PCI DSS, ISO/IEC 27701, SOC 2, and CMMC.

MVP V2 Goal: Deliver a unicorn-tier (top 0.1% quality) platform with ZynConsent (consent management), QynAuth (quantum-safe authentication), and Valyze (AI-driven data valuation), targeting enterprise PoCs in finance, healthcare, and government.

Initiatives:

Initiative 1: Quantum-Safe Privacy Portal (user-facing consent portal with QynAuth, ZynConsent, Valyze).

Initiative 2: Ethical AI Data Sourcing (infrastructure for consented AI datasets, planned).

Current Status

Repository: minkalla/quantum-safe-privacy-portal (public, monorepo).

Structure: src/portal/portal-backend (NestJS), src/portal/portal-frontend, src/portal/mock-qynauth, src/portal/mock-zynconsent, src/portal/mock-valyze.

Root Files: package.json, tsconfig.json, jest.config.js, jest-global-setup.ts, jest-global-teardown.ts.

Backend (ZynConsent):

Version: portal-backend@0.2.0.

Tech Stack: NestJS, TypeScript, MongoDB Atlas (M0 Sandbox), Docker, AWS (X-Ray, CloudTrail, GuardDuty).

APIs: /portal/auth/register, /portal/auth/login, /portal/consent (POST/GET).

Features: JWT authentication, consent capture, Swagger UI (/portal/api-docs), security middleware (CORS, Helmet, rate limiting).

CI/CD:

Workflow: .github/workflows/backend.yml.

Status: Partial pass (Sub-task 1.5.5). API readiness and ZAP scan pass; “Run Backend Tests” fails (Jest exit code 1, no tests post-NestJS refactoring).

Resolved Issues:

Docker image not found: Fixed by building minkalla/portal-backend:latest in src/portal/portal-backend/.

ZAP artifact failure: Fixed by updating upload path to src/portal/portal-backend/owasp_zap_report.html.

Silent NestJS crash: Fixed via SKIP_SECRETS_MANAGER, verbose logging, and Dockerfile cleanup.

Compliance: Partial mappings to GDPR (Article 7), NIST SP 800-53 (SI-2), PCI DSS (6.2). Full mappings pending Sub-task 1.5.6.

Environment:

Local: Windows PowerShell, Node.js v22.16.0, Docker Desktop v28.1.1 (WSL 2).

Cloud: AWS (us-east-1, free tier), MongoDB Atlas (MinkallaPortalCluster, M0).

Key Achievements (Sub-task 1.5.5)

Pipeline Stability: dast-scan-backend job passes, with Trivy (SAST) and ZAP (DAST) scans generating reports.

Backend Functionality: NestJS app connects to MongoDB, serves APIs, and supports Swagger UI.

Debugging Resolutions:

Fixed environment variable propagation in CI (env block in backend.yml).

Implemented SKIP_SECRETS_MANAGER to bypass AWS Secrets Manager in CI.

Corrected Dockerfile syntax (ENV NODE_OPTIONS="").

Adjusted API URLs (/portal/api-docs without trailing slash).

Qodo Integration: Established Qodo Teams for automated documentation and CI/CD tasks.

Open Issues and Risks

Jest Test Failure: No tests found (exit code 1) due to Express.js-to-NestJS refactoring (1.5.3). continue-on-error: true in backend.yml. To be resolved in Sub-task 1.5.6.

Trivy Findings: HIGH/CRITICAL vulnerabilities in trivy-scan-results. Needs review and mitigation.

ZAP Warnings: Low-risk issues (e.g., missing CSP header) in owasp_zap_report.html. Plan remediation in 1.5.6.

Debugging Artifacts: Dockerfile retains temporary debug commands (e.g., || sleep infinity). Needs cleanup.

Risk: Delayed test implementation may hinder enterprise PoC readiness.

Next Steps (Prioritized Tasks)

WBS 1.6 - ALl of WBS 1.5 is done.

Dockerfile Cleanup:

Remove debug commands (--trace-warnings, || sleep infinity) in src/portal/portal-backend/Dockerfile.

Documentation Updates:

Create docs/TEST_VALIDATION.md and docs/COMPLIANCE_REPORT.md (see templates below).

Update src/portal/portal-backend/README.md, docs/DEBUGGING.md, docs/OBSERVABILITY.md, .env.example.

Security Hardening:

Address Trivy vulnerabilities and ZAP warnings (e.g., add CSP header).

Task 1.9.1: Demo Portal:

Develop user-facing portal for enterprise PoCs (NestJS, hosted on Vercel free tier).

Qodo Teams Instructions

Role: Automate documentation and CI/CD tasks for Sub-task 1.5.5 and 1.5.6.

Tasks:

Create docs/TEST_VALIDATION.md:

Content: Document Jest test status (0% coverage, pending 1.5.6), Trivy/ZAP results, and CI run links.

Structure:

markdown        # Test Validation for ZynConsent Core        Artifact ID: TEST_VALIDATION        Version ID: v1.0        Date: [Insert Date]        Objective: Document test coverage for ZynConsent APIs.        ## 1. Overview        - Scope: POST/GET /portal/consent.        - Framework: Jest, Supertest.        - Target: 90% coverage (SOC 2).        ## 2. Test Status        - Jest: 0% coverage (no tests post-NestJS refactoring, 1.5.3).        - Trivy: HIGH/CRITICAL vulnerabilities (review trivy-scan-results).        - ZAP: 60 PASS, 6 WARN-NEW (review owasp_zap_report.html).        ## 3. Next Steps        - Implement Jest tests (1.5.6).        - Update coverage post-1.5.7.

Create docs/COMPLIANCE_REPORT.md:

Content: Map features to GDPR, SOC 2, NIST SP 800-53, PCI DSS; summarize ZAP/Trivy findings.

Structure:

markdown        # Compliance Report for Minkalla Quantum-Safe Privacy Portal        Artifact ID: COMPLIANCE_REPORT        Version ID: v1.0        Date: [Insert Date]        Objective: Document compliance for ZynConsent APIs.        ## 1. Overview        - Scope: ZynConsent (POST/GET /portal/consent).        - Standards: GDPR, SOC 2, NIST SP 800-53, PCI DSS, CMMC.        ## 2. Compliance Mappings        | Standard | Control | Status | Evidence |        |----------|---------|--------|----------|        | GDPR Article 7 | Consent | Compliant | Consent logs |        | SOC 2 | Security | In Progress | ZAP scan, tests (1.5.6) |        | NIST SP 800-53 | SI-2 | In Progress | Jest tests (1.5.6) |        | PCI DSS 6.2 | Vulnerability | Compliant | Trivy scan |        ## 3. Security Validation        - ZAP: 60 PASS, 6 WARN-NEW (e.g., CSP header).        - Trivy: HIGH/CRITICAL issues pending review.        ## 4. Next Steps        - Complete tests (1.5.6).        - Mitigate ZAP/Trivy findings.

Update Other Docs:

src/portal/portal-backend/README.md: Add observability/security scanning section.

docs/DEBUGGING.md: Document silent crash resolution.

docs/OBSERVABILITY.md: Detail X-Ray, CloudTrail, GuardDuty, Trivy, ZAP setup.

.env.example: Add SKIP_SECRETS_MANAGER with comments.

Workflow:

Branch: feat/docs-subtask-1.5.5.

Commit: docs: Update documentation for Sub-task 1.5.5 (Qodo Teams).

PR: Target main, tag Ronak

Validation:

Confirm files exist in docs/ and src/portal/portal-backend/.

Verify CI run passes post-PR merge.

Lessons Learned

Verbose Logging: Critical for diagnosing silent crashes (e.g., process.on handlers, Winston).

Dockerfile Syntax: Strict parsing requires no trailing comments (e.g., ENV NODE_OPTIONS).

Environment Variables: Job-level env block in backend.yml ensures CI propagation.

Bot Automation: Devin enhances efficiency but needs precise instructions.

Handover Notes

Review docs/WBS_1.5.md and docs/IP_1.5.6.md for Sub-task 1.5.6 tasks.

Monitor PRs

Use docs/DEBUGGING.md for CI troubleshooting.

Commit all artifacts to docs/ (e.g., TEST_VALIDATION.md).

Artifact Location

docs/HANDOVER_REPORT_V2.5.md (to be committed to minkalla/quantum-safe-privacy-portal).l).

Implementation Plan for Task 1.7: Configure Docker Compose for Monorepo Local Development Artifact ID: f3b7c8e5-0a1b-4c9d-b8f6-8e9f0e7c9012 Version: 1.0 Date: June 21, 2025 Responsible Party: Ronak (CTO/CIO/CISO), Devin (Lead Engineer) Objective Configure a Docker Compose setup for local development of the Minkalla Quantum-Safe Privacy Portal monorepo, integrating backend (src/portal/portal-backend) and frontend (src/portal/portal-frontend) with MongoDB, ensuring production parity and testing of key endpoints (e.g., /portal/login, /api-docs). Activities and Deliverables Sub-task 1.7.1: Create Monorepo Docker Compose Configuration Objective: Develop a docker-compose.yml for the monorepo, integrating backend, frontend, and MongoDB. Tasks: Create src/portal/docker-compose.yml with services: backend (using src/portal/portal-backend/Dockerfile), frontend (new Dockerfile), and mongo (image: mongo:6). Configure backend service with port 8080, environment variables (e.g., NODE_ENV=development, MONGO_URI=mongodb://mongo:27017/minkalla). Create src/portal/portal-frontend/Dockerfile for frontend with node:18-alpine, installing dependencies and running Vite. Set up Docker network (minkalla-net) and volume (mongo-data) for service communication and persistence. Deliverables: src/portal/docker-compose.yml with integrated services. src/portal/portal-frontend/Dockerfile for frontend. Effort Estimate: 8 hours Compliance: ISO 27001 A.14.2.5, NIST SP 800-53 CM-3. Sub-task 1.7.2: Configure Frontend Development Server Objective: Set up a frontend development server in Docker with hot-reloading. Tasks: Update src/portal/portal-frontend/package.json with Vite dev script (npm run dev). Modify src/portal/portal-frontend/Dockerfile to run npm run dev in development mode, exposing port 3000. Configure docker-compose.yml to map frontend port 3000:3000 and set backend API URL (http://backend:8080/portal). Document setup in docs/FRONTEND_DOCKER.md, including hot-reloading instructions. Deliverables: Updated src/portal/portal-frontend/package.json and Dockerfile. docs/FRONTEND_DOCKER.md with setup instructions. Effort Estimate: 7 hours Compliance: ISO 27001 A.14.2.5, NIST SP 800-53 CM-3. Sub-task 1.7.3: Test Endpoints for Production Parity Objective: Validate /portal/login and /api-docs in the Docker Compose environment. Tasks: Run docker-compose up -d in src/portal and test POST /portal/login with curl -X POST http://localhost:8080/portal/auth/login -d