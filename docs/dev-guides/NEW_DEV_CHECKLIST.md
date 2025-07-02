✅ NEW_DEV_CHECKLIST.md — Developer Onboarding Tracker
Artifact ID: NEW_DEV_CHECKLIST Version: v1.0 Date: July 1, 2025 Target Role: New Engineering Contributor Owner: Ronak (CTO)

🧪 Dev Environment
[ ] ✅ Cloned the repo from GitHub

[ ] ✅ Installed Node.js v22+, Docker Desktop v28+, Git

[ ] ✅ Ran pnpm install successfully

[ ] ✅ Copied .env.example to .env and updated keys

[ ] ✅ Ran docker-compose up -d in /src/portal

[ ] ✅ Accessed:

[ ] Frontend: http://localhost:3000

[ ] Backend Swagger: http://localhost:8080/portal/api-docs

📄 WBS & Task Assignment
[ ] ✅ Was assigned a WBS task (e.g. WBS_1.6.md)

[ ] ✅ Read and understood the WBS task breakdown

[ ] ✅ Checked if pnpm test ffi-verification is required (see RUN_TESTS_IF.md)

[ ] ✅ Identified expected deliverables and file paths from the WBS

📁 Artifact Discipline
[ ] ✅ All modified or created files follow naming conventions (DEBUGGING.md, consent-form.md, etc.)

[ ] ✅ Updated existing files with notes if already present

[ ] ✅ Created required files if missing, per project structure

[ ] ✅ Logged all bugs or edge cases encountered in docs/DEBUGGING.md

🧼 CI & Test Discipline
[ ] ✅ Ran pnpm lint && pnpm format:check

[ ] ✅ Ran pnpm test and/or pnpm test ffi-verification if required

[ ] ✅ Verified CI passed before requesting PR review

[ ] ✅ CI guardrails (CI_SAFEGUARDS.md) triggered as expected (if applicable)

📚 Final Docs + PR
[ ] ✅ Included changes in correct WBS/IP markdown (or created it)

[ ] ✅ Committed docs to docs/ directory using feat: or docs: prefix

[ ] ✅ PR created to main, tagged Ronak

[ ] ✅ Added links to test logs or screenshots if relevant