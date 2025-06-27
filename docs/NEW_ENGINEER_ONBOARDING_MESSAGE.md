# New Engineer Onboarding Message Template

**Copy and paste this message when starting a new Devin session to ensure proper alignment with established frameworks:**

---

## 🎯 **New Engineer Session - NIST PQC Implementation**

**Repository**: `Minkalla/quantum-safe-privacy-portal`  
**Current Status**: WBS 2.1.3 completed, ready for WBS 2.1.4 Dependency Integration  
**Framework**: Top 1% Quality with Zero Technical Debt

### **MANDATORY FRAMEWORK COMPLIANCE**

You MUST follow these established frameworks for all WBS implementations:

#### **1. Mandatory CI Testing Strategy** ✅
- **Requirement**: Create WBS-specific CI pipeline for each task
- **Process**: Request user approval BEFORE PR submission
- **Template**: Use `docs/CI_TESTING_STRATEGY.md` as foundation
- **Pattern**: Three-job structure (environment-setup, integration-test, security-environment)

#### **2. Comprehensive Documentation Templates** ✅
- **Requirement**: Use `docs/WBS_DOCUMENTATION_TEMPLATE.md` for ALL WBS tasks
- **Process**: Complete documentation AFTER PR approval (mandatory post-PR task)
- **Standard**: Zero technical debt, 100% documentation coverage
- **Quality**: Every component must be documented with examples

#### **3. Security-First Approach** ✅
- **Requirement**: Automated vulnerability scanning in ALL pipelines
- **Tools**: Trivy, Grype, NPM audit integrated
- **Policy**: Block deployment for ANY critical vulnerabilities
- **Framework**: Follow security patterns in existing CI workflows

#### **4. Performance Monitoring with Automated Rollbacks** ✅
- **Requirement**: Implement real-time performance regression detection
- **Framework**: Use `docs/AUTOMATED_ROLLBACK_FRAMEWORK.md`
- **Triggers**: Error rate >5%, latency increase >30%, memory >50MB increase
- **Integration**: Automated rollback capabilities required

### **POST-PR APPROVAL MANDATORY TASKS**

After your PR is approved, you MUST complete these tasks:

#### **Task 1: WBS Documentation** (30 minutes)
- Use `docs/WBS_DOCUMENTATION_TEMPLATE.md`
- Complete ALL sections (no skipping)
- Achieve zero technical debt
- Request user review before marking complete

#### **Task 2: Top 1% Quality Framework** (6.5 hours)
- Follow `docs/TOP_1_PERCENT_QUALITY_FRAMEWORK.md`
- Execute all 3 priorities:
  - Priority 1: Zero Technical Debt (30 minutes)
  - Priority 2: Automated Quality Gates (2 hours)  
  - Priority 3: Real-Time Monitoring (4 hours)
- Complete step-by-step implementation guides
- Verify all success criteria met

### **CURRENT PROJECT STATE**

#### **Completed WBS Tasks**
- ✅ WBS 1.1.1-1.1.7: Requirements Analysis (7 tasks)
- ✅ WBS 1.2.1-1.2.5: Environment & Pipeline (5 tasks)
- ✅ WBS 2.1.1-2.1.3: Dependency Management (3 tasks completed)
- 🔄 **Ready for**: WBS 2.1.4 Integrate Dependencies into Build System

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

### **NEXT WBS TASK: WBS 2.1.4 Integrate Dependencies into Build System**

**Objective**: Integrate selected PQC dependencies into Rust library build system with production-ready configuration.

**Sub-task Breakdown** (remaining 12 hours total):
- ✅ **WBS 2.1.1**: Research and evaluate available NIST PQC libraries for Rust ecosystem (COMPLETED)
- ✅ **WBS 2.1.2**: Analyze dependency compatibility and security implications (COMPLETED)
- ✅ **WBS 2.1.3**: Select optimal PQC library combinations with performance benchmarking (COMPLETED)
- **WBS 2.1.4**: Integrate selected dependencies into Rust library build system (4 hours)
- **WBS 2.1.5**: Set up dependency monitoring and automated security scanning (4 hours)

**Key Deliverables** (remaining):
- Updated Cargo.toml with Production Configuration (`src/portal/mock-qynauth/src/rust_lib/Cargo.toml`)
- Dependency Monitoring Configuration (`/tmp/pqc_dependencies/monitoring_config.md`)
- Build System Integration Documentation

**Working Directory**: `/home/ubuntu/repos/quantum-safe-privacy-portal/src/portal/mock-qynauth/src/rust_lib/`

### **IMMEDIATE NEXT STEPS**

1. **🚨 MANDATORY: Locate and Review Handover Summary**: FIRST ACTION - Read `docs/HANDOVER_SUMMARY.md` for complete project context and current status
2. **Acknowledge Framework Compliance**: Confirm you understand all 4 mandatory frameworks
3. **Begin WBS 2.1.4 Implementation**: Start with build system integration
4. **Review WBS 2.1.3 Deliverables**: Check performance benchmarks and quality framework results
5. **Follow Established Patterns**: Use WBS 2.1.1-2.1.3 validation and documentation patterns

### **QUALITY STANDARDS**

- **Zero Technical Debt**: No TODO/FIXME/HACK comments allowed
- **Security First**: All vulnerabilities addressed before deployment
- **Performance Monitoring**: Real-time regression detection required
- **Documentation Excellence**: 100% coverage with working examples
- **CI/CD Excellence**: All pipelines must pass with user approval

### **CONTACT & ESCALATION**

- **Project Lead**: @ronakminkalla
- **Repository**: `Minkalla/quantum-safe-privacy-portal`
- **Branch Pattern**: `devin/{timestamp}-{descriptive-slug}`
- **PR Process**: Create → Request CI approval → Submit → Complete post-PR tasks

---

**Ready to proceed with next WBS task assignment. Please specify which WBS task you'd like me to work on next.**
