Work Breakdown Structure (WBS) for Task 1.19: User Profile & Dashboard (Basic View)

Artifact ID: t5a6b7c8-4d9e-4f0a-b1c2-6b7c8d9e0123Version: 1.0Date: June 21, 2025Responsible Party: Ronak (CTO/CIO/CISO)

Objective

Implement a basic user profile and dashboard view in the Minkalla Quantum-Safe Privacy Portal frontend, integrating with backend APIs to display and manage user data securely, ensuring compliance with enterprise-grade standards and a seamless user experience.

Operational Notes

Gap Analysis: Continuous gap analysis is performed for all sub-tasks to identify and mitigate risks (e.g., data exposure, usability issues, compliance gaps), ensuring enterprise-grade quality.

Dependencies: Relies on:

Task 1.5.3: Backend API endpoints (/portal/user/*) [cite: WBS_Task_1.5.md, version 2.2].

Task 1.6: Frontend initialization (React/TypeScript, Material-UI) [cite: WBS_Task_1.6.md, version 1.0].

Task 1.10: User registration flow [cite: WBS_Task_1.10.md, version 1.0].

Task 1.11: User login flow [cite: WBS_Task_1.11.md, version 1.0].

Task 1.12: Session management [cite: WBS_Task_1.12.md, version 1.0].

Task 1.13: MFA integration [cite: WBS_Task_1.13.md, version 1.0].

Task 1.14: SSO integration [cite: WBS_Task_1.14.md, version 1.0].

Task 1.15: Device trust management [cite: WBS_Task_1.15.md, version 1.0].

Task 1.16: White-label branding [cite: WBS_Task_1.16.md, version 1.0].

Task 1.18: Routing & navigation [cite: WBS_Task_1.18.md, version 1.0].

WBS Structure

Task 1.19: User Profile & Dashboard (Basic View)

Objective: Develop a user profile and dashboard view with secure data display and basic management features.

Effort Estimate: 25 hours

Compliance Mappings:

GDPR Article 20: Data portability via user profile access.

OWASP Top 10: Secure data handling and access control.

NIST SP 800-53 SC-8: Secure data transmission.

ISO/IEC 27701 7.2.8: Secure development practices.

Sub-task 1.19.1: Implement Backend User Profile APIs

Objective: Create APIs to retrieve and update user profile data.

Activities:

1.19.1.1: Update src/portal/portal-backend/src/user/user.service.ts to handle user profile data (e.g., email, name).

1.19.1.2: Add endpoints in src/user/user.controller.ts: GET /portal/user/profile (retrieve profile), PUT /portal/user/profile (update profile).

1.19.1.3: Secure endpoints with auth.middleware.ts (Task 1.12) to restrict access to authenticated users.

Effort Estimate: 7 hours

Status: ☐ NOT STARTED

Compliance: GDPR Article 20, OWASP Top 10, NIST SP 800-53 SC-8.

Gap Analysis:

Risk: Data exposure via unsecured APIs.

Mitigation: RBAC middleware and HTTPS.

Risk: Scalability issues with profile queries.

Mitigation: Optimize MongoDB queries with indexing.

Sub-task 1.19.2: Develop Frontend Profile & Dashboard UI

Objective: Build a user profile and dashboard view in the frontend.

Activities:

1.19.2.1: Create src/portal/portal-frontend/src/pages/Dashboard.tsx with Material-UI components (Card, Typography) to display user profile data (e.g., email, name).

1.19.2.2: Add a profile edit form in Dashboard.tsx for updating user data (e.g., name), using Formik/Yup (Task 1.10).

1.19.2.3: Ensure WCAG 2.1 accessibility with ARIA labels and high-contrast styling.

Effort Estimate: 8 hours

Status: ☐ NOT STARTED

Compliance: GDPR Article 20, ISO/IEC 27701 7.2.8.

Gap Analysis:

Risk: Poor usability of dashboard UI.

Mitigation: Intuitive Material-UI components and UX design.

Risk: Accessibility non-compliance.

Mitigation: WCAG 2.1 compliance with ARIA attributes.

Sub-task 1.19.3: Integrate Profile APIs with Dashboard

Objective: Connect the dashboard to backend profile APIs.

Activities:

1.19.3.1: Use Axios (Task 1.6) in Dashboard.tsx to call GET /portal/user/profile and PUT /portal/user/profile.

1.19.3.2: Handle API responses (e.g., 200 OK, 401 Unauthorized) with user-friendly error messages.

1.19.3.3: Apply white-label branding (Task 1.16) to dashboard UI dynamically.

Effort Estimate: 6 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 SC-8, OWASP Top 10.

Gap Analysis:

Risk: Insecure API communication exposing user data.

Mitigation: HTTPS via Axios and secure JWT handling.

Risk: Branding inconsistencies in dashboard.

Mitigation: Dynamic branding from Task 1.16.

Sub-task 1.19.4: Test and Document Profile & Dashboard

Objective: Test the profile and dashboard view, documenting the implementation.

Activities:

1.19.4.1: Write unit tests for user.service.ts and Dashboard.tsx using Jest and React Testing Library to validate profile data handling.

1.19.4.2: Write integration tests for /portal/user/profile endpoints using Supertest and msw for frontend API calls.

1.19.4.3: Document dashboard in docs/USER_PROFILE_DASHBOARD.md, including APIs, UI components, and test setup.

Effort Estimate: 4 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8.

Gap Analysis:

Risk: Insufficient test coverage for profile data.

Mitigation: Comprehensive unit and integration tests.

Risk: Unclear documentation impacting maintenance.

Mitigation: Detailed USER_PROFILE_DASHBOARD.md.

Effort Summary

Total Estimated Effort: 25 hours

Completed Effort: 0 hours

Remaining Effort: 25 hours

Compliance Summary

Maps to GDPR, OWASP, NIST, and ISO/IEC 27701 standards, ensuring secure and compliant user profile management.

Continuous gap analysis mitigates risks across security, usability, and compliance.

Scalability and Innovation

User Experience: Enhances user interaction with secure profile management.

Modularity: Supports future tasks (e.g., Task 1.21 for data rights).

Cost Efficiency: Leverages existing backend (Task 1.5) and frontend (Task 1.6) infrastructure.

Next Steps

Execute Sub-task 1.19.1: Implement Backend User Profile APIs starting October 11, 2025.

Execute Sub-tasks 1.19.2–1.19.4 sequentially, completing by October 16, 2025.

Update ROADMAP.md to reflect Task 1.19 milestones.

Direct Devin to execute sub-tasks per the implementation plan below.

Follow-Up Request:

Confirm WBS version 1.0 for Task 1.19 and authorize execution.

Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, and 1.18.

Provide Initiative 2 WBS for roadmap integration.





Implementation Plan for Task 1.19: User Profile & Dashboard (Basic View)

Artifact ID: u6b7c8d9-5e0f-4a1b-b2c3-7a8b9c0d1234Version: 1.0Date: June 21, 2025Responsible Party: Ronak (CTO/CIO/CISO), Devin (Lead Engineer)

Objective

Implement a basic user profile and dashboard view in the Minkalla Quantum-Safe Privacy Portal frontend, integrating with backend APIs to display and manage user data securely, ensuring compliance and a seamless user experience.

Activities and Deliverables

Sub-task 1.19.1: Implement Backend User Profile APIs

Objective: Create APIs to retrieve and update user profile data.

Tasks:

Update src/portal/portal-backend/src/user/user.service.ts to handle profile data retrieval and updates (e.g., email, name).

Add endpoints in src/user/user.controller.ts: GET /portal/user/profile (returns user data), PUT /portal/user/profile (updates name).

Secure endpoints with auth.middleware.ts (Task 1.12) to ensure authenticated access.

Deliverables:

Updated src/user/user.service.ts with profile logic.

Updated src/user/user.controller.ts with profile endpoints.

Effort Estimate: 7 hours

Compliance: GDPR Article 20, OWASP Top 10, NIST SP 800-53 SC-8.

Sub-task 1.19.2: Develop Frontend Profile & Dashboard UI

Objective: Build a user profile and dashboard view in the frontend.

Tasks:

Create src/portal/portal-frontend/src/pages/Dashboard.tsx with Material-UI Card and Typography to display user data (e.g., email, name).

Add a profile edit form in Dashboard.tsx using Formik/Yup (Task 1.10) for updating name, with validation.

Ensure WCAG 2.1 accessibility with ARIA labels and high-contrast styling.

Deliverables:

src/portal/portal-frontend/src/pages/Dashboard.tsx with profile and dashboard UI.

Effort Estimate: 8 hours

Compliance: GDPR Article 20, ISO/IEC 27701 7.2.8.

Sub-task 1.19.3: Integrate Profile APIs with Dashboard

Objective: Connect the dashboard to backend profile APIs.

Tasks:

Use Axios (Task 1.6) in Dashboard.tsx to call GET /portal/user/profile and PUT /portal/user/profile.

Handle API responses: display profile data for 200 OK, show error messages for 401/400.

Apply white-label branding (Task 1.16) to dashboard UI via dynamic theme settings.

Deliverables:

Updated src/pages/Dashboard.tsx with API integration and branding.

Effort Estimate: 6 hours

Compliance: NIST SP 800-53 SC-8, OWASP Top 10.

Sub-task 1.19.4: Test and Document Profile & Dashboard

Objective: Test the profile and dashboard view, documenting the implementation.

Tasks:

Write unit tests for user.service.ts and Dashboard.tsx using Jest and React Testing Library to validate profile data handling.

Write integration tests for /portal/user/profile endpoints using Supertest and msw for frontend API calls.

Create docs/USER_PROFILE_DASHBOARD.md detailing APIs, UI components, branding integration, and test setup.

Deliverables:

src/user/__tests__/user.service.spec.ts and src/pages/__tests__/Dashboard.spec.tsx with tests.

docs/USER_PROFILE_DASHBOARD.md with documentation.

Effort Estimate: 4 hours

Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8.

Execution Plan

Start Date: October 11, 2025

Responsible Party: Devin (Lead Engineer), under Ronak’s oversight.

Timeline:

October 11–12: Sub-task 1.19.1 (Backend profile APIs, 7 hours).

October 13–14: Sub-task 1.19.2 (Frontend dashboard UI, 8 hours).

October 15: Sub-task 1.19.3 (API integration, 6 hours).

October 16: Sub-task 1.19.4 (Testing and documentation, 4 hours).

Dependencies:

Task 1.5.3: Backend API [cite: WBS_Task_1.5.md].

Task 1.6: Frontend setup [cite: WBS_Task_1.6.md].

Task 1.10: Registration flow [cite: WBS_Task_1.10.md].

Task 1.11: Login flow [cite: WBS_Task_1.11.md].

Task 1.12: Session management [cite: WBS_Task_1.12.md].

Task 1.13: MFA [cite: WBS_Task_1.13.md].

Task 1.14: SSO [cite: WBS_Task_1.14.md].

Task 1.15: Device trust [cite: WBS_Task_1.15.md].

Task 1.16: White-label branding [cite: WBS_Task_1.16.md].

Task 1.18: Routing & navigation [cite: WBS_Task_1.18.md].

Deliverables Submission:

Commit changes to minkalla/quantum-safe-privacy-portal (src/portal/portal-backend, src/portal/portal-frontend, docs).

Create pull request with code, tests, and USER_PROFILE_DASHBOARD.md.

Notify Ronak for review by October 16, 2025.

Validation:

Run docker-compose up -d (Task 1.7) and test /portal/user/profile with curl.

Verify dashboard at http://localhost:3000/dashboard for profile display and editing.

Run npm test to confirm 80%+ test coverage for dashboard components.

Compliance Mappings

GDPR Article 20: User profile supports data portability.

OWASP Top 10: Secure data handling and access control.

NIST SP 800-53 SC-8: Secure data transmission via HTTPS.

ISO/IEC 27701 7.2.8: Secure development practices.

Gap Analysis

Risk: Data exposure via unsecured profile APIs.

Mitigation: RBAC middleware and HTTPS via Axios.

Risk: Poor usability of dashboard interface.

Mitigation: Intuitive Material-UI components and Formik.

Risk: Insufficient test coverage.

Mitigation: Comprehensive Jest and Supertest tests.

Risk: Branding inconsistencies in dashboard.

Mitigation: Dynamic branding from Task 1.16.

Cost Management

AWS Free Tier: Secrets Manager (~$1–$2/month) and backend API hosting.

MongoDB Atlas M0: ~$150–$250/month (backend dependency).

Open-Source Tools: Material-UI, Formik minimize costs.

Execution Instructions for Devin

Setup:

Clone minkalla/quantum-safe-privacy-portal and checkout main branch.

Navigate to src/portal/portal-backend and src/portal/portal-frontend.

Ensure Docker Compose is running (docker-compose up -d) from Task 1.7.

Execution:

Implement Sub-tasks 1.19.1–1.19.4 per the timeline.

Use Material-UI for dashboard UI and Axios for API integration.

Configure API calls to http://localhost:8080/portal/user/profile.

Testing:

Run npm test to verify unit and integration tests.

Test dashboard at http://localhost:3000/dashboard for profile display and editing.

Validate branding and accessibility compliance.

Submission:

Commit changes with message: “Implement Task 1.19: User Profile & Dashboard (u6b7c8d9)”.

Create pull request with code, tests, and USER_PROFILE_DASHBOARD.md.

Notify Ronak for review by October 16, 2025.

Next Steps

Devin to execute Sub-task 1.19.1 starting October 11, 2025.

Ronak to review deliverables for compliance and quality by October 16, 2025.

Update WBS to reflect Task 1.19 completion.

Coordinate with Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, and 1.18 execution.

Follow-Up Request:

Confirm this implementation plan and authorize Devin to begin execution.

Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, and 1.18.

Provide Initiative 2 WBS for roadmap integration.

