# WBS 1.17 – Enterprise Admin & Onboarding Features

**Artifact ID:** p1d2e3f4-0a5b-4c6d-b7e8-3a4b5c6d7890  
**Version:** 1.0  
**Date:** June 29, 2025  
**Responsible Party:** Ronak (CTO/CIO/CISO)

---

## 🎯 Objective

Build the foundation for secure enterprise onboarding, role-based access control (RBAC), and centralized admin UI within the Minkalla privacy platform. Includes frontend management dashboard, backend access policies, initial enterprise role creation, and compliance mappings.

---

## 📦 Sub-tasks and Deliverables

### Sub-task 1.17.1 – Role-Based Access Control (RBAC) Backend

- Define `RolesEnum` (`admin`, `enterprise-user`, `viewer`, etc.)
- Add `role` field to `User` entity (persist in database)
- Enforce role validation in sensitive endpoints (e.g., user listing, audit logs, settings updates)
- Store as part of JWT payload (in `jwt.service.ts`)

**Effort:** 6 hours  
**Compliance:** NIST AC-2, OWASP A5 (Broken Access Control)

---

### Sub-task 1.17.2 – Enterprise Admin Dashboard (UI)

- Add `AdminDashboard.tsx` in `src/pages/admin/`
- Use MUI `DataGrid` to list all users (id, email, role, createdAt)
- Add role-edit dropdown (disabled for self)
- Conditionally show this view to logged-in users with `role === 'admin'`
- Secure route with `ProtectedRoute` and route guard logic

**Effort:** 8 hours  
**Compliance:** WCAG 2.1, ISO/IEC 27701 7.4.2, NIST SC-12

---

### Sub-task 1.17.3 – Initial Admin Bootstrap Logic

- On registration of first user (if no users exist in DB), assign `admin` role automatically
- Add backend logic in `AuthService.register()` using user count check
- Prevent duplicate admins unless manually upgraded via dashboard

**Effort:** 3 hours  
**Compliance:** GDPR Art. 25, FedRAMP IA-2, NIST IA-5

---

### Sub-task 1.17.4 – Onboarding Success Page and Navigation

- Add `WelcomeEnterprise.tsx` page shown post-login on first access
- Link to admin dashboard or user view based on role
- Add dismiss state (`localStorage["onboarded"] = true`)

**Effort:** 4 hours  
**Compliance:** NIST PL-2, ISO/IEC 27701 7.2.8

---

### Sub-task 1.17.5 – Test Coverage and Documentation

- Unit tests: role assignment logic, RBAC guards, admin dashboard rendering
- Integration tests: login + redirected flows for admin/user
- Write `docs/ENTERPRISE_ADMIN.md` with:
  - Role hierarchy
  - Dashboard UX
  - Upgrade workflows
  - Onboarding logic

**Effort:** 5 hours  
**Compliance:** NIST RA-5, OWASP A10 (Logging & Monitoring)

---

## ⏱ Execution Plan

| Date       | Task                  |
|------------|------------------------|
| Sept 2     | RBAC Backend (1.17.1) |
| Sept 3–4   | Admin UI (1.17.2)     |
| Sept 5     | Bootstrap Logic (1.17.3) |
| Sept 6     | Welcome Flow (1.17.4) |
| Sept 7     | Tests + Docs (1.17.5) |

---

## ✅ Deliverables

- Admin panel at `/admin`  
- `role` persisted in DB and surfaced in frontend  
- `ENTERPRISE_ADMIN.md` in `docs/`  
- Minimum 80% test coverage for role/guard/UI  
- Users auto-bootstrapped with `admin` role if no users in DB  
- PRs: 1 for backend logic, 1 for frontend/admin UI

---

## 🔐 Compliance

- **GDPR Art. 25**
- **OWASP Top 10**: A5, A10
- **FedRAMP IA-2**, NIST AC-2, SC-12, PL-2, RA-5
- **ISO/IEC 27701**: 7.2.8, 7.4.2

---

Let me know if you want this woven into the ROADMAP.md or if you’re ready to queue up WBS 1.18. You’re mapping ops-grade architecture at startup speed. 🧭📘🛡️
