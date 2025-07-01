# WBS 1.22 – Quantum-Safe Cryptography Integration (Portal Backend)

**Artifact ID:** qsc-1.22-ae43f9c0  
**Version:** 1.0  
**Date:** November 1, 2025  
**Responsible Party:** Ronak (CTO/CIO/CISO)

---

## 🎯 Objective

Integrate CRYSTALS-Kyber via `@open-quantum-safe/liboqs` into the Portal backend, enabling hybrid post-quantum cryptography (PQC) for JWT signing, API token exchange, and long-term credential storage.

---

## 📦 Sub-tasks and Deliverables

### Sub-task 1.22.1 – Kyber Integration in `crypto.service.ts`

- Add `liboqs` Kyber-768 implementation behind feature flag
- Define `CryptoStrategy` interface to support swappable classical/PQC
- Wrap init in try/catch to gracefully fallback if no liboqs support
- Inject public key at service startup (via AWS Secrets Manager)

**Effort:** 6 hours  
**Compliance:** NIST PQC Migration Project, FIPS 140-3 roadmap

---

### Sub-task 1.22.2 – JWT Transition Layer (Hybrid Signing)

- Add fallback-safe JWT encoder that supports both ECDSA + Kyber (sign → concat → Base64url)
- Identify token boundary (header.payload.sig1.sig2)
- Validate both during `verify()` with priority on PQC

**Effort:** 5 hours  
**Compliance:** OWASP A2, NIST SP 800-63B

---

### Sub-task 1.22.3 – PQC Key Vault Integration (Secrets Manager)

- Store public/private Kyber key pair in AWS Secrets Manager
- Add rotation logic stub (non-blocking for this task)
- Inject via `process.env.SECRETS_PQC_KYBER_*`

**Effort:** 4 hours  
**Compliance:** FedRAMP SC-12, NIST CM-6, ISO/IEC 27001

---

### Sub-task 1.22.4 – API Layer Upgrade for Hybrid Tokens

- Validate tokens at boundary (auth middleware, `JwtStrategy`)
- Allow backward-compatible tokens until Q1 2026
- Add optional `/ping/verify-token` API for client-side testing

**Effort:** 6 hours  
**Compliance:** GDPR Art. 32, OWASP Top 10 A7

---

### Sub-task 1.22.5 – Testing, Validation & Documentation

- Unit test `crypto.service.ts` with mocks
- Supertest auth endpoints with hybrid JWTs
- End-to-end test with real Kyber init (docker)
- Create `QUANTUM_SAFE_CRYPTO.md` with:
  - Migration rationale
  - Integration diagram
  - Fallback logic
  - Rotation roadmap

**Effort:** 6 hours  
**Compliance:** NIST RA-5, ISO 27002:2022 Clause 10

---

## ⏱ Execution Plan

| Date         | Task                            |
|--------------|---------------------------------|
| Nov 1        | PQC CryptoService (1.22.1)      |
| Nov 2        | JWT Upgrade (1.22.2), Vault (1.22.3) |
| Nov 3        | API Layer (1.22.4), Testing + Docs (1.22.5) |

---

## ✅ Deliverables

- Hybrid JWT support (ECDSA + Kyber) in auth flow  
- AWS Secrets-backed PQC keys  
- `/ping/verify-token` endpoint for client feedback  
- `QUANTUM_SAFE_CRYPTO.md` in `docs/`  
- 85%+ test coverage on `crypto.service.ts` and auth routes  
- Fall-forward JWT decode strategy  
- Feature flag in `.env` and `config.service.ts`

---

## 🔐 Compliance Map

- **NIST PQC Migration**
- **FedRAMP SC-12**, **CM-6**
- **OWASP Top 10**: A2, A7
- **GDPR Article 32**
- **ISO/IEC 27001**, 27002:2022 (Clause 10)

---

Ready when you are to tee up WBS 2.1 or embed this back into ROADMAP.md. You’re moving quantum-safe from theory to deployable trust. 🧭📘🛡️
