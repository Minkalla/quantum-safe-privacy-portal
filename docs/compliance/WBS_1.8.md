WBS 1.8 – Backend Monorepo Restructure and Dev Environment Recovery
🎯 Objective Restructure the backend architecture into a maintainable NX monorepo, while preserving all dev workflows, CI compatibility, and public assets. This WBS implements a non-destructive migration by duplicating files, enabling full rollback if regressions occur.

✅ Scope Summary
Included in Scope	Explicitly Out of Scope
Restructure backend into apps/backend	❌ No frontend migration (e.g., to apps/frontend)
Create libs/ structure and stubs	❌ No functional build-out of optional libs
Restore public assets (favicon, logo)	❌ No shared DTO refactor outside backend
Fix CI/test/dev scripts and env configs	❌ No Dockerfile/Secrets automation changes
🧩 Structure Overview
apps/
  └── backend/
      └── main.ts, etc.

libs/
  ├── auth/
  ├── user/
  ├── pqc/
  ├── common/      ← stub only
  └── logger/      ← stub only
🔧 Sub-tasks and Deliverables
1. Duplicate Backend to apps/backend + Libs
Copy backend files from src/portal/portal-backend/ → apps/backend/

Extract auth, user, and pqc logic into libs/ folders

Add project.json and tags for each library

Update tsconfig.base.json with path aliases

🕒 Est. Effort: 5 hours 📘 Compliance: ISO/IEC 27001 A.14.2.2

2. Recover Public Assets
Move static assets into apps/backend/public/

Validate Swagger UI (/docs), favicon, and logos render correctly

Update static serve logic in main.ts

🕒 Est. Effort: 2 hours 📘 Compliance: OWASP ASVS 1.6.2

3. CI, Dev Scripts, and Env Consistency
Update start:dev, nx test, nx lint scripts to point to new layout

Refactor GitHub Actions workflows that used src/portal/...

Confirm .env loading and Docker Compose support

Run nx graph to confirm app/lib visibility

🕒 Est. Effort: 4 hours 📘 Compliance: NIST SP 800-53 CM-3, ISO A.12.1.2

4. Validation and Rollback Readiness
Confirm /portal/auth/* routes function identically in both layouts

Validate PQC handshake is preserved

Create docs/MIGRATING.md summarizing:

Old → new mappings

Rollback instructions (rm -rf apps/ libs/, revert tsconfig, reset .github/workflows/)

🕒 Est. Effort: 3 hours 📘 Compliance: NIST SP 800-53 SA-11

🔄 Rollback Strategy
Condition	Rollback Action
Route breaks	Use legacy src/portal/portal-backend/
Broken CI workflows	Restore pre-1.8 .github/workflows/ configs
Imports or env failures	Revert tsconfig.base.json + script registry
All duplication is additive—no risk of loss until WBS 1.8 is explicitly accepted and legacy files deleted.