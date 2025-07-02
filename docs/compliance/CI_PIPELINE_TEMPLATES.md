# Minimal CI Pipeline Templates for WBS Implementation

**Purpose**: Lightweight, velocity-focused CI templates for rapid development  
**Base Template**: `WBS-2.2.3-4-minimal-v1.yml` (Minimal CI approach)  
**Philosophy**: Ship working code fast, optimize CI later

## Template: Minimal CI Pipeline (Recommended)

**File**: `.github/workflows/WBS-X.X.X-minimal-v1.yml`  
**Use Case**: Fast feedback, essential validation, development velocity  
**Jobs**: 2 (Typecheck & Lint → Build & Test)  
**Duration**: ~10 minutes (vs 45+ minutes with full pipeline)

### Key Features
- Fast compilation and type checking
- Basic linting and formatting
- Essential unit tests only
- **No database setup during development**
- **No security scanning during development**
- **No integration tests during development**

### Minimal Template Structure
```yaml
name: "WBS-X.X.X Minimal Pipeline"
on:
  push:
    branches: [ "devin/*wbs*" ]
  pull_request:
    branches: [ "main" ]

env:
  CARGO_TERM_COLOR: always
  RUST_BACKTRACE: 1

jobs:
  typecheck-lint:
    name: "🔍 Typecheck and Lint"
    runs-on: ubuntu-latest
    timeout-minutes: 5
    
    steps:
      - name: "📥 Checkout Repository"
        uses: actions/checkout@v4
        
      - name: "🦀 Setup Rust Environment"
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          components: clippy, rustfmt
          override: true
          
      - name: "🐍 Setup Python Environment"
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: "🔍 Rust Typecheck and Lint"
        working-directory: src/portal/mock-qynauth/src/rust_lib
        run: |
          cargo check --features kyber768,dilithium3
          cargo fmt --check
          cargo clippy --features kyber768,dilithium3 -- -D warnings
          
      - name: "🔍 Python Lint"
        working-directory: src/portal/mock-qynauth/src/python_app
        run: |
          python -m pip install --upgrade pip
          pip install flake8 black isort
          python -m py_compile pqc_ffi.py
          python -m py_compile app/main.py
          flake8 . --max-line-length=88 --ignore=E203,W503
          black --check .
          isort --check-only .

  build-test:
    name: "🏗️ Build and Test"
    runs-on: ubuntu-latest
    needs: typecheck-lint
    timeout-minutes: 5
    
    steps:
      - name: "📥 Checkout Repository"
        uses: actions/checkout@v4
        
      - name: "🦀 Setup Rust Environment"
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true
          
      - name: "🏗️ Build Rust Library"
        working-directory: src/portal/mock-qynauth/src/rust_lib
        run: |
          cargo build --release --features kyber768,dilithium3
          
      - name: "🧪 Run Essential Tests"
        working-directory: src/portal/mock-qynauth/src/rust_lib
        run: |
          cargo test --features kyber768,dilithium3 --verbose
          
      - name: "📦 Package Artifacts"
        run: |
          mkdir -p /tmp/artifacts
          if [ -f "src/portal/mock-qynauth/src/rust_lib/target/release/libqynauth_pqc.so" ]; then
            cp src/portal/mock-qynauth/src/rust_lib/target/release/libqynauth_pqc.so /tmp/artifacts/
          fi
          echo "✅ Build and test completed successfully"
```

## Development Phase Approach (Current)

### WBS 2.x.x (Core PQC Implementation - Development Phase)
**Focus**: Get core functionality working quickly
**Approach**: Minimal CI, maximum velocity

**Current Requirements** (Development Phase):
```yaml
- name: Essential Compilation Check
  run: |
    # Ensure code compiles without errors
    cargo check --features kyber768,dilithium3
    
- name: Basic Unit Tests
  run: |
    # Run only unit tests, no integration tests
    cargo test --lib --features kyber768,dilithium3
    
- name: Core Functionality Smoke Test
  run: |
    # Basic smoke test for key generation and signing
    # No extensive test vectors during development
```

**Deferred Until Production Phase**:
- ❌ Cryptographic test vectors (added after core implementation)
- ❌ FFI boundary testing (added after API stabilization)
- ❌ Performance baseline validation (added after optimization phase)
- ❌ End-to-end workflow testing (added after integration phase)
- ❌ Load testing (added before production deployment)
- ❌ Security scanning (added before production deployment)

## Production Phase Templates (Future)

### When to Graduate to Full CI
- **After MVP completion**: Core PQC functionality working end-to-end
- **Before production deployment**: Security scanning becomes mandatory
- **During stabilization phase**: Add integration and performance tests

### Full Pipeline Structure (Future)
```yaml
# This will be implemented later when core functionality is stable
jobs:
  minimal-validation:     # Keep the fast feedback loop
  integration-testing:    # Add after APIs stabilize
  security-scanning:      # Add before production
  performance-testing:    # Add during optimization phase
```

## Usage Instructions (Minimal CI)

### 1. Copy Minimal Template
```bash
cp .github/workflows/WBS-2.2.3-4-minimal-v1.yml \
   .github/workflows/WBS-X.X.X-minimal-v1.yml
```

### 2. Customize for Your WBS (Minimal Changes)
- Update pipeline name and WBS number
- Modify working directories if needed
- **Keep it simple** - resist adding complexity
- **No database services during development**

### 3. Optional User Notification
- Only for complex WBS tasks
- Focus on functional delivery over CI approval
- Follow streamlined process in `docs/CI_TESTING_STRATEGY.md`

### 4. Test Locally First (Essential)
```bash
# Run these locally before pushing:
cargo check --features kyber768,dilithium3
cargo fmt --check
cargo clippy --features kyber768,dilithium3 -- -D warnings
cargo test --features kyber768,dilithium3
```

### 5. Fast Iteration Cycle
- Push changes frequently
- Get fast CI feedback (~10 minutes)
- Fix issues quickly and iterate
- **Don't let CI block development velocity**

## Minimal Quality Checklist (Development Phase)

Before pushing, ensure your CI pipeline includes:

- [ ] **Essential Compilation Validation**
  - [ ] Rust code compiles (`cargo check`)
  - [ ] Python code compiles (`python -m py_compile`)
  - [ ] Basic formatting (`cargo fmt --check`)
  - [ ] Basic linting (`cargo clippy`)

- [ ] **Core Functionality Testing**
  - [ ] Unit tests pass (`cargo test`)
  - [ ] Core algorithms work (basic smoke tests)
  - [ ] **No integration tests during development**
  - [ ] **No database setup during development**

- [ ] **Deferred Validations** (Added Later)
  - [ ] 🔄 Security scanning (after feature completion)
  - [ ] 🔄 Integration testing (after API stabilization)
  - [ ] 🔄 Performance testing (after optimization phase)
  - [ ] 🔄 Compliance validation (before production)

## Development Velocity Metrics

**Success Criteria**:
- ✅ CI completes in <10 minutes
- ✅ >98% first-time pass rate
- ✅ Developers can iterate quickly
- ✅ Core functionality works

**Anti-Patterns to Avoid**:
- ❌ CI taking >15 minutes
- ❌ Complex database setup during development
- ❌ Extensive security scanning blocking development
- ❌ Integration tests for unstable APIs

---

**Philosophy**: Ship working code fast, optimize CI later. Use these minimal templates to maintain development velocity while ensuring basic quality.
