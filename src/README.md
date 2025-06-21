# 🛡️ Minkalla Quantum-Safe Privacy Portal

## Overview
This repository contains the core services for the Minkalla Quantum-Safe Privacy Portal. This portal is designed to empower individuals with secure management of their data consent and rights, built upon a foundation of robust security and privacy-by-design principles. It comprises a powerful backend API and an intuitive user-facing frontend application, all engineered with a "no regrets" approach to quality and future-proofed with quantum-safe cryptography readiness.

### Key Qualities (Top-Tier Standard)
* **Comprehensive Privacy Controls:** Enables individuals to manage granular consent and exercise data rights with ease.
* **Quantum-Safe Ready:** Architected for seamless integration of Post-Quantum Cryptography (PQC) algorithms, ensuring future-proof security.
* **Compliance-by-Design:** Built with exhaustive adherence to global privacy and security regulations (GDPR, CCPA, HIPAA, NIST SP 800-53, PCI DSS, ISO 27001, CMMC).
* **Ethical Data Practices:** Lays the groundwork for transparent and ethical data monetization, aligning with evolving industry standards.
* **Modular & Testable:** Designed with a clear separation of concerns, comprehensive automated test suites, and meticulous documentation for reliability and maintainability.

## 📦 Core Components

The Quantum-Safe Privacy Portal is composed of two primary services:

1.  **[Portal Backend](./portal-backend/README.md)**
    * **Description:** The secure and robust API layer managing user authentication, security middleware, data rights initiation, and inter-service communication.
    * **Technologies:** Node.js, Express.js, TypeScript, MongoDB, JWTs, Docker.
    * **Status:** Functionally complete for core authentication, security, and local development setup.

2.  **[Portal Frontend](./portal-frontend/README.md)**
    * **Description:** The user-friendly web interface providing individuals with dashboards to manage their consent, data rights, and profile settings.
    * **Technologies:** React, TypeScript, Vite, Tailwind CSS, React Router.
    * **Status:** Project initialized; core UI features pending implementation.

## ⚙️ Local Development Setup (Monorepo)

To get both the `portal-backend` and `portal-frontend` running locally via Docker Compose (once the frontend is initialized):

1.  **Prerequisites:**
    * [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
    * [npm](https://www.npmjs.com/) (usually comes with Node.js)
    * [Docker Desktop](https://www.docker.com/products/docker-desktop) (for Docker Engine and Docker Compose)
    * Git

2.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/Minkalla/quantum-safe-privacy-portal.git](https://github.com/Minkalla/quantum-safe-privacy-portal.git)
    cd quantum-safe-privacy-portal/src/portal/
    ```

3.  **Install Node.js Dependencies (for both backend and frontend):**
    * Navigate into each project directory and run `npm install`:
        ```bash
        cd portal-backend/
        npm install
        cd ../portal-frontend/
        npm install
        cd .. # Back to src/portal/
        ```
    * Alternatively, if a monorepo-level `package.json` exists in the future with `npm workspace` or `pnpm/yarn workspaces`, you could run a single `npm install` from the `src/portal/` directory.

4.  **Configure Environment Variables for Backend:**
    * Create a `.env` file in `portal-backend/` by copying its `.env.example` template:
        ```bash
        cd portal-backend/
        cp .env.example .env # For Windows PowerShell, use 'copy .env.example .env'
        ```
    * **Edit `portal-backend/.env`** and populate the variables (`MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, etc.).

5.  **Start All Services with Docker Compose:**
    Ensure Docker Desktop is running. In your terminal, from the `src/portal/portal-backend/` directory (where `docker-compose.yml` is located):
    ```bash
    docker compose up --build
    ```
    This will bring up both the `portal-backend` and its `mongo` database. (The frontend would be run separately via `npm run dev` in its own terminal until its own Docker Compose integration is defined).

## 🧪 Testing (Monorepo)

To run the automated tests for all services (after individual `npm install` and `docker compose up`):

1.  **Backend Tests:**
    * Navigate to `src/portal/portal-backend/`
    * Run `npm test`
2.  **Frontend Tests:**
    * Navigate to `src/portal/portal-frontend/`
    * Run `npm test` (and `npm run test:a11y` for accessibility tests).

---

Please create this `README.md` file manually and paste this content into it. Save the file once done. Type "done" to confirm.