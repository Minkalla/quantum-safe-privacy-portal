Work Breakdown Structure (WBS) for Task 1.16: White-Label Authentication & Branding

Artifact ID: n9b0c1d2-6e7f-4a8b-b3c4-2a3b4c5d6789Version: 1.0Date: June 21, 2025Responsible Party: Ronak (CTO/CIO/CISO)

Objective

Implement white-label authentication and branding for the Minkalla Quantum-Safe Privacy Portal, allowing enterprise clients to customize the authentication UI (login, registration) with their branding while ensuring security, accessibility, and compliance with enterprise-grade standards.

Operational Notes

Gap Analysis: Continuous gap analysis is performed for all sub-tasks to identify and mitigate risks (e.g., branding inconsistencies, security vulnerabilities, compliance gaps), ensuring enterprise-grade quality.

Dependencies: Relies on:

Task 1.5.3: Backend API endpoints (/portal/auth/*) [cite: WBS_Task_1.5.md, version 2.2].

Task 1.6: Frontend initialization (React/TypeScript, Material-UI) [cite: WBS_Task_1.6.md, version 1.0].

Task 1.10: User registration flow [cite: WBS_Task_1.10.md, version 1.0].

Task 1.11: User login flow [cite: WBS_Task_1.11.md, version 1.0].

Task 1.12: Session management [cite: WBS_Task_1.12.md, version 1.0].

Task 1.13: MFA integration [cite: WBS_Task_1.13.md, version 1.0].

Task 1.14: SSO integration [cite: WBS_Task_1.14.md, version 1.0].

Task 1.15: Device trust management [cite: WBS_Task_1.15.md, version 1.0].

WBS Structure

Task 1.16: White-Label Authentication & Branding

Objective: Enable enterprise clients to customize authentication UI with their branding (logos, colors, text).

Effort Estimate: 25 hours

Compliance Mappings:

GDPR Article 20: Data portability via customizable auth interfaces.

ISO/IEC 27701 7.2.8: Secure development practices.

NIST SP 800-53 CM-3: Documented configuration management.

OWASP Top 10: Secure UI customization.

Sub-task 1.16.1: Implement Backend Branding Configuration

Objective: Add backend support for storing and serving client-specific branding configurations.

Activities:

1.16.1.1: Create branding.service.ts in src/portal/portal-backend/src/branding to manage branding data (e.g., logo URL, primary color, company name).

1.16.1.2: Extend user or tenant schema in src/user/user.schema.ts to include branding settings, stored in MongoDB.

1.16.1.3: Add /portal/branding/config endpoint in src/branding/branding.controller.ts to retrieve client-specific branding data.

Effort Estimate: 8 hours

Status: ☐ NOT STARTED

Compliance: GDPR Article 20, NIST SP 800-53 CM-3.

Gap Analysis:

Risk: Insecure storage of branding data.

Mitigation: Use MongoDB with encryption and access controls.

Risk: Scalability issues with branding retrieval.

Mitigation: Cache configurations in memory (Redis planned for Initiative 2).

Sub-task 1.16.2: Update Frontend for Dynamic Branding

Objective: Modify the frontend to apply client-specific branding dynamically.

Activities:

1.16.2.1: Update src/portal/portal-frontend/src/styles/theme.ts to support dynamic theme overrides (e.g., primary color, logo).

1.16.2.2: Fetch branding data from /portal/branding/config in src/pages/Login.tsx and src/pages/Register.tsx using Axios.

1.16.2.3: Apply branding (e.g., logo, colors) to UI components, ensuring WCAG 2.1 accessibility.

Effort Estimate: 7 hours

Status: ☐ NOT STARTED

Compliance: ISO/IEC 27701 7.2.8, OWASP Top 10.

Gap Analysis:

Risk: Branding inconsistencies across UI.

Mitigation: Centralized theme management with Material-UI.

Risk: Accessibility issues with custom branding.

Mitigation: Enforce WCAG 2.1 compliance in theme overrides.

Sub-task 1.16.3: Integrate Branding with Authentication Flows

Objective: Ensure white-label branding applies to all authentication flows (login, registration, MFA, SSO).

Activities:

1.16.3.1: Update src/portal/portal-frontend/src/pages/SsoCallback.tsx and MFA prompts (Task 1.13) to apply dynamic branding.

1.16.3.2: Modify src/portal/portal-backend/src/auth/auth.controller.ts to include branding metadata in auth responses (e.g., /portal/auth/login).

1.16.3.3: Ensure protected routes (Task 1.12) and device trust (Task 1.15) UI reflect client branding.

Effort Estimate: 6 hours

Status: ☐ NOT STARTED

Compliance: GDPR Article 32, OWASP Top 10.

Gap Analysis:

Risk: Inconsistent branding across auth flows.

Mitigation: Unified branding application via theme and API metadata.

Risk: Performance overhead from branding data.

Mitigation: Optimize API calls and cache branding data.

Sub-task 1.16.4: Test and Document White-Label Branding

Objective: Test the white-label branding implementation and document its setup.

Activities:

1.16.4.1: Write unit tests for branding.service.ts using Jest to validate configuration retrieval.

1.16.4.2: Write integration tests for /portal/branding/config and branded UI using Supertest and React Testing Library.

1.16.4.3: Document branding setup in docs/WHITE_LABEL_BRANDING.md, including API endpoints, theme overrides, and test instructions.

Effort Estimate: 4 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8.

Gap Analysis:

Risk: Insufficient test coverage for branding.

Mitigation: Comprehensive unit and integration tests.

Risk: Unclear documentation impacting client adoption.

Mitigation: Detailed WHITE_LABEL_BRANDING.md.

Effort Summary

Total Estimated Effort: 25 hours

Completed Effort: 0 hours

Remaining Effort: 25 hours

Compliance Summary

Maps to GDPR, ISO/IEC 27701, NIST, and OWASP standards, ensuring secure and compliant white-label branding.

Continuous gap analysis mitigates risks across security, usability, and compliance.

Scalability and Innovation

Custom Branding: Enhances enterprise client adoption in regulated industries.

Modularity: Supports future tasks (e.g., Tasks 1.17, 1.18).

Cost Efficiency: Leverages existing backend (Task 1.5) and frontend (Task 1.6) infrastructure.

Next Steps

Execute Sub-task 1.16.1: Implement Backend Branding Configuration starting September 21, 2025.

Execute Sub-tasks 1.16.2–1.16.4 sequentially, completing by September 26, 2025.

Update ROADMAP.md to reflect Task 1.16 milestones.

Direct Devin to execute sub-tasks per the implementation plan below.

Follow-Up Request:

Confirm WBS version 1.0 for Task 1.16 and authorize execution.

Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, and 1.15.

Provide Initiative 2 WBS for roadmap integration.





Implementation Plan for Task 1.16: White-Label Authentication & Branding

Artifact ID: o0c1d2e3-9f0a-4b1c-b3c4-8a9b0c1d2345Version: 1.0Date: June 21, 2025Responsible Party: Ronak (CTO/CIO/CISO), Devin (Lead Engineer)

Objective

Implement white-label authentication and branding for the Minkalla Quantum-Safe Privacy Portal, allowing enterprise clients to customize the authentication UI (login, registration) with their branding while ensuring security, accessibility, and compliance.

Activities and Deliverables

Sub-task 1.16.1: Implement Backend Branding Configuration

Objective: Add backend support for storing and serving client-specific branding configurations.

Tasks:

Create src/portal/portal-backend/src/branding/branding.service.ts to manage branding data (e.g., logoUrl, primaryColor, companyName).

Update src/user/user.schema.ts or create a tenant schema to store branding settings in MongoDB (e.g., { tenantId, branding }).

Add GET /portal/branding/config endpoint in src/branding/branding.controller.ts to return branding data for authenticated tenants.

Deliverables:

src/branding/branding.service.ts with branding logic.

Updated or new schema in src/user/user.schema.ts.

src/branding/branding.controller.ts with /portal/branding/config.

Effort Estimate: 8 hours

Compliance: GDPR Article 20, NIST SP 800-53 CM-3.

Sub-task 1.16.2: Update Frontend for Dynamic Branding

Objective: Modify the frontend to apply client-specific branding dynamically.

Tasks:

Update src/portal/portal-frontend/src/styles/theme.ts to support dynamic theme overrides using Material-UI’s createTheme (e.g., primary.main, logoUrl).

Fetch branding data from GET /portal/branding/config in src/pages/Login.tsx and src/pages/Register.tsx using Axios (Task 1.6).

Apply branding to UI components (e.g., logo in NavBar.tsx, colors in TextField), ensuring WCAG 2.1 compliance.

Deliverables:

Updated src/styles/theme.ts with dynamic theming.

Updated src/pages/Login.tsx and src/pages/Register.tsx with branding logic.

Effort Estimate: 7 hours

Compliance: ISO/IEC 27701 7.2.8, OWASP Top 10.

Sub-task 1.16.3: Integrate Branding with Authentication Flows

Objective: Ensure white-label branding applies to all authentication flows.

Tasks:

Update src/portal/portal-frontend/src/pages/SsoCallback.tsx (Task 1.14) and MFA prompts (Task 1.13) to apply dynamic branding from /portal/branding/config.

Modify src/portal/portal-backend/src/auth/auth.controller.ts to include branding metadata in auth responses (e.g., /portal/auth/login, /portal/auth/sso/callback).

Ensure protected routes (Task 1.12) and device trust prompts (Task 1.15) reflect client branding in UI.

Deliverables:

Updated src/pages/SsoCallback.tsx and MFA UI with branding.

Updated src/auth/auth.controller.ts with branding metadata.

Effort Estimate: 6 hours

Compliance: GDPR Article 32, OWASP Top 10.

Sub-task 1.16.4: Test and Document White-Label Branding

Objective: Test the white-label branding implementation and document its setup.

Tasks:

Write unit tests for branding.service.ts using Jest to validate configuration retrieval and storage.

Write integration tests for /portal/branding/config and branded UI using Supertest and React Testing Library.

Create docs/WHITE_LABEL_BRANDING.md detailing branding setup, API endpoints, theme overrides, and test instructions.

Deliverables:

src/branding/__tests__/branding.service.spec.ts with unit tests.

Integration tests in src/branding/__tests__/branding.controller.spec.ts.

docs/WHITE_LABEL_BRANDING.md with documentation.

Effort Estimate: 4 hours

Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8.

Execution Plan

Start Date: September 21, 2025

Responsible Party: Devin (Lead Engineer), under Ronak’s oversight.

Timeline:

September 21–22: Sub-task 1.16.1 (Backend branding configuration, 8 hours).

September 23–24: Sub-task 1.16.2 (Frontend dynamic branding, 7 hours).

September 25: Sub-task 1.16.3 (Authentication flow integration, 6 hours).

September 26: Sub-task 1.16.4 (Testing and documentation, 4 hours).

Dependencies:

Task 1.5.3: Backend API endpoints [cite: WBS_Task_1.5.md].

Task 1.6: Frontend setup [cite: WBS_Task_1.6.md].

Task 1.10: Registration flow [cite: WBS_Task_1.10.md].

Task 1.11: Login flow [cite: WBS_Task_1.11.md].

Task 1.12: Session management [cite: WBS_Task_1.12.md].

Task 1.13: MFA [cite: WBS_Task_1.13.md].

Task 1.14: SSO [cite: WBS_Task_1.14.md].

Task 1.15: Device trust [cite: WBS_Task_1.15.md].

Deliverables Submission:

Commit changes to minkalla/quantum-safe-privacy-portal (src/portal/portal-backend, src/portal/portal-frontend, docs).

Create pull request with code, tests, and WHITE_LABEL_BRANDING.md.

Notify Ronak for review by September 26, 2025.

Validation:

Run docker-compose up -d (Task 1.7) and test /portal/branding/config with curl.

Verify branded UI at http://localhost:3000/login and http://localhost:3000/register.

Run npm test to confirm 80%+ test coverage for branding components.

Compliance Mappings

GDPR Article 20: Customizable auth supports data portability.

ISO/IEC 27701 7.2.8: Secure development with branding customization.

NIST SP 800-53 CM-3: Documented configuration management.

OWASP Top 10: Secure UI customization.

Gap Analysis

Risk: Branding inconsistencies across auth flows.

Mitigation: Centralized theme management and API metadata.

Risk: Insecure branding data exposure.

Mitigation: MongoDB encryption and authenticated endpoint access.

Risk: Insufficient test coverage.

Mitigation: Comprehensive Jest and React Testing Library tests.

Risk: Accessibility issues with custom branding.

Mitigation: Enforce WCAG 2.1 in theme overrides.

Cost Management

AWS Free Tier: Secrets Manager (~$1–$2/month) and backend API hosting.

MongoDB Atlas M0: ~$150–$250/month (backend dependency).

Open-Source Tools: Material-UI minimizes costs.

Execution Instructions for Devin

Setup:

Clone minkalla/quantum-safe-privacy-portal and checkout main branch.

Navigate to src/portal/portal-backend and src/portal/portal-frontend.

Ensure Docker Compose is running (docker-compose up -d) from Task 1.7.

Execution:

Implement Sub-tasks 1.16.1–1.16.4 per the timeline.

Use Material-UI for dynamic theming and Axios for branding API calls.

Configure API calls to http://localhost:8080/portal/branding/config.

Testing:

Run npm test to verify unit and integration tests.

Test branded UI at http://localhost:3000/login and http://localhost:3000/register.

Validate branding consistency across auth flows (SSO, MFA, device trust).

Submission:

Commit changes with message: “Implement Task 1.16: White-Label Authentication & Branding (o0c1d2e3)”.

Create pull request with code, tests, and WHITE_LABEL_BRANDING.md.

Notify Ronak for review by September 26, 2025.

Next Steps

Devin to execute Sub-task 1.16.1 starting September 21, 2025.

Ronak to review deliverables for compliance and quality by September 26, 2025.

Update WBS to reflect Task 1.16 completion.

Coordinate with Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, and 1.15 execution.

Follow-Up Request:

Confirm this implementation plan and authorize Devin to begin execution.

Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, and 1.15.

Provide Initiative 2 WBS for roadmap integration.

