# Minkalla Positioning & Messaging Reference

## 🧠 Strategic Positioning

Minkalla is a post-quantum privacy infrastructure platform that combines quantum-safe authentication, verifiable consent, and immutable audit trails into a modular, open-source stack—built to power trust in regulated and privacy-conscious ecosystems.

- Built for: Regulated SaaS, privacy-first platforms, identity and data rights systems
- Edge: Real cryptography, zero-bloat API surface, ready for post-quantum compliance
- Why Now: The quantum clock is ticking; GDPR, HIPAA, and global privacy laws demand verifiable enforcement and auditable consent

---

## 🛡️ Core Modules & White-Label Potential

| Module                | Description                                                    | White-Label Use Case                    |
|-----------------------|----------------------------------------------------------------|-----------------------------------------|
| PQC Auth Gateway      | ML-KEM + ML-DSA handshake with hybrid JWT fallback             | Post-quantum login for IDaaS providers  |
| Consent Capture Kit   | Embedded UI widgets, ZK-validating backend handlers            | Privacy overlays for B2B SaaS           |
| Audit Trail API       | Append-only Merkle-signed ledger of events                     | Compliance anchoring for fintech        |
| Policy Enforcement Proxy | Inline authz + consent enforcement, built as a middleware chain | Data access control in healthcare APIs |

---

## 🔬 Feature Differentiators

| Feature                        | Minkalla        | Legacy Providers         |
|-------------------------------|-----------------|--------------------------|
| Real PQC Ops (ML-KEM/DSA)     | ✅ Production-grade | ❌ Experimental or absent |
| Zero-Knowledge Receipts       | ✅ Native         | ❌ Rare or vendor-specific |
| Modular Deployment            | ✅ Any backend     | ❌ Monolithic             |
| Dual-Backend Support          | ✅ Yes            | ❌ No                     |
| White-Label Readiness         | ✅ Fully branded  | ❌ Locked-in              |
| Rust/TS/Python FFI Crypto     | ✅ Type-safe FFI  | ❌ N/A or WASM-only       |

---

## 🧪 Testing Philosophy

> “Real cryptography only.”

- No mocks for PQC or ZK paths
- FFI layers exercised in every test run
- Local-first runner with CI reactivation planned for WBS 1.22
- All crypto outputs validated with golden vectors

---

## 💸 Monetization Paths

- ✅ Tiered API licensing (key usage, auth volume)
- ✅ White-label modules with branded consent + audit overlays
- ✅ On-prem deployment for compliance-heavy clients

---

## 🏢 Enterprise-Grade Hooks

- SCIM + OAuth integration paths
- Audit trace visibility for compliance teams
- Consent + ZK logs piped to SIEM or analytics overlay
- Full Docker Compose ecosystem for local and air-gapped use

---

## 📈 Ideal Customers + Strategic Investors

| Segment         | Why They Need It                                 |
|-----------------|--------------------------------------------------|
| Privacy-First SaaS | Need verifiable consent + PQC auth fast         |
| Fintech/Gov     | Need immutable, Merkle-anchored audit proof      |
| Dev Platforms   | Need drop-in privacy tooling for onboarding SDKs |
| Post-Quantum Investors | Looking to lead in security, not follow      |

---

## 👨‍💻 Developer Setup Snapshot

```bash
npm run test:local         # Run monorepo + legacy backend tests
./test-local-dev.sh        # Shell script runner across both platforms
nvm use                    # Enforce Node version (via .nvmrc)
python3 --version          # Match .python-version


