🔐 Security and Infrastructure Validation

1. Quantum-Safe Cryptographic Details

Minkalla currently targets Kyber-768 for key encapsulation and Dilithium-3 for digital signatures—both from the CRYSTALS family and endorsed for standardization by NIST’s post-quantum cryptography competition. These are ideal selections balancing performance, key size, and post-quantum assurances for regulated environments.

While integration hooks have been prototyped (notably via Rust FFI bindings), placeholder algorithms such as ECC and SHA-based signatures remain active in portions of the runtime, pending full rollout of hybrid PQC pathways. These hybrids will enforce backward compatibility while offering forward secrecy against quantum adversaries. Migration planning is tracked under WBS 1.22.

✳️ Recommendation: Add a runtime flag to enforce pure-PQC or hybrid mode, gated by tenant configuration, and enable drift detection across key lifecycles.

2. JWT Implementation and Security

JWT tokens are currently stored in localStorage, which introduces XSS risk—though mitigated partially via CSP headers, aggressive DOM sanitization (via dompurify), and careful route gating.

As part of WBS 1.14, the roadmap includes transitioning tokens to HttpOnly Secure cookies, segmented as:

id_token: short-lived access token (5–10 minutes)

refresh_token: longer-lived, rotated, and stored server-side

csrf_token: accessible via JS, tied to backend origin and verified per request

✳️ Interim XSS mitigation: consider AES-GCM encrypting the JWT client-side using a server-issued ephemeral public key, though this adds browser-side crypto and operational complexity.

3. Refresh Token Logic (WBS 1.12)

The refresh mechanism planned in WBS 1.12 supports:

Silent re-authentication using refresh JWTs

Refresh token reuse detection and invalidation

Revocation hooks tied to explicit logout and device trust rejection

However, enterprise-wide revocation propagation (e.g., admin-initiated user lockout, token revocation after password change) is not yet distributed—this will be addressed via session journaling and Redis-backed token blocklists in WBS 1.17.

✳️ If scalable invalidation is critical for compliance, consider pairing stateless tokens with a selective lookup strategy for high-risk sessions (e.g., when elevated claims are detected).

4. AWS Secrets Manager Integration

Initial integration is live and supports:

Secure storage of IdP metadata, certificates, and signing keys

Scoped access via IAM roles bound to ECS task definitions

Runtime retrieval at boot or on-demand via SDK

However, automatic rotation policies, key aging, and audit trails for secret access are pending implementation. These will be staged in WBS 1.20 alongside third-party integration scaffolds.

✳️ Define a secrets classification matrix (e.g., auth keys, IdP metadata, signing certs) and bind rotation policies accordingly. Consider integrating AWS EventBridge to detect and alert on stale secrets or missed rotations.

5. Compliance & Audit Trails

Audit logging is functional for:

Auth events (login, logout, MFA success/failure)

Token issuance and usage

SSO initiation and callback responses

Still pending are:

Data minimization for logs under GDPR Article 5

Immutable audit trails (e.g., using KMS-signed or append-only logs)

Federated identity traceability in cross-tenant flows

WBS 1.21 will expand on these with DSAR tooling and trace-level log filters to support audit discovery.

✳️ Suggested: Establish log schemas now, so later pipelines (e.g., ELK, CloudTrail, SIEM) can aggregate data consistently across initiatives.

6. Frontend Security and Accessibility

Security-wise, the frontend is hardened with:

CSP and X-Frame-Options headers

Dependency linting via eslint-plugin-security

Isolation of secrets using environment tokens only at build time

Accessibility compliance is tracked against WCAG 2.1 AA, with checks during manual QA, but a formal review process (e.g., axe-core scans in CI) is still pending.

✳️ Suggested: Introduce monthly accessibility snapshot testing and define a docs/ACCESSIBILITY.md checklist to enforce ARIA compliance, contrast ratios, and keyboard nav coverage.

7. CI/CD and Infrastructure

Current CI/CD supports:

Push/PR-based GitHub Actions

Pre-merge linting, unit tests, build validations

Manual staging and deployment via release tags

However, for growing WBS complexity, gaps include:

🔁 No parallel matrix testing (e.g., across Node 18 vs 20)

📦 No artifact signing or cryptographic validation of release builds

🧪 No automated regression triggers tied to core routes

✳️ Suggest sequencing CI/CD hardening under WBS 1.20 alongside integrations, or introduce a WBS_CICD_READINESS.md traceable to platform-level reliability goals.