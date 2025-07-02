# WBS 1.10 – User Registration Flow (Frontend Logic & UI)

**Artifact ID:** h0a1b2c4-7e8f-4a9b-b5d7-9c3d4e5f6789  
**Version:** 1.0  
**Date:** June 21, 2025  
**Responsible Party:** Ronak (CTO/CIO/CISO), Devin (Lead Engineer)

---

## 🎯 Objective

Implement the frontend UI and logic for the user registration flow within the Minkalla Quantum-Safe Privacy Portal, fully integrated with the backend endpoint `/portal/auth/register`. Ensure accessibility, secure validation, and high test coverage using a Material-UI/React/Formik/Yup stack.

---

## 📦 Sub-tasks and Deliverables

### Sub-task 1.10.1 – Design Registration Form UI

- Create `Register.tsx` page in `src/portal/portal-frontend/src/pages/`
- Include email, password, confirm password fields
- Use Material-UI with WCAG 2.1-compliant styling and ARIA tags
- Implement error rendering with helper text

🕒 Effort: 6 hours  
📘 Compliance: GDPR Article 20, ISO/IEC 27701 7.2.8

---

### Sub-task 1.10.2 – Form Validation Logic

- Install `formik@2.4.6` and `yup@1.4.0`
- Implement Yup validation:
  - Valid email
  - Password: ≥8 chars, 1 uppercase, 1 digit
  - Confirm password: match check
- Inline error rendering via Formik + MUI

🕒 Effort: 6 hours  
📘 Compliance: OWASP Top 10, ISO/IEC 27701 7.2.8

---

### Sub-task 1.10.3 – API Integration

- POST to `/portal/auth/register` via Axios
- Handle:
  - HTTP 201 → Success message + redirect to `/login`
  - HTTP 400/500 → Show error state
- Use `useNavigate` from React Router

🕒 Effort: 7 hours  
📘 Compliance: NIST SP 800-53 SC-8, OWASP Top 10

---

### Sub-task 1.10.4 – Testing & Documentation

- Unit test with Jest + React Testing Library
- Integration test with `msw` for mocked backend responses
- Write `docs/USER_REGISTRATION.md` covering:
  - Validation schema
  - API usage
  - Developer test setup
  - Coverage expectations

🕒 Effort: 6 hours  
📘 Compliance: NIST SP 800-53 RA-5, ISO/IEC 27701 7.2.8

---

## 🛠 Execution Plan

| Date         | Sub-task                | Owner  |
|--------------|--------------------------|--------|
| Aug 14–15    | 1.10.1 (Form UI)         | Devin  |
| Aug 16–17    | 1.10.2 (Validation)      | Devin  |
| Aug 18–19    | 1.10.3 (API Integration) | Devin  |
| Aug 20       | 1.10.4 (Tests + Docs)    | Devin  |

Dependencies:  
- 1.5.3 (Register API)  
- 1.6 (React/MUI/Axios setup)  
- 1.7 (Docker Compose)

---

## 📘 Validation & Deliverables

- [ ] PR with working `Register.tsx`
- [ ] 80%+ test coverage on registration UI
- [ ] Functional registration at `http://localhost:3000/register`
- [ ] Redirection to `/login` on success
- [ ] `docs/USER_REGISTRATION.md` submitted
- [ ] Commit message:  
  `"Implement Task 1.10: User Registration Flow (h0a1b2c4)"`

---

## 🔄 Risk & Mitigation

| Risk                         | Mitigation                                         |
|------------------------------|----------------------------------------------------|
| Insecure form transmission   | HTTPS enforced via Axios + backend validation      |
| Poor UX/accessibility        | WCAG 2.1 + Material-UI + ARIA best practices       |
| Test coverage below threshold| MSW + RTL integrated with CI                       |
| Backend API unavailable      | Coordinate with Task 1.5.3 and Secrets team (1.5.4)|

---

## 💰 Cost Estimate

- MongoDB Atlas M0: $150–$250/mo (backend dependency)  
- AWS Free Tier: Hosting + Secrets Manager ($1–2/mo)  
- Open-source stack: $0 (Formik, Yup, MUI)

---

## ✅ Compliance Tags

- GDPR Article 20  
- OWASP Top 10  
- ISO/IEC 27701 7.2.8  
- NIST SP 800-53 SC-8, RA-5

