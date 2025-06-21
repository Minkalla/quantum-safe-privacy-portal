# 🛡️ Minkalla Quantum-Safe Privacy Portal Backend

## Overview
This repository contains the backend services for the Minkalla Quantum-Safe Privacy Portal. Built with a "no regrets" approach, it provides a robust, secure, and compliant foundation for managing user consent and data rights in the digital economy. It is designed to be future-proof with quantum-safe cryptography readiness and adheres to the highest industry standards for security and ethical data practices.

### Key Qualities (Top-Tier Standard)
* **Quantum-Safe Ready:** Architected for seamless integration of Post-Quantum Cryptography (PQC) algorithms.
* **Compliance-by-Design:** Built from the ground up with exhaustive adherence to global privacy and security regulations (GDPR, CCPA, HIPAA, NIST SP 800-53, PCI DSS, ISO 27001, CMMC).
* **Ethical Data Focus:** Enables transparent data practices and lays the groundwork for ethical data monetization.
* **Robust & Testable:** Comprehensive automated test suites ensure unparalleled reliability and minimal regressions.

## 🚀 Key Features Implemented (v0.2.0)

### 1. User Authentication & Identity
* **Secure Registration (`POST /portal/register`):** Allows new users to create accounts with password hashing (bcryptjs) and robust input validation (Joi).
* **Enhanced Login Flow (`POST /portal/login`):**
    * **Dual-Token Strategy:** Issues a short-lived JWT Access Token (response body) and a long-lived Refresh Token (secure HttpOnly, SameSite=Strict cookie) for balanced security and user experience.
    * **Brute-Force Protection:** Implements account lockout after multiple failed login attempts, safeguarding user accounts.

### 2. Enterprise-Grade Security Middleware
* **Cross-Origin Resource Sharing (CORS):** Configurable to restrict access to authorized origins, ensuring secure frontend-backend communication.
* **Security Headers (Helmet):** Configured to set critical HTTP headers (`X-Frame-Options: DENY`, CSP, HSTS, X-Content-Type-Options, etc.) to mitigate common web vulnerabilities like XSS, clickjacking, and content sniffing.
* **HTTP Parameter Pollution (HPP) Protection:** Guards against attacks manipulating query parameters.
* **Multi-Layer Rate Limiting:** Global and endpoint-specific rate limits implemented (`express-rate-limit`) to protect against DoS attacks and brute-force attempts, designed for future distributed environments (Redis-backed).

### 3. Automated & Compliance-Driven API Documentation
* **Interactive Swagger UI (`/api-docs`):** Automatically generated and served, providing a live, browsable interface to explore API endpoints.
* **In-Code Specification:** API endpoints are meticulously documented directly within controller JSDoc comments using `@swagger` tags, ensuring documentation is always in sync with the code.
* **Rich Metadata:** Includes detailed request/response schemas, examples, and custom tags for `compliance` mappings, `threat-model` details, and `pii-data` attributes, enabling future automation of security and compliance reporting.

### 4. Containerization & Local Development Setup
* **Optimized Dockerfile:** Utilizes a multi-stage Docker build to create a lean, production-ready image (`minkalla-portal-backend:latest`) for efficient deployment.
* **Local Development with Docker Compose:** `docker-compose.yml` orchestrates the `portal-backend` service with a local MongoDB instance, providing a consistent and isolated development environment.

### 5. Robust Environment Variable Management
* **`.env.example`:** A highly commented template for all required environment variables, ensuring clear documentation for setup.
* **`envalid` Validation:** Integrates `envalid` for robust startup validation of critical environment variables (`NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENABLE_SWAGGER_DOCS`, `FRONTEND_URL`), preventing runtime errors from misconfigurations.

## 📦 Project Structure

portal-backend/
├── src/
│   ├── config/             # Application configuration (security, swagger)
│   ├── controllers/        # Business logic for API endpoints (e.g., authController.ts)
│   ├── middleware/         # Express middleware (error handling, rate limiting)
│   ├── models/             # Mongoose schemas for MongoDB
│   ├── routes/             # Express route definitions (API endpoints, docs)
│   ├── utils/              # Utility functions (logger, jwtService, appError)
│   ├── types/              # Custom TypeScript type declarations
│   ├── index.ts            # Main Express application entry point
│   └── server.ts           # Server startup logic (app.listen, DB connection)
├── Dockerfile              # Docker build instructions for the backend service
├── docker-compose.yml      # Docker Compose setup for local dev (backend + MongoDB)
├── .env.example            # Template for environment variables
├── .env                    # Local environment variables (NOT committed to Git)
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md               # This file


## ⚙️ Local Development Setup

To get the `portal-backend` running locally using Docker Compose:

1.  **Prerequisites:**
    * [Node.js](https://nodejs.org/) (v18.x recommended, but v20.x also works)
    * [npm](https://www.npmjs.com/) (usually comes with Node.js)
    * [Docker Desktop](https://www.docker.com/products/docker-desktop) (for Docker Engine and Docker Compose)
    * Git

2.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/Minkalla/quantum-safe-privacy-portal.git](https://github.com/Minkalla/quantum-safe-privacy-portal.git)
    cd quantum-safe-privacy-portal/src/portal/portal-backend/
    ```

3.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

4.  **Configure Environment Variables:**
    * Create a `.env` file by copying the `.env.example` template:
        ```bash
        cp .env.example .env  # For Windows PowerShell, you might use 'copy .env.example .env'
        ```
    * **Edit the `.env` file** and populate the variables:
        * `MONGO_URI`: For local development, use `mongodb://mongo:27017/portal_dev`.
        * `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Generate strong, random Base64 strings. (e.g., `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
        * `ENABLE_SWAGGER_DOCS`: Set to `true` to access API docs locally.
        * `FRONTEND_URL`: `http://localhost:3000` (or your frontend's actual local dev URL).

5.  **Start Services with Docker Compose:**
    Ensure Docker Desktop is running. In your terminal (still in `src/portal/portal-backend/`), run:
    ```bash
    docker compose up --build
    ```
    This will:
    * Build the `portal-backend` Docker image.
    * Download the `mongo:5.0` Docker image.
    * Start both the `backend` and `mongo` containers.
    * You will see logs from both services streaming in your terminal.

## ✅ Verification

Once `docker compose up --build` completes and streams logs, open a **new terminal window** (keep Docker Compose running in the first one) and verify:

1.  **Backend is Running:**
    ```bash
    curl http://localhost:8080/
    ```
    Expected output: `Hello from Quantum-Safe Privacy Portal Backend!`

2.  **API Documentation is Accessible:**
    ```bash
    curl http://localhost:8080/api-docs/
    ```
    Expected output: HTML content for Swagger UI (`<title>Swagger UI</title>`).

3.  **Docker Containers are Up:**
    ```bash
    docker ps
    ```
    Expected output: Both `portal-backend-backend-1` and `portal-backend-mongo-1` containers listed with `Up` status.

## 🧪 Testing

To run the automated tests for the `portal-backend`:

1.  Ensure local MongoDB is running (`docker compose up`).
2.  In a **new terminal window** (outside the Docker Compose logs), navigate to the monorepo root: `cd ..\..\..`
3.  Execute Jest tests:
    ```bash
    npm test
    ```
    Expected result: All 20 tests (`auth.test.ts`, `middleware.test.ts`, `docs.test.ts`) should pass.

## 🛠️ Future Enhancements (Post-Phase 1)

* Integration with **MongoDB Atlas** (cloud database) for future deployments.
* Full **CI/CD pipeline** automation for deployments.
* **Frontend development** and integration.
* Advanced **authentication features** (MFA, SSO, Device Trust).
* Implementation of **Data Rights Management** and **Consent Management**.
* **Quantum-Safe Cryptography** implementation (beyond placeholders).

---

Please create this `README.md` file manually and paste this content into it. Save the file once done. Type "done" to confirm.