# Migration Guide – NX Monorepo Backend Refactor

## Overview
This document outlines the file and structure changes made in WBS 1.8 to transition the backend to an NX-based monorepo. It also provides rollback instructions and testing notes.

---

## Folder Structure (Old → New)

| Old Path                             | New Path                  |
|--------------------------------------|----------------------------|
| src/portal/portal-backend/          | apps/backend/              |
| src/portal/models/User.ts           | libs/user/src/lib/user.ts  |
| src/portal/services/auth.service.ts | libs/auth/src/lib/auth.ts  |
| public/swagger/ or /static assets   | apps/backend/public/       |

---

## NX Project Breakdown

- `apps/backend`: Main NestJS API
- `libs/auth`: Authentication logic
- `libs/user`: User model/schema
- `libs/pqc`: Post-Quantum Handshake integration
- `libs/common`: Shared utilities (placeholder)
- `libs/logger`: Logging wrapper (placeholder)

---

## CI and Script Adjustments

- All GitHub Actions workflows updated to use `apps/backend`
- New `start:dev`, `nx test`, and `nx lint` scripts aligned with NX
- `tsconfig.base.json` updated with path aliases for each lib

---

## Testing Checklist

- `nx serve backend` works without error
- `/portal/auth/*` endpoints return expected results
- Swagger available at `/docs`
- Static assets render correctly
- All CI jobs pass on PR

---

## Rollback Instructions

If needed, restore prior structure with:

```bash
git checkout <pre-WBS-1.8-commit>
rm -rf apps/ libs/
restore tsconfig.base.json, workflows, env files
