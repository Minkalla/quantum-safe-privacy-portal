Work Breakdown Structure (WBS) for Task 1.13: Multi-Factor Authentication (MFA) Setup & Integration

Artifact ID: f0a1b2c3-7d8e-4f9a-b0c4-8e9f0a1b2345 Version: 1.0 Date: June 21, 2025 Responsible Party: Ronak (CTO/CIO/CISO)

Objective

Implement Multi-Factor Authentication (MFA) for the Minkalla Quantum-Safe Privacy Portal, integrating a second authentication factor (TOTP via authenticator apps) with the backend (/portal/auth/*) and frontend login flow to enhance user security and ensure compliance with enterprise-grade standards.

Operational Notes

Gap Analysis: Continuous gap analysis is performed for all sub-tasks to identify and mitigate risks (e.g., security vulnerabilities, usability issues, compliance gaps), ensuring enterprise-grade quality.

Dependencies: Relies on:

Task 1.5.3: Backend API endpoints (/portal/auth/login, /portal/auth/register) [cite: WBS_Task_1.5.md, version 2.2].

Task 1.5.4: Secrets Management for secure storage of MFA secrets [cite: WBS_Task_1.5.md].

Task 1.6: Frontend initialization (React/TypeScript, Material-UI) [cite: WBS_Task_1.6.md, version 1.0].

Task 1.11: User login flow (frontend logic and UI) [cite: WBS_Task_1.11.md, version 1.0].

WBS Structure

Task 1.13: Multi-Factor Authentication (MFA) Setup & Integration

Objective: Implement MFA with TOTP (Time-Based One-Time Password) for secure user authentication.

Effort Estimate: 25 hours

Compliance Mappings:

NIST SP 800-53 IA-2: Multi-factor authentication for secure access.

PCI DSS 8.3: MFA for non-console administrative access.

GDPR Article 32: Security of processing user data.

OWASP Top 10: Secure authentication mechanisms.

Sub-task 1.13.1: Implement Backend MFA Logic

Objective: Add TOTP-based MFA logic to the backend authentication service.

Activities:

1.13.1.1: Install speakeasy (^2.0.0) or equivalent for TOTP generation in src/portal/portal-backend.

1.13.1.2: Create mfaService.ts in src/auth to generate and verify TOTP secrets, storing them in AWS Secrets Manager (Task 1.5.4).

1.13.1.3: Update AuthController to add /portal/auth/mfa/setup (POST) and /portal/auth/mfa/verify (POST) endpoints.

Effort Estimate: 8 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 IA-2, PCI DSS 8.3, OWASP Top 10.

Gap Analysis:

Risk: Insecure storage of TOTP secrets.

Mitigation: Use AWS Secrets Manager for encrypted storage.

Risk: Weak TOTP implementation vulnerabilities.

Mitigation: Use battle-tested speakeasy library.

Sub-task 1.13.2: Update Frontend Login Flow for MFA

Objective: Enhance the login form to support MFA with TOTP input.

Activities:

1.13.2.1: Update src/portal/portal-frontend/src/pages/Login.tsx to include a TOTP input field after initial login.

1.13.2.2: Use Material-UI components (TextField) for TOTP input, ensuring WCAG 2.1 accessibility.

1.13.2.3: Call /portal/auth/mfa/verify API with TOTP code and handle responses (e.g., 200 OK, 401 Invalid TOTP).

Effort Estimate: 7 hours

Status: ☐ NOT STARTED

Compliance: GDPR Article 32, ISO/IEC 27701 7.2.8.

Gap Analysis:

Risk: Poor usability of MFA flow.

Mitigation: Intuitive UI with clear TOTP instructions.

Risk: Accessibility issues with TOTP input.

Mitigation: WCAG 2.1 compliance via Material-UI.

Sub-task 1.13.3: Integrate MFA Setup in User Registration

Objective: Allow users to set up MFA during registration.

Activities:

1.13.3.1: Update src/portal/portal-frontend/src/pages/Register.tsx to call /portal/auth/mfa/setup after successful registration.

1.13.3.2: Display QR code for TOTP setup using qrcode.react (^3.1.0) in Register.tsx.

1.13.3.3: Handle setup errors and provide user feedback (e.g., “Scan QR code with authenticator app”).

Effort Estimate: 6 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 IA-2, OWASP Top 10.

Gap Analysis:

Risk: Complex MFA setup discouraging users.

Mitigation: Clear QR code display and instructions.

Risk: Insecure MFA secret transmission.

Mitigation: HTTPS via Axios and secure backend storage.

Sub-task 1.13.4: Test and Document MFA Flow

Objective: Test the MFA flow and document its implementation.

Activities:

1.13.4.1: Write unit tests for mfaService.ts using Jest to verify TOTP generation and validation.

1.13.4.2: Write integration tests for /portal/auth/mfa/setup and /portal/auth/mfa/verify using Supertest and msw.

1.13.4.3: Document MFA flow in docs/MFA.md, including setup, verification, and test instructions.

Effort Estimate: 4 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8.

Gap Analysis:

Risk: Insufficient test coverage for MFA.

Mitigation: Comprehensive unit and integration tests.

Risk: Unclear documentation impacting maintenance.

Mitigation: Detailed MFA.md with setup and test details.

Effort Summary

Total Estimated Effort: 25 hours

Completed Effort: 0 hours

Remaining Effort: 25 hours

Compliance Summary

Maps to NIST, PCI DSS, GDPR, OWASP, and ISO/IEC 27701 standards, ensuring secure and compliant MFA implementation.

Continuous gap analysis mitigates risks across security, usability, and compliance.

Scalability and Innovation

MFA Security: Enhances user trust with robust authentication for regulated industries.

Modularity: Supports future authentication tasks (e.g., Tasks 1.12, 1.14).

Cost Efficiency: Leverages existing backend (Task 1.5) and frontend (Task 1.6) infrastructure.

Next Steps

Execute Sub-task 1.13.1: Implement Backend MFA Logic starting August 28, 2025.

Execute Sub-tasks 1.13.2–1.13.4 sequentially, completing by September 2, 2025.

Update ROADMAP.md to reflect Task 1.13 milestones.

Direct Devin to execute sub-tasks per the implementation plan below.

Follow-Up Request:

Confirm WBS version 1.0 for Task 1.13 and authorize execution.

Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, and 1.11.

Provide Initiative 2 WBS for roadmap integration.



Implementation Plan for Task 1.13: Multi-Factor Authentication (MFA) Setup & Integration
Artifact ID: g1a2b3c4-8e9f-4a0b-b5c6-7d8e9f0a1234
Version: 1.0
Date: June 21, 2025
Responsible Party: Ronak (CTO/CIO/CISO), Devin (Lead Engineer)
Objective
Implement Multi-Factor Authentication (MFA) with TOTP for the Minkalla Quantum-Safe Privacy Portal, integrating with the backend (/portal/auth/*) and frontend login flow to enhance user security and ensure compliance.
Activities and Deliverables
Sub-task 1.13.1: Implement Backend MFA Logic
Objective: Add TOTP-based MFA logic to the backend authentication service.
Tasks:
Install speakeasy: npm install speakeasy@2.0.0 in src/portal/portal-backend.
Create src/auth/mfaService.ts to generate TOTP secrets (stored in AWS Secrets Manager via Task 1.5.4) and verify TOTP codes.
Update src/auth/auth.controller.ts to add endpoints: POST /portal/auth/mfa/setup (returns TOTP secret and QR code data), POST /portal/auth/mfa/verify (validates TOTP code).
Deliverables:
src/auth/mfaService.ts with TOTP logic.
Updated src/auth/auth.controller.ts with MFA endpoints.
package.json with speakeasy dependency.
Effort Estimate: 8 hours
Compliance: NIST SP 800-53 IA-2, PCI DSS 8.3, OWASP Top 10.
Sub-task 1.13.2: Update Frontend Login Flow for MFA
Objective: Enhance the login form to support MFA with TOTP input.
Tasks:
Update src/portal/portal-frontend/src/pages/Login.tsx to add TOTP input field after initial login (conditional rendering post-/portal/auth/login).
Use Material-UI TextField for TOTP input, ensuring WCAG 2.1 compliance (e.g., ARIA labels, clear instructions).
Call POST /portal/auth/mfa/verify with TOTP code using Axios, handling responses (e.g., 200 OK, 401 Invalid TOTP).
Deliverables:
Updated src/portal/portal-frontend/src/pages/Login.tsx with MFA UI and logic.
Effort Estimate: 7 hours
Compliance: GDPR Article 32, ISO/IEC 27701 7.2.8.
Sub-task 1.13.3: Integrate MFA Setup in User Registration
Objective: Allow users to set up MFA during registration.
Tasks:
Install qrcode.react: npm install qrcode.react@3.1.0.
Update src/portal/portal-frontend/src/pages/Register.tsx to call POST /portal/auth/mfa/setup after registration, displaying QR code for TOTP setup.
Handle setup errors and provide user feedback (e.g., “Scan with Google Authenticator”).
Deliverables:
Updated src/portal/portal-frontend/src/pages/Register.tsx with MFA setup.
package.json with qrcode.react dependency.
Effort Estimate: 6 hours
Compliance: NIST SP 800-53 IA-2, OWASP Top 10.
Sub-task 1.13.4: Test and Document MFA Flow
Objective: Test the MFA flow and document its implementation.
Tasks:
Write unit tests in src/auth/__tests__/mfaService.spec.ts using Jest for TOTP generation/validation.
Write integration tests for /portal/auth/mfa/setup and /portal/auth/mfa/verify using Supertest and msw to mock responses.
Create docs/MFA.md detailing MFA setup, verification, API endpoints, and test instructions.
Deliverables:
src/auth/__tests__/mfaService.spec.ts with unit tests.
Integration tests in src/auth/__tests__/auth.controller.spec.ts.
docs/MFA.md with MFA documentation.
Effort Estimate: 4 hours
Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8.
Execution Plan
Start Date: August 28, 2025
Responsible Party: Devin (Lead Engineer), under Ronak’s oversight.
Timeline:
August 28–29: Sub-task 1.13.1 (Backend MFA logic, 8 hours).
August 30–31: Sub-task 1.13.2 (Frontend login MFA, 7 hours).
September 1: Sub-task 1.13.3 (Registration MFA setup, 6 hours).
September 2: Sub-task 1.13.4 (Testing and documentation, 4 hours).
Dependencies:
Task 1.5.3: Backend API endpoints (/portal/auth/*) [cite: WBS_Task_1.5.md].
Task 1.5.4: AWS Secrets Manager for TOTP secret storage [cite: WBS_Task_1.5.md].
Task 1.6: Frontend setup (React, Material-UI, Axios) [cite: WBS_Task_1.6.md].
Task 1.11: Login flow (frontend) [cite: WBS_Task_1.11.md].
Deliverables Submission:
Commit changes to minkalla/quantum-safe-privacy-portal (src/portal/portal-backend, src/portal/portal-frontend, docs).
Create pull request with code, tests, and MFA.md.
Notify Ronak for review by September 2, 2025.
Validation:
Run docker-compose up -d (Task 1.7) and test /portal/auth/mfa/setup, /portal/auth/mfa/verify with curl.
Verify MFA flow at http://localhost:3000/login and http://localhost:3000/register.
Run npm test to confirm 80%+ test coverage for MFA components.
Compliance Mappings
NIST SP 800-53 IA-2: MFA enhances authentication security.
PCI DSS 8.3: MFA for user access.
GDPR Article 32: Secure processing of user data.
OWASP Top 10: Secure authentication mechanisms.
Gap Analysis
Risk: Insecure TOTP secret storage or transmission.
Mitigation: AWS Secrets Manager and HTTPS via Axios.
Risk: Complex MFA flow reducing user adoption.
Mitigation: Intuitive QR code setup and clear UI feedback.
Risk: Insufficient test coverage for MFA.
Mitigation: Comprehensive Jest and Supertest tests.
Risk: Delayed backend integration due to Task 1.5.4.
Mitigation: Coordinate with Sub-task 1.5.4 completion.
Cost Management
AWS Free Tier: Secrets Manager (~$1–$2/month) and backend API hosting.
MongoDB Atlas M0: ~$150–$250/month (backend dependency).
Open-Source Tools: Speakeasy, qrcode.react minimize costs.
Execution Instructions for Devin
Setup:
Clone minkalla/quantum-safe-privacy-portal and checkout main branch.
Navigate to src/portal/portal-backend and src/portal/portal-frontend.
Ensure Docker Compose is running (docker-compose up -d) from Task 1.7.
Execution:
Implement Sub-tasks 1.13.1–1.13.4 per the timeline.
Use speakeasy for TOTP and qrcode.react for QR code display.
Configure API calls to http://localhost:8080/portal/auth/mfa/*.
Testing:
Run npm test to verify unit and integration tests.
Test MFA setup and verification at http://localhost:3000/register and http://localhost:3000/login.
Validate QR code display and TOTP functionality with an authenticator app.
Submission:
Commit changes with message: “Implement Task 1.13: MFA Setup & Integration (g1a2b3c4)”.
Create pull request with code, tests, and MFA.md.
Notify Ronak for review by September 2, 2025.
Next Steps
Devin to execute Sub-task 1.13.1 starting August 28, 2025.
Ronak to review deliverables for compliance and quality by September 2, 2025.
Update WBS to reflect Task 1.13 completion.
Coordinate with Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, and 1.11 execution.
Follow-Up Request:
Confirm this implementation plan and authorize Devin to begin execution.
Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, and 1.11.
Provide Initiative 2 WBS for roadmap integration.

