🧱 WBS 1.8 – Monorepo Restructure & Codebase Stabilization
Objective: Transition the codebase to a modular nx monorepo structure while preserving existing app behavior, frontend assets, development scripts, and CI compatibility.

📦 Deliverables
1. Monorepo Setup
✅ Initialize nx in repo root using nx init

✅ Establish folder structure:

apps/backend → existing NestJS backend (renamed and relocated)

libs/auth → shared authentication logic (DTOs, strategies)

libs/user → user schema and user-related services

Optional: libs/common, libs/pqc, libs/logger as needed

✅ Add project.json files and tags to nx.json for each app/lib

2. Dev Script & CI Recovery
✅ Replace or adjust root-level package.json scripts:

nx serve backend

nx test backend

nx lint backend

✅ Confirm start:dev works with SKIP_SECRETS_MANAGER=true

✅ Fix broken GitHub Actions or .env references caused by path changes

3. Asset and Public Folder Recovery
✅ Restore public/ directory (or equivalent) for logo, static assets

✅ Ensure favicon, OpenAPI Swagger docs, and other visual assets resolve at runtime

✅ Address relative import paths in frontend/backend that may have broken

4. Housekeeping and Developer Onboarding
✅ Provide MIGRATING.md or README section that explains:

Folder structure

Where to put new apps/libs

Rules for inter-library imports (tags enforcement)

✅ Enforce linting and boundary checks for cross-lib consistency

5. Test & Validation
✅ All previous /auth routes should still resolve and behave as before

✅ Swagger should load correctly at /docs

✅ Logo and favicon should render

✅ Login and register flows should persist users and trigger PQC handshakes

📄 Required PR Description Sections
Architecture Notes

Example: “apps/backend is now the main NestJS app. libs/user holds Mongoose schema. Static assets moved to apps/backend/public.”

Migration Path

Describe file moves and changed script behavior

Known Gaps or Things Deferred

(e.g., frontend app setup, CI secrets injection)
