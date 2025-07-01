# Minkalla Quantum-Safe Privacy Portal

[![Monorepo CI](https://github.com/Minkalla/quantum-safe-privacy-portal/actions/workflows/ci-cd-validation-adjusted-v3.yml/badge.svg)](https://github.com/Minkalla/quantum-safe-privacy-portal/actions/workflows/ci-cd-validation-adjusted-v3.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Code Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)](https://github.com/Minkalla/quantum-safe-privacy-portal)

> **Quantum-safe privacy OS for secure auth and data rights**

## 🧠 Minkalla Overview

Minkalla is a **post-quantum privacy infrastructure platform** that combines quantum-safe authentication, verifiable consent, and immutable audit trails into a modular, open-source stack—built to power trust in regulated and privacy-conscious ecosystems.

**Built for**: Regulated SaaS, privacy-first platforms, identity and data rights systems  
**Edge**: Real cryptography, zero-bloat API surface, ready for post-quantum compliance  
**Why Now**: The quantum clock is ticking; GDPR, HIPAA, and global privacy laws demand verifiable enforcement and auditable consent

### 🛡️ Core Modules

| Module | Description | White-Label Use Case |
|--------|-------------|---------------------|
| **PQC Auth Gateway** | ML-KEM + ML-DSA handshake with hybrid JWT fallback | Post-quantum login for IDaaS providers |
| **Consent Capture Kit** | Embedded UI widgets, ZK-validating backend handlers | Privacy overlays for B2B SaaS |
| **Audit Trail API** | Append-only Merkle-signed ledger of events | Compliance anchoring for fintech |
| **Policy Enforcement Proxy** | Inline authz + consent enforcement, built as a middleware chain | Data access control in healthcare APIs |

## 🏗️ Monorepo Layout

This NX-based monorepo follows a structured approach with clear separation of concerns:

```
quantum-safe-privacy-portal/
├── apps/                           # Application entry points
│   └── backend/                    # Main NestJS backend application
│       ├── src/                    # Application source code
│       ├── test/                   # Application-specific tests
│       └── docs/                   # Backend documentation
├── libs/                           # Shared libraries and modules
│   ├── auth/                       # Authentication library
│   │   └── src/auth/              # Auth services, guards, interfaces
│   ├── pqc/                       # Post-Quantum Cryptography library
│   │   └── src/pqc/              # PQC services, monitoring, A/B testing
│   ├── common/                    # Shared models and utilities
│   │   └── src/models/           # User, Consent models
│   ├── logger/                    # Centralized logging library
│   └── user/                      # User management library
├── src/portal/                    # Legacy structure (transitioning)
│   ├── portal-backend/           # Legacy NestJS backend
│   ├── mock-qynauth/            # QynAuth service (Python + Rust)
│   └── mock-zynconsent/         # ZynConsent service
├── docs/                          # Project documentation
├── scripts/                       # Build and development scripts
└── monitoring/                    # Observability configuration
```

### Purpose Tags per Folder

- **`apps/backend`** - Main application server with PQC integration
- **`libs/auth`** - Reusable authentication components and services
- **`libs/pqc`** - Post-quantum cryptography implementations and monitoring
- **`libs/common`** - Shared data models and utilities across applications
- **`src/portal/mock-qynauth`** - Quantum-safe authentication service (Python + Rust FFI)

## 🚀 Local Setup

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **Python 3.10+** - For QynAuth service
- **Rust 1.83.0+** - For PQC cryptographic operations
- **MongoDB 6.0+** - Database
- **Docker** - For containerized services (optional)

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/Minkalla/quantum-safe-privacy-portal.git
   cd quantum-safe-privacy-portal
   npm install
   ```

2. **Start MongoDB:**
   ```bash
   docker-compose up -d
   ```

3. **Start the backend (choose one):**
   ```bash
   # New NX-based backend
   nx serve backend
   
   # Or legacy backend
   npm run start:dev-legacy
   
   # Manual secrets override for local development
   SKIP_SECRETS_MANAGER=true nx serve backend
   ```

4. **Verify setup:**
   ```bash
   # Check backend health (port 8080)
   curl http://localhost:8080/health
   
   # Check API documentation
   open http://localhost:8080/api-docs
   ```

### Port Assumptions

- **3000** - Frontend (when available)
- **8080** - Backend API server
- **3001** - QynAuth service
- **27017** - MongoDB

## 📡 API Usage

### Authentication Endpoints

```bash
# Register a new user
curl -X POST http://localhost:8080/portal/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "pqcEnabled": true
  }'

# Login with PQC authentication
curl -X POST http://localhost:8080/portal/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Consent Management

```bash
# Capture user consent
curl -X POST http://localhost:8080/portal/consent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "consentData": {
      "marketing": true,
      "analytics": false,
      "dataProcessing": true
    }
  }'
```

### API Documentation

- **Swagger UI**: http://localhost:8080/api-docs
- **OpenAPI Spec**: http://localhost:8080/api-docs-json
- **Static Assets**: Available at `/static/` endpoint

## 🔧 CI, Scripts, and Coverage

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev-new` | Run new NX backend locally |
| `npm run start:dev-legacy` | Run legacy backend locally |
| `nx test backend` | Unit tests for new backend |
| `npm run test:backend-legacy` | Unit tests for legacy backend |
| `nx lint backend` | Lint rules for new backend |
| `npm run lint:backend-legacy` | Lint rules for legacy backend |
| `npm run build:backend-new` | Build new backend |
| `npm run build:backend-legacy` | Build legacy backend |

### Testing Philosophy

> **"Real cryptography only."**

- No mocks for PQC or ZK paths
- FFI layers exercised in every test run
- Local-first runner with CI reactivation planned for WBS 1.22
- All crypto outputs validated with golden vectors

### Test Coverage

```bash
# Run comprehensive test suite
npm test

# Run PQC FFI verification tests
cd apps/backend
PYTHON_PATH=$(which python3) npm test ffi-verification

# Run security tests
npm run test:security
```

## 🤝 Contributing

We welcome contributions to the Minkalla ecosystem! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details on:

### Development Workflow

- **WBS-driven project structure** - Feature development follows structured Work Breakdown Structure tasks
- **PR template usage** - Use provided templates for consistent pull requests
- **Commit hygiene** - Follow conventional commit standards
- **Code standards** - TypeScript, Python, and Rust formatting requirements
- **Testing requirements** - Comprehensive test coverage for all changes
- **Security review process** - All cryptographic changes require security review

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Follow the development setup instructions above
4. Make your changes with appropriate tests
5. Submit a pull request with detailed description

## 💸 Monetization & Enterprise Features

### Revenue Streams

- ✅ **Tiered API licensing** - Key usage and authentication volume-based pricing
- ✅ **White-label modules** - Branded consent and audit overlays
- ✅ **On-premises deployment** - For compliance-heavy clients

### Enterprise-Grade Features

- **SCIM + OAuth integration** paths
- **Audit trace visibility** for compliance teams
- **Consent + ZK logs** piped to SIEM or analytics overlay
- **Full Docker Compose ecosystem** for local and air-gapped use

## 📈 Target Market

| Segment | Why They Need Minkalla |
|---------|----------------------|
| **Privacy-First SaaS** | Need verifiable consent + PQC auth fast |
| **Fintech/Government** | Need immutable, Merkle-anchored audit proof |
| **Developer Platforms** | Need drop-in privacy tooling for onboarding SDKs |
| **Post-Quantum Investors** | Looking to lead in security, not follow |

## 📋 Compliance & Standards

### Regulatory Compliance

- **NIST SP 800-53 (SA-11)** - Developer security testing and evaluation
- **ISO/IEC 27701 (7.5.2)** - Privacy information management
- **GDPR Article 25** - Data protection by design and by default
- **ISO 27001 A.14.2.1** - Development standards
- **NIST SP 800-53 CM-2** - Configuration management

### Security Features

- **Post-Quantum Cryptography** - ML-KEM-768 and ML-DSA-65 algorithms
- **Zero-Trust Architecture** - Comprehensive authentication and authorization
- **Real-time Security Monitoring** - Threat detection and automated response
- **Continuous Security Scanning** - Automated vulnerability assessment

## 📚 Documentation

- [API Reference](./docs/API_REFERENCE.md)
- [Security Guide](./docs/SECURITY.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Compliance Report](./docs/COMPLIANCE_REPORT.md)
- [PQC Integration Guide](./docs/PQC_README.md)

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

For security vulnerabilities, please see our [Security Policy](./docs/SECURITY.md) for responsible disclosure procedures.

---

**Part of the [Minkalla](https://github.com/minkalla) open-source ecosystem.**

*Building the future of quantum-safe privacy infrastructure.*
