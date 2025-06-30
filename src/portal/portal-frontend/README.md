# 🌐 Minkalla Quantum-Safe Privacy Portal Frontend

[![Frontend CI](https://github.com/minkalla/quantum-safe-privacy-portal/actions/workflows/frontend.yml/badge.svg)](https://github.com/minkalla/quantum-safe-privacy-portal/actions/workflows/frontend.yml)


## Overview
This repository contains the user-facing frontend application for the Minkalla Quantum-Safe Privacy Portal. Built with modern web technologies, it provides a secure, intuitive, and accessible interface for individuals to manage their data consent and rights. It is designed to integrate seamlessly with the `portal-backend` service and prioritize user control and transparency.

### Key Qualities (Top-Tier Standard)
* **User-Centric Design:** Focused on a clear, intuitive user experience for managing sensitive privacy controls.
* **Accessible by Design:** Adheres to WCAG 2.1 AA accessibility standards to ensure inclusivity.
* **Modular & Maintainable:** Structured for scalability and ease of development by future contributors.
* **Secure Communication:** Designed to interact securely with the `portal-backend` API.

## 💻 Technologies Used

* **React:** A JavaScript library for building user interfaces.
* **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
* **Vite:** A fast build tool that provides a rapid development experience.
* **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
* **React Router:** For declarative routing in the application.
* **Axios:** A promise-based HTTP client for making API requests.

## 📦 Project Structure

portal-frontend/
├── public/                 # Static assets (e.g., index.html, favicon)
├── src/
│   ├── assets/             # Static assets (images, icons)
│   ├── components/         # Reusable UI components (buttons, forms, navigation)
│   ├── hooks/              # Custom React Hooks
│   ├── pages/              # Top-level components for specific routes/views
│   ├── services/           # API interaction logic (e.g., axios instances, data fetching)
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main application component, defining routes
│   └── main.tsx            # Entry point for React application
├── .eslintrc.json          # ESLint configuration for code quality
├── jest.config.js          # Jest configuration for unit tests
├── jest.a11y.config.js     # Jest-Axe configuration for accessibility tests
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
├── tsconfig.json
├── vite.config.ts          # Vite build configuration
├── package.json
├── package-lock.json
└── README.md               # This file


## ⚙️ Local Development Setup

To get the `portal-frontend` running locally:

1.  **Prerequisites:**
    * [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
    * [npm](https://www.npmjs.com/) (usually comes with Node.js)
    * [Docker Desktop](https://www.docker.com/products/docker-desktop) (if running backend via `docker-compose`)
    * Git

2.  **Clone the Repository (if not already done):**
    ```bash
    git clone [https://github.com/Minkalla/quantum-safe-privacy-portal.git](https://github.com/Minkalla/quantum-safe-privacy-portal.git)
    ```

3.  **Navigate to the Frontend Directory:**
    ```bash
    cd quantum-safe-privacy-portal/src/portal/portal-frontend/
    ```

4.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

5.  **Configure Environment Variables:**
    * For local development, the frontend might not need a dedicated `.env` file, as it will communicate with the backend on `localhost:8080`.
    * If specific environment variables are needed for the frontend, they would be managed via Vite's `import.meta.env` (e.g., `VITE_API_BASE_URL`).

6.  **Start the Development Server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, usually at `http://localhost:3000/`.

## ✅ Verification

Once `npm run dev` is running, open your web browser and navigate to `http://localhost:3000/`. You should see your React application running.

## 🧪 Testing

To run the automated tests for the `portal-frontend`:

1.  **Unit Tests (Jest):**
    ```bash
    npm test
    ```
2.  **Accessibility Tests (Jest-Axe):**
    ```bash
    npm run test:a11y
    ```
    *(Note: E2E tests with Playwright/Cypress will be integrated in a later phase.)*

---

Please create this `README.md` file manually and paste this content into it. Save the file once done. Type "done" to confirm.