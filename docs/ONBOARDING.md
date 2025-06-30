🛬 ONBOARDING.md — Contributor Guide
Artifact ID: ONBOARDING Version ID: v1.0 Date: July 1, 2025 Owner: Ronak (CTO)

👋 Welcome
Welcome to the Minkalla Quantum-Safe Privacy Portal. This guide gets you production-ready in record time, whether you’re a full-time engineer, contractor, or compliance contributor. Skim, clone, boot, commit. No fluff.

🚀 Your Role
If you're an Engineer (e.g. Devin):

Clone the repo

Follow DEV_BOOT_UP.md

Read your assigned WBS (e.g. WBS_1.6.md)

Follow test + CI expectations in RUN_TESTS_IF.md and CI_SAFEGUARDS.md

Document insights as you go (see 📁 Artifact Hygiene below)

If you're on Compliance / Qodo Team:

Read COMPLIANCE_REPORT.md and TEST_VALIDATION.md

Map endpoints to GDPR, SOC 2, NIST SP 800-53

Flag WBS tasks lacking traceability

Ensure DAST/SAST results get validated

🧱 Required Docs to Know
Doc	Purpose
DEV_BOOT_UP.md	Step-by-step for local setup (Docker, env, commands)
RUN_TESTS_IF.md	When PQC/FFI tests must be run
CI_SAFEGUARDS.md	What auto-fails if crypto logic isn’t verified
WBS_METADATA_GUIDE.md	Format/template for writing new WBS or IP docs
COMPLIANCE_REPORT.md	System-wide privacy/security coverage
TEST_VALIDATION.md	Snapshot of test + scan status (Trivy/ZAP/Jest)
🧪 Engineering Expectations
Run pnpm test ffi-verification when working on /auth, /consent, or FFI

Don’t commit cryptographic changes without a note in the WBS or DEBUGGING.md

CI will fail if you forget—see CI_SAFEGUARDS.md

📁 Artifact Hygiene
Every assigned WBS task must result in:

Updated or new documentation (WBS, IP, or feature-specific .md files)

Logs or notes added to DEBUGGING.md if an issue was resolved

Validation that all required artifacts exist (tests, files, API logs)

Consistent naming (follow the WBS_1.X.md, IP_1.X.md, DEBUGGING.md pattern)

If the file doesn’t exist—create it. If it does—update it with insights, status, or test logs.