# Quantum-Safe Privacy Portal

[![Monorepo CI](https://github.com/Minkalla/quantum-safe-privacy-portal/actions/workflows/ci-cd-validation-adjusted-v3.yml/badge.svg)](https://github.com/Minkalla/quantum-safe-privacy-portal/actions/workflows/ci-cd-validation-adjusted-v3.yml)


A comprehensive privacy-focused platform implementing NIST Post-Quantum Cryptography (PQC) standards for quantum-resistant security.

## 🔐 Project Overview

The Quantum-Safe Privacy Portal is an enterprise-grade privacy management platform that integrates cutting-edge post-quantum cryptographic algorithms to ensure long-term security against quantum computing threats. Built with a hybrid architecture combining Node.js, Python, and Rust components for optimal performance and security.

## 🏗️ Architecture

### Core Components

1. **[Portal Backend](./src/portal/portal-backend/README.md)** - Node.js/TypeScript API layer
   - User authentication and authorization
   - Privacy rights management
   - Security middleware and monitoring
   - MongoDB integration

2. **[Portal Frontend](./src/portal/portal-frontend/README.md)** - React/TypeScript UI
   - User dashboard and consent management
   - Privacy rights interface
   - Real-time notifications

3. **[QynAuth Service](./src/portal/mock-qynauth/README.md)** - Quantum-Safe Authentication
   - **Rust PQC Library** - NIST-approved post-quantum algorithms
   - **Python FastAPI** - Authentication service layer
   - **Hybrid Architecture** - Performance-critical cryptographic operations in Rust

## 🛡️ Post-Quantum Cryptography (PQC) Implementation

### WBS 1.2.2: Rust Toolchain Configuration

The project implements NIST-approved post-quantum cryptographic algorithms:

- **Kyber-768** - Key encapsulation mechanism (KEM)
- **Dilithium-3** - Digital signature algorithm
- **Rust Toolchain** - Optimized for PQC operations with native performance

### PQC Dependencies

```toml
# Core NIST PQC Algorithms
pqcrypto-kyber = "0.8.1"
pqcrypto-dilithium = "0.5.0"
pqcrypto-traits = "0.3.4"

# Security and Memory Management
zeroize = "1.7"
subtle = "2.5"
secrecy = "0.8"
```

### Build Configuration

The Rust toolchain is configured for optimal PQC performance:

```toml
[build]
target = "x86_64-unknown-linux-gnu"

[target.x86_64-unknown-linux-gnu]
rustflags = [
  "-C", "target-cpu=native",
  "-C", "target-feature=+aes,+sse2,+sse4.1,+popcnt"
]
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Rust 1.83.0+
- MongoDB 6.0+
- Docker (optional)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Minkalla/quantum-safe-privacy-portal.git
   cd quantum-safe-privacy-portal
   ```

2. **Install dependencies:**
   ```bash
   # Backend dependencies
   cd src/portal/portal-backend && npm install
   
   # QynAuth Python dependencies
   cd ../mock-qynauth && poetry install
   
   # Rust PQC library
   cd src/rust_lib && cargo build --features kyber768,dilithium3
   ```

3. **Start services:**
   ```bash
   # Start MongoDB
   docker compose up -d mongo
   
   # Start backend
   cd src/portal/portal-backend && npm run start:dev
   
   # Start QynAuth service
   cd src/portal/mock-qynauth && poetry run uvicorn app.main:app --port 3001
   ```

## 🧪 Testing

### Comprehensive Test Suite

- **Unit Tests** - Jest (Node.js), Pytest (Python), Cargo test (Rust)
- **Integration Tests** - Cross-service API validation
- **E2E Tests** - Cypress end-to-end user flows
- **Security Tests** - OWASP ZAP DAST, Trivy SAST
- **PQC Validation** - Quantum-safe algorithm compliance testing
- **FFI Verification** - Real TypeScript → Python → Rust integration testing

### PQC FFI Integration Tests

The `ffi-verification.test.ts` suite validates real end-to-end FFI behavior without mocks or placeholders. This is the **source of truth for verifying PQC functionality**.

#### Requirements

- **Python ≥ 3.8** - Required for PQC service bridge
- **pqc_service_bridge.py module** - Must be accessible via PYTHONPATH
- **Rust FFI shared library** - Must be built with `cargo build --release`

#### Running FFI Verification Tests

```bash
# Run the complete FFI verification suite
cd src/portal/portal-backend
PYTHON_PATH=$(which python3) pnpm test ffi-verification

# Or with explicit Jest command
npx jest src/portal/portal-backend/test/integration/pqc/ffi-verification.test.ts --runInBand

# Debug specific test case
npx jest ffi-verification.test.ts --testNamePattern="should handle user ID mismatch with real FFI"
```

### Running Tests

```bash
# Backend tests
cd src/portal/portal-backend && npm test

# QynAuth tests
cd src/portal/mock-qynauth && poetry run pytest

# Rust PQC tests
cd src/portal/mock-qynauth/src/rust_lib && cargo test --features kyber768,dilithium3

# E2E tests
npm run test:e2e
```

## 📋 Compliance & Security

### Standards Compliance

- **NIST SP 800-53 (SA-11)** - Developer security testing and evaluation
- **ISO/IEC 27701 (7.5.2)** - Privacy information management
- **GDPR Article 25** - Data protection by design and by default

### Security Features

- **Post-Quantum Cryptography** - Future-proof against quantum attacks
- **Zero-Trust Architecture** - Comprehensive authentication and authorization
- **Security Monitoring** - Real-time threat detection and response
- **Automated Security Scanning** - Continuous vulnerability assessment

## 🔧 Development Scripts

### Rust PQC Development

```bash
# Build with PQC features
cargo build --features kyber768,dilithium3

# Run development build script
./scripts/dev-build.sh

# Format and lint
cargo fmt --all
cargo clippy -- -D warnings
```

## 📚 Documentation

- [API Reference](./docs/API_REFERENCE.md)
- [Security Guide](./docs/SECURITY.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Compliance Report](./docs/COMPLIANCE_REPORT.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details on:

- Code standards and formatting
- Testing requirements
- Security review process
- Documentation standards

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

For security vulnerabilities, please see our [Security Policy](./docs/SECURITY.md) for responsible disclosure procedures.

## 📓 Project Workflow & Specs
- Feature development follows structured WBS tasks (1.7R, 1.8, etc.)
- Each WBS includes:
  - Technical deliverables
  - Architecture expectations
  - Review and testing instructions
- See WBS documentation in internal docs or ask @Ronak for access

This structure reflects WBS 1.8: Monorepo Refactor with Dev Recovery. For classical auth completion, see WBS 1.7R.
---

**Part of the [Minkalla](https://github.com/minkalla) open-source ecosystem.**
