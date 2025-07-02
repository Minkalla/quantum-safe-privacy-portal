Work Breakdown Structure (WBS) for Task 1.12: Advanced Session Management & Protected Routes

Artifact ID: h3b4c5d6-9f0a-4b1c-b7e8-2a3b4c5d6789 Version: 1.0 Date: June 21, 2025 Responsible Party: Ronak (CTO/CIO/CISO)

Objective

Implement advanced session management and protected routes for the Minkalla Quantum-Safe Privacy Portal, ensuring secure JWT-based authentication, session expiration, and restricted access to resources on both backend and frontend, aligning with enterprise-grade security standards.

Operational Notes

Gap Analysis: Continuous gap analysis is performed for all sub-tasks to identify and mitigate risks (e.g., unauthorized access, session hijacking, compliance gaps), ensuring enterprise-grade quality.

Dependencies: Relies on:

Task 1.5.3: Backend API endpoints (/portal/auth/*) [cite: WBS_Task_1.5.md, version 2.2].

Task 1.5.4: AWS Secrets Manager for JWT secrets [cite: WBS_Task_1.5.md].

Task 1.6: Frontend initialization (React/TypeScript, React Router) [cite: WBS_Task_1.6.md, version 1.0].

Task 1.11: User login flow (JWT handling) [cite: WBS_Task_1.11.md, version 1.0].

Task 1.13: MFA integration [cite: WBS_Task_1.13.md, version 1.0].

WBS Structure

Task 1.12: Advanced Session Management & Protected Routes

Objective: Implement secure session management and protected routes to restrict access to authenticated users.

Effort Estimate: 25 hours

Compliance Mappings:

NIST SP 800-53 SC-8: Secure data transmission with JWT.

PCI DSS 4.1: Secure key management for JWTs.

GDPR Article 32: Security of processing user data.

OWASP Top 10: Mitigate broken authentication and access control risks.

Sub-task 1.12.1: Implement Backend Session Management

Objective: Enhance backend to manage JWT-based sessions with expiration and refresh tokens.

Activities:

1.12.1.1: Update src/portal/portal-backend/src/jwt/jwt.service.ts to issue refresh tokens alongside access tokens, using AWS Secrets Manager (Task 1.5.4).

1.12.1.2: Create /portal/auth/refresh endpoint in src/auth/auth.controller.ts to validate refresh tokens and issue new access tokens.

1.12.1.3: Implement session expiration logic (e.g., 15-minute access token, 7-day refresh token).

Effort Estimate: 8 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 SC-8, PCI DSS 4.1, OWASP Top 10.

Gap Analysis:

Risk: Session hijacking due to insecure token handling.

Mitigation: Secure JWT storage and HTTPS transmission.

Risk: Inefficient refresh token management.

Mitigation: Use AWS Secrets Manager for secure storage.

Sub-task 1.12.2: Implement Backend Route Protection

Objective: Add middleware to protect backend routes for authenticated users.

Activities:

1.12.2.1: Create auth.middleware.ts in src/portal/portal-backend/src/auth to validate JWTs from Authorization header.

1.12.2.2: Apply middleware to protect routes (e.g., /portal/user/profile) in src/user/user.controller.ts.

1.12.2.3: Handle unauthorized access with 401 responses and error messages.

Effort Estimate: 6 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 AC-3, OWASP Top 10 (broken access control).

Gap Analysis:

Risk: Unauthorized access to protected routes.

Mitigation: Robust JWT validation middleware.

Risk: Middleware performance overhead.

Mitigation: Optimize validation with efficient JWT parsing.

Sub-task 1.12.3: Implement Frontend Protected Routes

Objective: Protect frontend routes to restrict access to authenticated users.

Activities:

1.12.3.1: Create ProtectedRoute.tsx in src/portal/portal-frontend/src/components to check JWT in localStorage and redirect unauthenticated users to /login.

1.12.3.2: Update src/App.tsx to use ProtectedRoute for routes like /dashboard.

1.12.3.3: Implement refresh token logic in src/utils/api.ts to refresh JWT on expiration.

Effort Estimate: 7 hours

Status: ☐ NOT STARTED

Compliance: GDPR Article 32, OWASP Top 10 (broken authentication).

Gap Analysis:

Risk: Insecure JWT storage in localStorage.

Mitigation: Temporary use, with future HttpOnly cookie in Task 1.14.

Risk: Poor user experience on redirect.

Mitigation: Smooth redirects with React Router.

Sub-task 1.12.4: Test and Document Session Management

Objective: Test session management and protected routes, documenting the implementation.

Activities:

1.12.4.1: Write unit tests for jwt.service.ts and auth.middleware.ts using Jest to validate token issuance and route protection.

1.12.4.2: Write integration tests for /portal/auth/refresh and protected routes using Supertest and msw.

1.12.4.3: Document session management in docs/SESSION_MANAGEMENT.md, detailing JWT handling, refresh tokens, and route protection.

Effort Estimate: 4 hours

Status: ☐ NOT STARTED

Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8.

Gap Analysis:

Risk: Insufficient test coverage for session management.

Mitigation: Comprehensive unit and integration tests.

Risk: Unclear documentation impacting maintenance.

Mitigation: Detailed SESSION_MANAGEMENT.md.

Effort Summary

Total Estimated Effort: 25 hours

Completed Effort: 0 hours

Remaining Effort: 25 hours

Compliance Summary

Maps to NIST, PCI DSS, GDPR, OWASP, and ISO/IEC 27701 standards, ensuring secure and compliant session management.

Continuous gap analysis mitigates risks across security, usability, and compliance.

Scalability and Innovation

Secure Authentication: Enhances trust for regulated industries.

Modularity: Supports future authentication tasks (e.g., Tasks 1.13, 1.14).

Cost Efficiency: Leverages existing backend (Task 1.5) and frontend (Task 1.6) infrastructure.

Next Steps

Execute Sub-task 1.12.1: Implement Backend Session Management starting September 3, 2025.

Execute Sub-tasks 1.12.2–1.12.4 sequentially, completing by September 8, 2025.

Update ROADMAP.md to reflect Task 1.12 milestones.

Direct Devin to execute sub-tasks per the implementation plan below.

Follow-Up Request:

Confirm WBS version 1.0 for Task 1.12 and authorize execution.

Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, and 1.13.

Provide Initiative 2 WBS for roadmap integration.

Implementation Plan for Task 1.12: Advanced Session Management & Protected Routes

Artifact ID: i4c5d6e7-0a1b-4c2d-b8e9-3f4a5b6c7890 Version: 1.0 Date: June 21, 2025 Responsible Party: Ronak (CTO/CIO/CISO), Devin (Lead Engineer)

Objective

Implement advanced session management and protected routes for the Minkalla Quantum-Safe Privacy Portal, ensuring secure JWT-based authentication, session expiration, and restricted access to resources on both backend and frontend.

Activities and Deliverables

Sub-task 1.12.1: Implement Backend Session Management

Objective: Enhance backend to manage JWT-based sessions with expiration and refresh tokens.

Tasks:

Update src/portal/portal-backend/src/jwt/jwt.service.ts to issue refresh tokens (7-day expiry) alongside access tokens (15-minute expiry), using AWS Secrets Manager (Task 1.5.4).

Create POST /portal/auth/refresh endpoint in src/auth/auth.controller.ts to validate refresh tokens and issue new access tokens.

Implement session expiration logic, ensuring tokens are invalidated on expiry or logout.

Deliverables:

Updated src/jwt/jwt.service.ts with refresh token logic.

src/auth/auth.controller.ts with /portal/auth/refresh endpoint.

Effort Estimate: 8 hours

Compliance: NIST SP 800-53 SC-8, PCI DSS 4.1, OWASP Top 10.

Sub-task 1.12.2: Implement Backend Route Protection

Objective: Add middleware to protect backend routes for authenticated users.

Tasks:

Create src/portal/portal-backend/src/auth/auth.middleware.ts to validate JWTs from Authorization: Bearer <token> header using jsonwebtoken.

Apply middleware to routes (e.g., GET /portal/user/profile) in src/user/user.controller.ts.

Return 401 Unauthorized with error message for invalid/missing tokens.

Deliverables:

src/auth/auth.middleware.ts with JWT validation logic.

Updated src/user/user.controller.ts with protected routes.

Effort Estimate: 6 hours

Compliance: NIST SP 800-53 AC-3, OWASP Top 10.

Sub-task 1.12.3: Implement Frontend Protected Routes

Objective: Protect frontend routes to restrict access to authenticated users.

Tasks:

Create src/portal/portal-frontend/src/components/ProtectedRoute.tsx to check JWT in localStorage and redirect to /login if invalid/missing.

Update src/App.tsx to use ProtectedRoute for /dashboard route.

Implement refresh token logic in src/utils/api.ts to call /portal/auth/refresh on token expiration, updating localStorage.

Deliverables:

src/components/ProtectedRoute.tsx with route protection logic.

Updated src/App.tsx with protected routes.

Updated src/utils/api.ts with refresh token logic.

Effort Estimate: 7 hours

Compliance: GDPR Article 32, OWASP Top 10.

Sub-task 1.12.4: Test and Document Session Management

Objective: Test session management and protected routes, documenting the implementation.

Tasks:

Write unit tests for jwt.service.ts and auth.middleware.ts using Jest to validate token issuance, refresh, and route protection.

Write integration tests for /portal/auth/refresh and protected routes using Supertest and msw.

Create docs/SESSION_MANAGEMENT.md detailing JWT handling, refresh tokens, route protection, and test setup.

Deliverables:

src/jwt/_tests_/jwt.service.spec.ts and src/auth/_tests_/auth.middleware.spec.ts with unit tests.

Integration tests in src/auth/_tests_/auth.controller.spec.ts.

docs/SESSION_MANAGEMENT.md with documentation.

Effort Estimate: 4 hours

Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8.

Execution Plan

Start Date: September 3, 2025

Responsible Party: Devin (Lead Engineer), under Ronak’s oversight.

Timeline:

September 3–4: Sub-task 1.12.1 (Backend session management, 8 hours).

September 5: Sub-task 1.12.2 (Backend route protection, 6 hours).

September 6–7: Sub-task 1.12.3 (Frontend protected routes, 7 hours).

September 8: Sub-task 1.12.4 (Testing and documentation, 4 hours).

Dependencies:

Task 1.5.3: Backend API endpoints (/portal/auth/*) [cite: WBS_Task_1.5.md].

Task 1.5.4: AWS Secrets Manager for JWT secrets [cite: WBS_Task_1.5.md].

Task 1.6: Frontend setup (React, React Router) [cite: WBS_Task_1.6.md].

Task 1.11: Login flow (JWT handling) [cite: WBS_Task_1.11.md].

Task 1.13: MFA integration [cite: WBS_Task_1.13.md].

Deliverables Submission:

Commit changes to minkalla/quantum-safe-privacy-portal (src/portal/portal-backend, src/portal/portal-frontend, docs).

Create pull request with code, tests, and SESSION_MANAGEMENT.md.

Notify Ronak for review by September 8, 2025.

Validation:

Run docker-compose up -d (Task 1.7) and test /portal/auth/refresh and protected routes (e.g., /portal/user/profile) with curl.

Verify frontend route protection at http://localhost:3000/dashboard.

Run npm test to confirm 80%+ test coverage for session management components.

Compliance Mappings

NIST SP 800-53 SC-8: Secure JWT transmission and storage.

PCI DSS 4.1: Secure key management with AWS Secrets Manager.

GDPR Article 32: Secure processing with protected routes.

OWASP Top 10: Mitigates broken authentication and access control.

Gap Analysis

Risk: Insecure JWT storage in localStorage.

Mitigation: Temporary use, with HttpOnly cookies planned in Task 1.14.

Risk: Unauthorized access to protected routes.

Mitigation: Robust JWT validation and middleware.

Risk: Insufficient test coverage.

Mitigation: Comprehensive Jest and Supertest tests.

Risk: Delayed integration with Task 1.5.4 (Secrets Management).

Mitigation: Coordinate with Sub-task 1.5.4 completion.

Cost Management

AWS Free Tier: Secrets Manager (~$1–$2/month) and backend API hosting.

MongoDB Atlas M0: ~$150–$250/month (backend dependency).

Open-Source Tools: No additional costs for JWT handling.

Execution Instructions for Devin

Setup:

Clone minkalla/quantum-safe-privacy-portal and checkout main branch.

Navigate to src/portal/portal-backend and src/portal/portal-frontend.

Ensure Docker Compose is running (docker-compose up -d) from Task 1.7.

Execution:

Implement Sub-tasks 1.12.1–1.12.4 per the timeline.

Use jsonwebtoken for JWT handling and Axios for API calls.

Configure API calls to http://localhost:8080/portal/auth/refresh.

Testing:

Run npm test to verify unit and integration tests.

Test protected routes (/portal/user/profile, /dashboard) with valid/invalid JWTs.

Validate refresh token functionality with curl.

Submission:

Commit changes with message: “Implement Task 1.12: Session Management & Protected Routes (i4c5d6e7)”.

Create pull request with code, tests, and SESSION_MANAGEMENT.md.

Notify Ronak for review by September 8, 2025.

Next Steps

Devin to execute Sub-task 1.12.1 starting September 3, 2025.

Ronak to review deliverables for compliance and quality by September 8, 2025.

Update WBS to reflect Task 1.12 completion.

Coordinate with Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, and 1.13 execution.

Follow-Up Request:

Confirm this implementation plan and authorize Devin to begin execution.

Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, and 1.13.

Provide Initiative 2 WBS for roadmap integration.

Notify Ronak for review by September 8, 2025.

8, 2025.

Next Steps

Devin to execute Sub-task 1.12.1 starting September 3, 2025.

Ronak to review deliverables for compliance and quality by September 8, 2025.

Update WBS to reflect Task 1.12 completion.

Coordinate with Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, and 1.13 execution.

Follow-Up Request:

Confirm this implementation plan and authorize Devin to begin execution.

Specify prioritization relative to Tasks 1.5.4–1.5.7, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, and 1.13.

Provide Initiative 2 WBS for roadmap integration.

