# API_REFERENCE.md

## API Reference: Minkalla Quantum-Safe Privacy Portal Backend

This document provides a summary of the main API endpoints, their purpose, and usage. For full, interactive documentation, see the Swagger UI at `/api-docs` when running the backend.

---

## Authentication & User Management

### POST `/portal/auth/register`
- **Purpose:** Register a new user
- **Body:** `{ email, password, ... }`
- **Response:** Success message or error

### POST `/portal/auth/login`
- **Purpose:** Authenticate user and issue tokens
- **Body:** `{ email, password }`
- **Response:** `{ accessToken, refreshToken (cookie) }`

---

## Consent & Data Rights (Planned)

### POST `/portal/consent`
- **Purpose:** Capture or update user consent
- **Body:** `{ userId, consentType, granted }`
- **Response:** Success message

### GET `/portal/consent/:userId`
- **Purpose:** Retrieve user consent status
- **Response:** Consent object

### POST `/portal/dsar`
- **Purpose:** Data Subject Access Request (DSAR)
- **Body:** `{ userId, requestType }`
- **Response:** Status message

---

## API Documentation
- **Swagger UI:** `/api-docs` (enabled if `ENABLE_SWAGGER_DOCS=true`)
- **OpenAPI Spec:** Downloadable from `/api-docs` page

---

## Notes
- All endpoints are prefixed with `/portal/` due to the global prefix in NestJS.
- Authentication required for most endpoints (JWT access token in header).
- For full request/response schemas, see Swagger UI or in-code JSDoc comments.

---

_Last updated: 2025-06-21_
