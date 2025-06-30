---
🧪 Requires PQC integration verification: No  
🔐 Auth/API Contract Touched: No  
📁 Affects File Structure: Yes  
📌 CI Impacting: Yes  
---
## 🔍 Sub-Task Metadata Matrix

| Sub-task       | 🧪 PQC Test | 🔐 API Access | 📁 Structure | 📌 CI Impact |
|----------------|-------------|---------------|----------------|---------------|
| 1.8.1 – Backend Workflow CI        | No  | No  | Yes | Yes |
| 1.8.2 – Frontend Workflow CI       | No  | No  | Yes | Yes |
| 1.8.3 – Monorepo Workflow          | No  | No  | Yes | Yes |
| 1.8.4 – CI/CD Documentation        | No  | No  | Yes | Yes |

Notes:

No /portal/auth or /pqc_service_bridge usage = no ffi-verification trigger

CI/CD-heavy and monorepo-wide updates mean high CI sensitivity

File structure is impacted via .github/workflows/ and docs/, so metadata 📁: Yes is appropriate