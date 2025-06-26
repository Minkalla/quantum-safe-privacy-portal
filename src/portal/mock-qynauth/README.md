# Minkalla QynAuth

Quantum-Safe Authentication Microservice (Python FastAPI / Rust)

## Project Status

[![Under Active Development](https://img.shields.io/badge/status-under%20active%20development-orange)](https://github.com/minkalla/qynauth)

This project is currently under active development as part of the Minkalla MVP.

## Overview

QynAuth is a foundational component of the Minkalla ecosystem, providing a secure authentication layer with **production-ready quantum-safe cryptographic capabilities**. This implementation integrates NIST-approved post-quantum cryptographic algorithms through a high-performance Rust/Python hybrid architecture.

## Features (WBS 1.2.2 Implementation)

* **User Registration API:** `POST /auth/register` for new user sign-up with quantum-safe key generation.
* **User Login API:** `POST /auth/login` for user authentication with PQC-secured JWT tokens.
* **NIST Post-Quantum Cryptography:** Production implementation of Kyber-768 (KEM) and Dilithium-3 (digital signatures).
* **Rust PQC Library:** High-performance cryptographic operations with memory-safe FFI integration.
* **Python FastAPI Layer:** RESTful API service with comprehensive error handling and validation.
* **Hybrid Architecture:** Optimized performance with Rust handling cryptographic operations and Python managing API logic.
* **Health Check:** `GET /health` to verify service operational status and PQC algorithm availability.
* **API Documentation:** Built-in Swagger UI for easy API exploration, automatically redirecting from the root URL.
* **Comprehensive Testing:** Unit tests, integration tests, and PQC algorithm validation coverage.

## Getting Started

### Prerequisites

* **Python 3.10+** and Poetry installed for FastAPI service layer.
* **Rust 1.83.0+** and Cargo installed for PQC cryptographic operations.
* **PQC Dependencies:** Automatically managed via Cargo.toml (pqcrypto-kyber v0.8.1, pqcrypto-dilithium v0.5.0).
* **Development Environment:** Optimized for GitHub Codespaces with pre-configured PQC toolchain. A `.devcontainer` configuration is included for seamless setup.

### Local Development Setup (Using Codespaces)

This project is highly optimized for development within **GitHub Codespaces**. Your Codespace environment, including Python, Poetry, Rust, and all project-specific dependencies, will be **automatically set up for you upon creation**.

**Recommended Codespace Machine Type:**
Due to the multi-language environment and automated build processes, we highly recommend using a **4-core (or higher)** Codespace machine type (e.g., "4-core, 16GB RAM + 32GB Storage") when creating your Codespace to ensure smooth and complete environment provisioning.

1.  **Launch Codespace:**
    Go to your [QynAuth GitHub repository](https://github.com/minkalla/qynauth), click the green `< > Code` button, select the `Codespaces` tab, and launch your Codespace.
    **All Python dependencies and the Rust project will be built automatically** as part of the Codespace creation.

2.  **Verify Setup (Optional):**
    Once the Codespace loads and the terminal is active, you can verify installations:

    ```bash
    python3 --version
    poetry --version
    cargo --version
    ```
    You should see their respective versions.

### Running the QynAuth API Locally

Once your development environment is ready (i.e., Codespace has finished loading), you can start the FastAPI application:

1.  **Navigate to the application directory:**
    ```bash
    cd src/python_app
    ```

2.  **Start the Uvicorn Server:**
    From the `src/python_app` directory, run:
    ```bash
    PYTHONPATH=. poetry run uvicorn app.main:app --reload --port 3001
    ```
    You should see output indicating the server is running on `http://127.0.0.1:3001`.

3.  **Access API Documentation:**
    Open your web browser (via Codespaces Port Forwarding) and navigate to:
    `http://localhost:3001/`

    The API will automatically redirect you to the interactive Swagger UI at `http://localhost:3001/docs`.

### API Endpoints

All API endpoints are documented in the Swagger UI. Here's a quick overview:

#### `POST /auth/register`

Registers a new user with a username and password.

* **Method:** `POST`
* **URL:** `/auth/register`
* **Request Body (JSON):**
    ```json
    {
      "username": "string",
      "password": "string"
    }
    ```
* **Response (JSON):**
    ```json
    {
      "access_token": "string",
      "token_type": "bearer"
    }
    ```

#### `POST /auth/login`

Authenticates a user and returns an access token.

* **Method:** `POST`
* **URL:** `/auth/login`
* **Request Body (JSON):**
    ```json
    {
      "username": "string",
      "password": "string"
    }
    ```
* **Response (JSON):**
    ```json
    {
      "access_token": "string",
      "token_type": "bearer"
    }
    ```

#### `GET /health`

Checks the health of the service.

* **Method:** `GET`
* **URL:** `/health`

### Running Tests

To execute the unit tests for QynAuth:

1.  **Navigate to the application directory:**
    ```bash
    cd src/python_app
    ```

2.  **Run Pytest:**
    From the `src/python_app` directory, run:
    ```bash
    PYTHONPATH=. poetry run pytest
    ```
    All tests should pass, and you will see a summary of the test results.

## Contribution

We welcome contributions! Please see our central [CONTRIBUTING.md](../.github/CONTRIBUTING.md) guidelines to get started.

## License

This project is licensed under the Apache 2.0 License. See the [LICENSE](LICENSE) file for details.

## Security

For information on reporting security vulnerabilities, please refer to our [SECURITY.md](SECURITY.md) policy.

---

Part of the [Minkalla](https://github.com/minkalla) open-source ecosystem.
