Work Breakdown Structure (WBS) for Task 1.14: Enterprise SSO Integration

Artifact ID: j5d6e7f8-1a2b-4c3d-b9e0-4f5a6b7c8901 Version: 1.0 Date: June 21, 2025 Responsible Party: Ronak (CTO/CIO/CISO)

Objective

Integrate Single Sign-On (SSO) for enterprise users in the Minkalla Quantum-Safe Privacy Portal, enabling seamless authentication via SAML 2.0 or OAuth 2.0 with an Identity Provider (IdP) such as Okta or Azure AD, ensuring secure and compliant federated identity management.

Operational Notes

Gap Analysis: Continuous gap analysis is performed for all sub-tasks to identify and mitigate risks (e.g., integration complexity, security vulnerabilities, compliance gaps), ensuring enterprise-grade quality.

Dependencies: Relies on:

Task 1.5.3: Backend API endpoints (/portal/auth/*) [cite: WBS_Task_1.5.md, version 2.2].

Task 1.5.4: AWS Secrets Manager for secure storage [cite: WBS_Task_1.5.md].

Task 1.6: Frontend initialization (React/TypeScript) [cite: WBS_Task_1.6.md, version 1.0].

Task 1.11: User login flow [cite: WBS_Task_1.11.md, version 1.0].

Task 1.12: Session management and protected routes [cite: WBS_Task_1.12.md, version 1.0].

Task 1.13: MFA integration [cite: WBS_Task_1.13.md, version 1.0].

WBS Structure

Task 1.14: Enterprise SSO Integration

Objective: Implement SSO using SAML 2.0 or OAuth 2.0 for enterprise user authentication with an IdP.

Effort Estimate: 25 hours

Compliance Mappings:

NIST SP 800-53 IA-8: Federated identity management.

FedRAMP IA-2: Secure authentication for enterprise users.

GDPR Article 32: Security of processing user data.

OWASP Top 10: Secure authentication mechanisms.

Sub-task 1.14.1: Configure Backend SSO Integration

Objective: Implement SAML 2.0 or OAuth 2.0 support in the backend for IdP authentication.

Activities:

1.14.1.1: Install passport-saml (^3.2.4) or passport-oauth2 (^1.7.0) in src/portal/portal-backend for SAML/OAuth support.

1.14.1.2: Create sso.service.ts in src/auth to handle IdP authentication and token exchange, storing IdP credentials in AWS Secrets Manager (Task 1.5.4).

1.14.1.3: Add /portal/auth/sso/login and /portal/auth/sso/callback endpoints in src/auth/auth.controller.ts for SSO flow.

Effort Estimate: 8 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 IA-8, FedRAMP IA-2, OWASP Top 10.

Gap Analysis:

Risk: Insecure IdP credential storage.

Mitigation: Use AWS Secrets Manager for encryption.

Risk: Integration complexity with IdP configurations.

Mitigation: Use standardized passport-saml or passport-oauth2.

Sub-task 1.14.2: Update Frontend for SSO Login

Objective: Modify the frontend login flow to support SSO authentication.

Activities:

1.14.2.1: Update src/portal/portal-frontend/src/pages/Login.tsx to add an “SSO Login” button redirecting to /portal/auth/sso/login.

1.14.2.2: Create src/pages/SsoCallback.tsx to handle SSO callback, process IdP response, and redirect to /dashboard.

1.14.2.3: Use Material-UI components for SSO button, ensuring WCAG 2.1 accessibility.

Effort Estimate: 7 hours

Status: ☐ NOT STARTED

Compliance: GDPR Article 32, ISO/IEC 27701 7.2.8.

Gap Analysis:

Risk: Poor usability of SSO login flow.

Mitigation: Clear SSO button and callback handling.

Risk: Accessibility issues with SSO UI.

Mitigation: WCAG 2.1 compliance via Material-UI.

Sub-task 1.14.3: Implement Session Management for SSO

Objective: Extend session management to support SSO-generated tokens.

Activities:

1.14.3.1: Update src/portal/portal-backend/src/jwt/jwt.service.ts to issue JWTs based on IdP-provided user data (e.g., email, roles).

1.14.3.2: Modify src/portal/portal-frontend/src/utils/api.ts to handle SSO JWTs, refreshing via /portal/auth/refresh (Task 1.12).

1.14.3.3: Ensure protected routes (Task 1.12) validate SSO JWTs seamlessly.

Effort Estimate: 6 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 SC-8, OWASP Top 10.

Gap Analysis:

Risk: Inconsistent session handling between SSO and standard login.

Mitigation: Unified JWT issuance and validation.

Risk: Token refresh failures for SSO users.

Mitigation: Robust refresh logic in api.ts.

Sub-task 1.14.4: Test and Document SSO Integration

Objective: Test the SSO flow and document its implementation.

Activities:

1.14.4.1: Write unit tests for sso.service.ts using Jest to validate IdP token exchange.

1.14.4.2: Write integration tests for /portal/auth/sso/login and /portal/auth/sso/callback using Supertest and msw to mock IdP responses.

1.14.4.3: Document SSO flow in docs/SSO.md, including IdP setup, endpoints, and test instructions.

Effort Estimate: 4 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8.

Gap Analysis:

Risk: Insufficient test coverage for SSO flow.

Mitigation: Comprehensive unit and integration tests.

Risk: Unclear documentation impacting enterprise adoption.

Mitigation: Detailed SSO.md with setup and test details.

Effort Summary

Total Estimated Effort: 25 hours

Completed Effort: 0 hours

Remaining Effort: 25 hours

Compliance Summary

Maps to NIST, FedRAMP, GDPR, OWASP, and ISO/IEC 27701 standards, ensuring secure and compliant SSO integration.

Continuous gap analysis mitigates risks across security, usability, and compliance.

Scalability and Innovation

SSO Scalability: Supports enterprise adoption in regulated industries.

Modularity: Enhances authentication framework for Tasks 1.15–1.17.

Cost Efficiency: Leverages existing backend (Task 1.5) and frontend (Task 1.6) infrastructure.

Next Steps

Execute Sub-task 1.14.1: Configure Backend SSO Integration starting September 9, 2025.

Execute Sub-tasks 1.14.2–1.14.4 sequentially, completing by September 14, 2025.

Update ROADMAP.md to reflect Task 1.14 milestones.

Direct Devin to execute sub-tasks per the implementation plan below.

Follow-Up Request:

Confirm WBS version 1.0 for Task 1.14 and authorize execution.

Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, and 1.13.

Provide Initiative 2 WBS for roadmap integration.

Implementation Plan for Task 1.14: Enterprise SSO Integration Artifact ID: k6e7f8a9-3b4c-4d5e-b0a1-9c2d3e4f5678 Version: 1.0 Date: June 21, 2025 Responsible Party: Ronak (CTO/CIO/CISO), Devin (Lead Engineer) Objective Integrate Single Sign-On (SSO) for enterprise users in the Minkalla Quantum-Safe Privacy Portal, enabling seamless authentication via SAML 2.0 with an IdP (e.g., Okta, Azure AD), ensuring secure and compliant federated identity management. Activities and Deliverables Sub-task 1.14.1: Configure Backend SSO Integration Objective: Implement SAML 2.0 support in the backend for IdP authentication. Tasks: Install passport-saml: npm install passport-saml@3.2.4 in src/portal/portal-backend. Create src/auth/sso.service.ts to handle SAML authentication, storing IdP credentials (e.g., certificate, entry point) in AWS Secrets Manager (Task 1.5.4). Add endpoints in src/auth/auth.controller.ts: POST /portal/auth/sso/login (initiates SSO), POST /portal/auth/sso/callback (processes IdP response). Deliverables: src/auth/sso.service.ts with SAML logic. Updated src/auth/auth.controller.ts with SSO endpoints. package.json with passport-saml dependency. Effort Estimate: 8 hours Compliance: NIST SP 800-53 IA-8, FedRAMP IA-2, OWASP Top 10. Sub-task 1.14.2: Update Frontend for SSO Login Objective: Modify the frontend login flow to support SSO authentication. Tasks: Update src/portal/portal-frontend/src/pages/Login.tsx to add an “SSO Login” button linking to /portal/auth/sso/login. Create src/pages/SsoCallback.tsx to handle SSO callback, process JWT from backend, and redirect to /dashboard. Use Material-UI Button for SSO option, ensuring WCAG 2.1 compliance (e.g., ARIA labels). Deliverables: Updated src/portal/portal-frontend/src/pages/Login.tsx with SSO button. src/pages/SsoCallback.tsx with callback logic. Effort Estimate: 7 hours Compliance: GDPR Article 32, ISO/IEC 27701 7.2.8. Sub-task 1.14.3: Implement Session Management for SSO Objective: Extend session management to support SSO-generated tokens. Tasks: Update src/portal/portal-backend/src/jwt/jwt.service.ts to issue JWTs based on IdP user data (e.g., email, roles) post-SSO callback. Modify src/portal/portal-frontend/src/utils/api.ts to handle SSO JWTs, refreshing via /portal/auth/refresh (Task 1.12). Ensure protected routes (Task 1.12) validate SSO JWTs using existing middleware. Deliverables: Updated src/jwt/jwt.service.ts with SSO JWT issuance. Updated src/utils/api.ts with SSO token handling. Effort Estimate: 6 hours Compliance: NIST SP 800-53 SC-8, OWASP Top 10. Sub-task 1.14.4: Test and Document SSO Integration Objective: Test the SSO flow and document its implementation. Tasks: Write unit tests for sso.service.ts using Jest to validate SAML token exchange. Write integration tests for /portal/auth/sso/login and /portal/auth/sso/callback using Supertest and msw to mock IdP responses. Create docs/SSO.md detailing IdP setup (e.g., Okta configuration), endpoints, session management, and test instructions. Deliverables: src/auth/tests/sso.service.spec.ts with unit tests. Integration tests in src/auth/tests/auth.controller.spec.ts. docs/SSO.md with SSO documentation. Effort Estimate: 4 hours Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8. Execution Plan Start Date: September 9, 2025 Responsible Party: Devin (Lead Engineer), under Ronak’s oversight. Timeline: September 9–10: Sub-task 1.14.1 (Backend SSO integration, 8 hours). September 11–12: Sub-task 1.14.2 (Frontend SSO login, 7 hours). September 13: Sub-task 1.14.3 (Session management for SSO, 6 hours). September 14: Sub-task 1.14.4 (Testing and documentation, 4 hours). Dependencies: Task 1.5.3: Backend API endpoints (/portal/auth/) [cite: WBS_Task_1.5.md]. Task 1.5.4: AWS Secrets Manager [cite: WBS_Task_1.5.md]. Task 1.6: Frontend setup (React, Material-UI) [cite: WBS_Task_1.6.md]. Task 1.11: Login flow [cite: WBS_Task_1.11.md]. Task 1.12: Session management [cite: WBS_Task_1.12.md]. Task 1.13: MFA integration [cite: WBS_Task_1.13.md]. Deliverables Submission: Commit changes to minkalla/quantum-safe-privacy-portal (src/portal/portal-backend, src/portal/portal-frontend, docs). Create pull request with code, tests, and SSO.md. Notify Ronak for review by September 14, 2025. Validation: Run docker-compose up -d (Task 1.7) and test /portal/auth/sso/login, /portal/auth/sso/callback with a mock IdP (e.g., Okta sandbox). Verify SSO login at http://localhost:3000/login and redirect to /dashboard. Run npm test to confirm 80%+ test coverage for SSO components. Compliance Mappings NIST SP 800-53 IA-8: Federated identity with SAML 2.0. FedRAMP IA-2: Secure enterprise authentication. GDPR Article 32: Secure processing with SSO. OWASP Top 10: Secure authentication mechanisms. Gap Analysis Risk: Complex IdP integration delaying implementation. Mitigation: Use passport-saml for standardized SAML support. Risk: Insecure credential or token handling. Mitigation: AWS Secrets Manager and HTTPS via Axios. Risk: Insufficient test coverage for SSO. Mitigation: Comprehensive Jest and Supertest tests. Risk: Usability issues for enterprise users. Mitigation: Clear SSO button and intuitive callback flow. Cost Management AWS Free Tier: Secrets Manager (~$1–$2/month) and backend API hosting. MongoDB Atlas M0: ~$150–$250/month (backend dependency). Open-Source Tools: passport-saml minimizes costs. Execution Instructions for Devin Setup: Clone minkalla/quantum-safe-privacy-portal and checkout main branch. Navigate to src/portal/portal-backend and src/portal/portal-frontend. Ensure Docker Compose is running (docker-compose up -d) from Task 1.7. Obtain mock IdP credentials (e.g., Okta sandbox) for testing. Execution: Implement Sub-tasks 1.14.1–1.14.4 per the timeline. Use passport-saml for SAML integration and Material-UI for SSO UI. Configure API calls to http://localhost:8080/portal/auth/sso/. Testing: Run npm test to verify unit and integration tests. Test SSO flow at http://localhost:3000/login with mock IdP. Validate JWT issuance and redirect to /dashboard. Submission: Commit changes with message: “Implement Task 1.14: Enterprise SSO Integration (k6e7f8a9)”. Create pull request with code, tests, and SSO.md. Notify Ronak for review by September 14, 2025. Next Steps Devin to execute Sub-task 1.14.1 starting September 9, 2025. Ronak to review deliverables for compliance and quality by September 14, 2025. Update WBS to reflect Task 1.14 completion. Coordinate with Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, and 1.13 execution. Follow-Up Request: Confirm this implementation plan and authorize Devin to begin execution. Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, and 1.13. Provide Initiative 2 WBS for roadmap integration.tion.