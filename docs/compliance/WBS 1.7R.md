✅ WBS 1.7R – Classical Authentication Completion
Goal: Deliver a fully functional and validated classical authentication flow (/register & /login) that complements the PQC handshake layer introduced in WBS 1.7. Ensure classical and PQC auth are harmonized, persist reliably, and are easy to trace, test, and extend.

🎯 Deliverables
1. Validation Infrastructure
✅ Ensure ValidationPipe is globally registered in apps/backend/src/main.ts

✅ Confirm or update RegisterDto and LoginDto under libs/auth/dto/ to enforce:

Required fields

Email format

Minimum password entropy (e.g. length, symbol variety)

✅ Unit test malformed payloads to confirm 400-level responses

2. Mongoose User Schema & Model
✅ Create or validate libs/user/models/user.schema.ts containing:

@Prop() fields for email, passwordHash, name

PQC metadata (e.g., handshake IDs) included, if needed by both flows

✅ Ensure schema is bound in apps/backend/src/app.module.ts or libs/user/user.module.ts via MongooseModule.forFeature

3. AuthService Implementation
✅ auth.service.ts must:

Hash passwords with bcrypt

Check for duplicate emails (409 response)

Store new users via injected UserModel

On login, validate password and fetch user

✅ Full trace logging for:

Registration attempt (email, origin IP)

User created

Login success/failure

Handshake triggered (PQC or not)

4. Controller Layer Enhancements
✅ In auth.controller.ts, ensure:

Route guards are applied as needed

DTO validation and exceptions are caught and surfaced cleanly

Swagger tags reference both "Classical Auth" and "Security Logging"

5. Documentation & Housekeeping
✅ Inside PR, include a section: “Architecture & Placement Overview” with:

🗂 File paths for controller, service, DTOs, schema, and modules

🧭 Flow summary (e.g., register → service → model → trace log)

⚠️ Notes on deviation from WBS 1.7 assumptions

6. Testing Checklist (Include in PR description)
[ ] POST /auth/register → 201, user persists

[ ] POST /auth/register (duplicate) → 409

[ ] POST /auth/register (bad body) → 400 (triggered via ValidationPipe)

[ ] POST /auth/login → 200 with JWT

[ ] JWT includes metadata if PQC applies

[ ] Check logs for registration and login trace events

🧪 Instructions for Manual QA
bash
# Start backend locally
SKIP_SECRETS_MANAGER=true npm run start:dev
Endpoints to test:

POST /auth/register

POST /auth/login

Things to verify:

DTO validation triggers for bad inputs

Users persist in local Mongo instance

Logs show registration and handshake trace events

JWT includes PQC handshake metadata when applicable
