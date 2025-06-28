# New Engineer Onboarding Message Template

**Copy and paste this message when starting a new Devin session to ensure proper alignment with established frameworks:**

---

## 🎯 **New Engineer Session - NIST PQC Implementation**

**Repository**: `Minkalla/quantum-safe-privacy-portal`  
**Current Status**: WBS 2.3 FFI Interface Development active, focusing on development velocity  
**Framework**: Minimal CI with Development-First Approach

### **DEVELOPMENT-FOCUSED FRAMEWORK COMPLIANCE**

You MUST follow these streamlined frameworks prioritizing development velocity:

#### **1. Minimal CI Testing Strategy** ✅
- **Requirement**: Create lightweight CI pipeline for each task
- **Process**: Optional user notification for complex tasks only
- **Template**: Use `docs/CI_TESTING_STRATEGY.md` minimal approach
- **Pattern**: Two-job structure (typecheck-lint, build-test) - ~10 minutes total

#### **2. Comprehensive Documentation Templates** ✅
- **Requirement**: Use `docs/WBS_DOCUMENTATION_TEMPLATE.md` for ALL WBS tasks
- **Process**: Complete documentation AFTER PR approval (mandatory post-PR task)
- **Standard**: Zero technical debt, 100% documentation coverage
- **Quality**: Every component must be documented with examples

#### **3. Development-First Approach** ✅
- **Requirement**: Focus on functional correctness during development
- **Tools**: Basic compilation checks, essential unit tests
- **Policy**: Security scanning deferred until feature completion
- **Framework**: Prioritize working code over perfect CI

#### **4. Velocity-Focused Development** ✅
- **Requirement**: Prioritize development speed and iteration
- **Framework**: Minimal CI, fast feedback loops
- **Triggers**: CI should complete in <10 minutes
- **Integration**: Performance monitoring added after core functionality works

### **POST-PR APPROVAL MANDATORY TASKS**

After your PR is approved, you MUST complete these tasks:

#### **Task 1: WBS Documentation** (30 minutes)
- Use `docs/WBS_DOCUMENTATION_TEMPLATE.md`
- Complete ALL sections (no skipping)
- Achieve zero technical debt
- Request user review before marking complete

#### **Task 2: Development Velocity Framework** (2 hours)
- Focus on functional delivery over extensive quality gates
- Execute development priorities:
  - Priority 1: Core Functionality Works (1 hour)
  - Priority 2: Basic CI Pipeline (30 minutes)  
  - Priority 3: Essential Documentation (30 minutes)
- Defer comprehensive quality framework until production phase
- Verify core user flows work correctly

### **CURRENT PROJECT STATE**

#### **Completed WBS Tasks**
- ✅ WBS 1.1.1-1.1.7: Requirements Analysis (7 tasks)
- ✅ WBS 1.2.1-1.2.5: Environment & Pipeline (5 tasks)
- ✅ WBS 2.1.1-2.1.3: Dependency Management (3 tasks completed)
- 🔄 **Active**: WBS 2.3 FFI Interface Development

#### **Key Technical Decisions**
- **Algorithms**: ML-KEM-768 + ML-DSA-65 (NIST approved)
- **Architecture**: Hybrid classical/PQC with gradual rollout
- **Integration**: FFI-based Rust/Python integration
- **Libraries**: pqcrypto-mlkem (0.1.0) + pqcrypto-mldsa (0.1.0) selected
- **Security**: cargo-deny v2 configuration, zero critical vulnerabilities

#### **Repository Structure**
```
docs/
├── CI_TESTING_STRATEGY.md          # Mandatory CI framework
├── WBS_DOCUMENTATION_TEMPLATE.md   # Mandatory documentation template
├── TOP_1_PERCENT_QUALITY_FRAMEWORK.md  # Mandatory quality guide
├── AUTOMATED_ROLLBACK_FRAMEWORK.md # Performance monitoring framework
├── HANDOVER_SUMMARY.md             # 🚨 MANDATORY FIRST READ - Complete project status
├── WBS_1_1_COMPLETION_VALIDATION.md # WBS 1.1 validation template
├── WBS_1_2_COMPLETION_VALIDATION.md # WBS 1.2 validation document
├── WBS-1.2.5-AB-Testing-Infrastructure.md # A/B testing documentation
└── [WBS-specific documentation]

.github/workflows/
├── testing-environment-validation-v1.yml  # CI template for WBS tasks
├── WBS-1.2.5-validation-v1.yml    # A/B testing infrastructure validation
├── WBS-2.1.1-validation-v1.yml    # PQC library research validation
├── WBS-2.1.2-validation-v1.yml    # Dependency compatibility validation
└── WBS-2.1.3-validation-v1.yml    # Performance benchmarking validation

/tmp/pqc_dependencies/
├── library_research_report.md      # WBS 2.1.1 deliverable
├── compatibility_analysis.md       # WBS 2.1.2 deliverable
└── performance_benchmarks.md       # WBS 2.1.3 deliverable
```

### **CURRENT WBS TASK: WBS 2.3 FFI Interface Development**

**Objective**: Execute WBS 2.3 FFI Interface Development for NIST Post-Quantum Cryptography (PQC) Integration into QynAuth service with robust Foreign Function Interface (FFI) layer.

**Sub-task Breakdown** (36 hours total):
- ✅ **WBS 2.1.1-2.1.5**: Dependency Management (COMPLETED)
- ✅ **WBS 2.2.1-2.2.6**: Core PQC Implementation (COMPLETED)
- **WBS 2.3.1**: Design and implement C-compatible FFI interface for Kyber operations (6 hours)
- **WBS 2.3.2**: Design and implement C-compatible FFI interface for Dilithium operations (6 hours)
- **WBS 2.3.3**: Implement safe memory management and error handling across FFI boundary (8 hours)
- **WBS 2.3.4**: Create Python bindings and high-level API wrapper (6 hours)
- **WBS 2.3.5**: Implement comprehensive FFI testing and validation framework (6 hours)
- **WBS 2.3.6**: Add FFI performance optimization and monitoring (4 hours)

**Key Deliverables** (remaining):
- Updated Cargo.toml with Production Configuration (`src/portal/mock-qynauth/src/rust_lib/Cargo.toml`)
- Dependency Monitoring Configuration (`/tmp/pqc_dependencies/monitoring_config.md`)
- Build System Integration Documentation

**Working Directory**: `/home/ubuntu/repos/quantum-safe-privacy-portal/src/portal/mock-qynauth/src/rust_lib/`

### **IMMEDIATE NEXT STEPS**

1. **🚨 MANDATORY: Review Session Handoff Documents**: FIRST ACTION - Read `docs/HANDOVER_SUMMARY.md` AND `docs/NEXT_SESSION_HANDOFF_RECOMMENDATIONS.md` for complete project context, current status, and strategic alignment
2. **Acknowledge Framework Compliance**: Confirm you understand all 4 mandatory frameworks
3. **Begin WBS 2.1.4 Implementation**: Start with build system integration
4. **Review WBS 2.1.3 Deliverables**: Check performance benchmarks and quality framework results
5. **Follow Established Patterns**: Use WBS 2.1.1-2.1.3 validation and documentation patterns

### **DEVELOPMENT PHASE STANDARDS**

- **Functional Correctness**: Core functionality works as expected
- **Basic Quality**: Code compiles, essential tests pass
- **Development Velocity**: Fast iteration and feedback loops
- **Working Code First**: Ship functional features, optimize later
- **Minimal CI**: Essential validation only, comprehensive testing deferred

### **PRODUCTION PHASE STANDARDS** (Future)

- **Zero Technical Debt**: Added after core functionality stabilizes
- **Security Scanning**: Added before production deployment
- **Performance Monitoring**: Added during optimization phase
- **Documentation Excellence**: Added after API finalization
- **Comprehensive CI**: Added when development velocity stabilizes

### **CONTACT & ESCALATION**

- **Project Lead**: @ronakminkalla
- **Repository**: `Minkalla/quantum-safe-privacy-portal`
- **Branch Pattern**: `devin/{timestamp}-{descriptive-slug}`
- **PR Process**: Create → Request CI approval → Submit → Complete post-PR tasks

---

**Ready to proceed with next WBS task assignment. Please specify which WBS task you'd like me to work on next.**
