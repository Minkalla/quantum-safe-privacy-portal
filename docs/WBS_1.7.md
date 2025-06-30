---
🧪 Requires PQC integration verification: No  
🔐 Auth/API Contract Touched: Yes  
📁 Affects File Structure: Yes  
📌 CI Impacting: Yes  
---
Why This Metadata:
🧪 No — 1.7 works on container orchestration and doc updates. It doesn't touch crypto bridges or /pqc_service_bridge.py.

🔐 Yes — You’re explicitly testing /portal/login and /portal/auth/register endpoints.

📁 Yes — You’re modifying structure under src/portal/, including new Dockerfiles and service configs.

📌 Yes — This touches Docker networking, Vite config, docker-compose.yml, and CI-facing behaviors that reflect local vs prod parity.


## 🔍 Sub-Task Metadata Matrix

| Sub-task       | 🧪 PQC Test | 🔐 API Access | 📁 Structure | 📌 CI Impact |
|----------------|-------------|---------------|----------------|---------------|
| 1.7.1 – Docker Compose Setup         | No  | Yes  | Yes | Yes |
| 1.7.2 – Frontend Dev Server          | No  | Yes  | Yes | Yes |
| 1.7.3 – Endpoint Testing             | No  | Yes  | No  | Yes |
| 1.7.4 – Documentation Updates        | No  | No   | Yes | Yes |


---

## 🔗 Linked Validation Artifacts

- 🔍 See [TEST_VALIDATION.md](../TEST_VALIDATION.md#10-wbs-17-docker-compose-runtime--endpoint-validation) for endpoint testing results and Docker Compose checks
- 🔐 See [COMPLIANCE_REPORT.md](../COMPLIANCE_REPORT.md#7-local-development-parity--runtime-validation-wbs-17) for GDPR/NIST/OWASP compliance trace
- 🛡️ See [SECURITY.md](../SECURITY.md#8-dockerfile-hardening-wbs-17) for removal of debug commands (`|| sleep infinity`, trace flags)
