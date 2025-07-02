### 🧪 PQC Verification Heatmap (WBS 1.1 – 1.6.5)

| WBS Task   | Auth Flow | Consent Flow | FFI Required | PQC Crypto | CI Triggered | Dev Notes Required |
|------------|-----------|--------------|--------------|------------|---------------|---------------------|
| 1.1        | No        | No           | ❌           | ❌         | ❌            | ❌                  |
| 1.2        | Yes       | No           | ✅           | ✅         | ✅            | ✅ (`DEBUGGING.md`) |
| 1.3        | Yes       | Yes          | ✅           | ✅         | ✅            | ✅                  |
| 1.4        | No        | No           | ❌           | ❌         | ❌            | ❌                  |
| 1.5.1      | No        | No           | ❌           | ❌         | ❌            | ❌                  |
| 1.5.2      | Yes       | No           | ✅           | ✅         | ✅            | ✅                  |
| 1.5.3      | Yes       | Yes          | ✅           | ✅         | ✅            | ✅ (`consent-form.md`) |
| 1.6.1      | No        | No           | ❌           | ❌         | ❌            | ❌                  |
| 1.6.2      | ✅ Login   | No           | ✅           | ✅         | ✅            | ✅ (`jwt.ts`)       |
| 1.6.3      | No        | UI only      | ❌           | ❌         | ❌            | ❌                  |
| 1.6.4      | No        | ✅ Consent    | ✅           | ✅         | ✅            | ✅ (`consent-form.md`) |
| 1.6.5      | ✅ Tokens  | No           | ✅           | ✅         | ✅            | ✅ (`DEBUGGING.md`) |

> ✅ Legend:  
> - **FFI Required** = PQC crypto handshake touches Rust FFI boundary  
> - **CI Triggered** = `pnpm test ffi-verification` + `CI_SAFEGUARDS.md` enforcement  
> - **Dev Notes Required** = Auth/consent tests, edge case logs, payload shape, or debugging flows must be captured  
