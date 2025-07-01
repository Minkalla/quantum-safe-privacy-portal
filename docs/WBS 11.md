Task 1.11: User Login Flow (Frontend Logic & UI)
Artifact ID: e2f3a4b5-7c8d-4e9b-b0c1-8d9e0f1a2345 Version: 1.0 Owner: Ronak (CTO/CIO/CISO) Effort Estimate: 25 hours Status: Not Started Compliance: GDPR Article 20, OWASP Top 10, NIST SP 800-53 SC-8, ISO/IEC 27701 7.2.8

🎯 Objective
Implement a secure, accessible login flow in the Minkalla frontend using React, Material-UI, Formik, and Yup—integrated with the /portal/auth/login backend endpoint.

🧱 Sub-tasks
1.11.1 – Login Form UI
Build Login.tsx in src/pages/

MUI components with WCAG/ARIA support

Handle error display and accessibility

Effort: 6h

1.11.2 – Form Validation
Formik + Yup validation for email and password

Inline Material-UI feedback

Effort: 6h

1.11.3 – Backend Integration
POST to /portal/auth/login with { email, password }

Handle 200 (JWT + redirect to /dashboard) and 401 (error)

Store token in localStorage

Effort: 7h

1.11.4 – Testing & Documentation
Unit tests with RTL + Jest

Integration with msw (200, 401)

Write docs/USER_LOGIN.md with flow summary

Effort: 6h

🔒 Risk/Gaps Mitigated
UX drift → solved via MUI

Validation gaps → addressed with Yup reuse

Insecure credential handling → HTTPS + token storage

API outages → user-friendly error flow

🔧 Dependencies
Task 1.5.3: Backend /portal/auth/login

Task 1.6: React/MUI/Axios

Task 1.7: Docker Compose

Task 1.10: Formik/Yup patterns

🚦 Execution Plan
Start Date: August 21, 2025

Sub-tasks 1.11.1 → 1.11.4 completed sequentially by August 27

ROADMAP.md updated with 1.11 milestone

Devin owns implementation unless reassigned