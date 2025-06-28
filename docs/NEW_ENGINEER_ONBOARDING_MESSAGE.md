# New Engineer Onboarding Message Template

**Copy and paste this message when starting a new Devin session to ensure proper alignment with established frameworks:**

---

## 🎯 **New Engineer Session - NIST PQC Implementation**

**Repository**: `Minkalla/quantum-safe-privacy-portal`  
**Current Status**: WBS 2.3.6 FFI Performance Monitoring completed, focusing on development velocity  
**Framework**: Minimal CI with User-Authorized Testing

### **DEVELOPMENT-FOCUSED FRAMEWORK COMPLIANCE**

You MUST follow these streamlined frameworks prioritizing development velocity:

#### **1. User-Authorized Testing Strategy** ✅
- **Requirement**: Complete task implementation before any testing
- **Process**: Inform USER when task is done, USER provides test authorization
- **Policy**: No CI test should be run unless authorized by USER
- **Template**: Use `docs/CI_TESTING_STRATEGY.md` user-authorized approach

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
- ✅ WBS 2.3.1-2.3.6: FFI Interface Development (6 tasks completed)
- 🔄 **Ready for**: Next WBS assignment from USER

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

### **NEXT WBS TASK: WBS 2.4 Security and Performance Optimization**

**Objective**: Execute WBS 2.4 Security and Performance Optimization for NIST Post-Quantum Cryptography (PQC) Integration into QynAuth service. This sub-task focuses on implementing comprehensive security hardening, performance optimizations, vulnerability assessments, and establishing security monitoring for the PQC implementation.

**Sub-task Breakdown** (36 hours total):
- **WBS 2.4.1**: Implement comprehensive security hardening for PQC operations (8 hours)
- **WBS 2.4.2**: Optimize performance across Rust, FFI, and Python layers (6 hours)
- **WBS 2.4.3**: Conduct comprehensive vulnerability assessment and penetration testing (8 hours)
- **WBS 2.4.4**: Implement security monitoring and alerting system (6 hours)
- **WBS 2.4.5**: Add side-channel attack protection and constant-time operations (8 hours)

**Key Deliverables**:
- Security hardening implementation with comprehensive threat mitigation
- Performance optimization across entire PQC stack
- Vulnerability assessment report and penetration testing results
- Security monitoring and alerting system
- Side-channel attack protection and constant-time operation validation

**Working Directory**: `/home/ubuntu/repos/quantum-safe-privacy-portal/src/portal/mock-qynauth/`
**Dependencies**: WBS 2.3.1-2.3.6 (FFI Interface Development) - COMPLETED ✅

### **IMMEDIATE NEXT STEPS**

1. **🚨 MANDATORY: Review Session Handoff Documents**: FIRST ACTION - Read `docs/HANDOVER_SUMMARY.md` for complete project context and current status
2. **Acknowledge Framework Compliance**: Confirm you understand user-authorized testing policy
3. **Begin WBS 2.4 Implementation**: Start with WBS 2.4.1 security hardening for PQC operations
4. **Review WBS 2.3 Completion**: Examine completed FFI interface development and performance monitoring
5. **Follow User-Authorized Testing**: No CI tests without explicit USER authorization

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

### **TECHNICAL ACHIEVEMENTS (WBS 2.3.6)**

**FFI Performance Monitoring Implementation**:
- ✅ Atomic performance counters for Kyber and Dilithium operations
- ✅ Performance optimization hints with `ffi_enable_optimizations()`
- ✅ Comprehensive performance metrics collection via `ffi_get_performance_metrics()`
- ✅ Python integration with high-level API wrappers
- ✅ Memory management fixes preventing double-free corruption

**Testing Results (WBS 2.3.6 Local Validation)**:
```
🔍 Testing WBS 2.3.6 Performance Monitoring...

1. FFI Regression Test: ✅ PASSED
2. Performance Measurement Test: ✅ PASSED
   - Kyber avg: 0.000s ± 0.000s
   - Dilithium avg: 0.000s ± 0.000s
3. Performance Monitoring Module: ✅ PASSED
   - Monitor report: {'kyber_keygen': {'avg_time_ms': 0.037535, 'count': 2}}
4. Memory Usage Test: ✅ PASSED
   - Memory: 16.6MB → 16.6MB (+0.0MB)
5. Performance Optimization Test: ✅ PASSED

🎯 WBS 2.3.6 Local Testing Complete!
✅ ALL WBS 2.3.6 TESTS PASSED
```

**Current Branch**: `devin/1751123190-wbs-2-3-6-ffi-monitoring`
**Implementation Status**: WBS 2.3 FFI Interface Development - 100% COMPLETE ✅

---

**WBS 2.3 FFI Interface Development is COMPLETE. Ready to begin WBS 2.4 Security and Performance Optimization.**
