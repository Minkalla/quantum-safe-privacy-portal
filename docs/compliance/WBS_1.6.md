---
🧪 Requires PQC integration verification: Yes  
🔐 Auth/API Contract Touched: Yes  
📁 Affects File Structure: Yes  
📌 CI Impacting: Yes  
---

## 🔍 Sub-Task Metadata Matrix

| Sub-task       | 🧪 PQC Test | 🔐 API Access | 📁 Structure | 📌 CI Impact |
|----------------|-------------|---------------|----------------|---------------|
| 1.6.1 – Layout Foundation & Sidebar        | No  | No  | Yes | Yes |
| 1.6.2 – Login Form & Token Handling        | Yes | Yes | Yes | Yes |
| 1.6.3 – Consent Form UI                    | No  | No  | Yes | Yes |
| 1.6.4 – Consent Submission to API          | Yes | Yes | Yes | Yes |
| 1.6.5 – Auth Error Handling & JWT Decode   | Yes | Yes | Yes | Yes |

🧠 Guidance
1.6.2, 1.6.4, and 1.6.5 must run pnpm test ffi-verification due to interactions with /portal/auth and the FFI bridge.

1.6.1 and 1.6.3 are safe to skip PQC tests—style/layout only.

All sub-tasks impact either API contract, UI logic, or CI/CD triggers (e.g. type-level refactors or component re-exports).

Devin should tackle these in sequence to progressively validate crypto flows and surface error states early.

# Implementation Plan for Task 1.6: Build Frontend UI & API Integration (Login + Consent)

**Artifact ID**: ip-frontend-consent-flow  
**Version**: 1.0  
**Date**: July 1, 2025  
**Responsible Party**: Devin (Lead Engineer)  
**Reviewed By**: Ronak (CTO/CIO/CISO)

---

## 🎯 Objective

Implement the full login and consent collection flow in the Quantum-Safe Privacy Portal’s frontend, including layout scaffolding, FFI-bound crypto authentication via `/portal/auth`, and consent UI → backend submission via `/portal/consent`.

---

## 🔧 Sub-task Breakdown

### ✅ 1.6.1 – Layout Foundation & Sidebar  
- Set up reusable layout with sidebar nav + outlet
- Wire in Vite router structure
- Does not require PQC verification

### ✅ 1.6.2 – Login Form & Token Capture  
- Implement email/password login form
- Hit `/portal/auth/login` → receive JWT
- ✅ Must run `pnpm test ffi-verification`

### ✅ 1.6.3 – Consent UI & Multi-step Modal  
- Display user permissions, context-driven modals
- Style only—no backend submission
- No PQC test needed

### ✅ 1.6.4 – Consent Submission Flow  
- Connect POST `/portal/consent`  
- Must attach JWT in header, verify crypto path
- ✅ Must run `pnpm test ffi-verification`

### ✅ 1.6.5 – Auth Error Handling & JWT Decode  
- Show API errors, expired token states
- Decode JWT to render consent logic
- ✅ Must run `pnpm test ffi-verification`

---

## 🔐 Required CI Tests

- `pnpm test ffi-verification` must pass before merge (via `/portal/auth`)
- Run `pnpm test` and `pnpm lint` locally before PR

---

📦 Expected Deliverables
Devin is responsible for the following as part of completing WBS 1.6:

✅ All code-level artifacts for Subtasks 1.6.1 – 1.6.5

✅ pnpm test ffi-verification results documented (pass/fail or link to logs)

✅ Review and update any of the following files if present:

docs/DEBUGGING.md (auth flow edge cases, JWT decoding issues)

src/utils/jwt.ts (JWT decode/verify logic, error behavior)

src/components/consent/consent-form.md (UX, API notes, payload shape)

✅ If any artifact is missing, create it using the Minkalla structure and naming conventions

✅ Ensure nothing PQC-related is left undocumented (especially auth crypto handshake, consent token flow)

🎯 Goal: Leave the repo in a state where the next dev, QA, or auditor can trace every auth/consent edge case, test path, and dev insight—without having to ask you.

## 📁 Affected Files

| Path | Description |
|------|-------------|
| `src/portal/portal-frontend/src/components/auth/` | Login form, context |
| `src/portal/portal-frontend/src/components/consent/` | Consent form logic |
| `src/portal/portal-frontend/src/layout/` | Sidebar, layout shell |
| `src/portal/portal-frontend/src/api/` | API call abstractions |
| `src/portal/portal-frontend/src/utils/jwt.ts` | Decode, validate JWT |

---

## 🧪 Validation

| Flow | Test |
|------|------|
| Login → Auth | `/portal/auth/login` returns 200, JWT structure valid |
| JWT Decode | JWT payload matches expected schema |
| Consent Submission | `/portal/consent` accepts payload and returns success |
| FFI Verification | `pnpm test ffi-verification` passes locally and in CI |
| Error States | 401/403 errors shown cleanly in UI |

---

## 🛡️ Compliance Mapping

| Control | Area | Status |
|---------|------|--------|
| GDPR Article 7 | Consent Logging | Partial (validated in backend) |
| NIST SP 800-53 IA-2 | Auth UX | In Progress |
| SOC 2 | UI Authentication | In Progress |

---

## ⏱️ Timeline

| Date | Milestone |
|------|-----------|
| July 1–2 | 1.6.1, 1.6.2 |
| July 3 | 1.6.3 |
| July 4–5 | 1.6.4, 1.6.5 |
| July 6 | PR Review & Validation |

