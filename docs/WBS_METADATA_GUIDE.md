# WBS_METADATA_GUIDE.md

This guide defines metadata tags to be embedded in each WBS file to improve developer clarity, track test coverage obligations, and reduce onboarding ambiguity.

## ✅ Required Metadata Per WBS File

Each WBS file must declare the following:

- **🧪 Requires PQC integration verification: Yes/No**  
  Indicates whether `pnpm test ffi-verification` must pass before merging changes to this WBS.
  - Yes → Developer must validate cryptographic contract interactions across TS → Python → Rust
  - No → Safe to skip FFI verification if task does not interact with PQC or crypto endpoints

- **🔐 Auth/API Contract Touched: Yes/No**  
  Signals whether this task interacts with `/portal/auth` or `/portal/consent` APIs and may require JWT logic, error handling, or cryptographic payloads.

- **📁 Affects File Structure: Yes/No**  
  If Yes → Path changes must be justified and peer-reviewed. New folders or filename conventions must align with established structure under `src/portal/`.

- **📌 CI Impacting: Yes/No**  
  If Yes → Developer must review `.github/workflows/*.yml`, Dockerfiles, or `SKIP_SECRETS_MANAGER` implications.

## 🔍 Usage

Place the following metadata block at the **top of each** `docs/WBS_*.md` file:

```md
---
🧪 Requires PQC integration verification: Yes  
🔐 Auth/API Contract Touched: Yes  
📁 Affects File Structure: No  
📌 CI Impacting: No  
---
```

Update these tags as the task scope evolves.  
Keep the `🧪 Requires PQC integration verification` tag consistent with `docs/RUN_TESTS_IF.md`.
