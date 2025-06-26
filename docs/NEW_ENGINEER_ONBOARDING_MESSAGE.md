# New Engineer Onboarding Message Template

**Copy and paste this message when starting a new Devin session to ensure proper alignment with established frameworks:**

---

## 🎯 **New Engineer Session - NIST PQC Implementation**

**Repository**: `Minkalla/quantum-safe-privacy-portal`  
**Current Status**: WBS 1.2.4 completed, ready for next WBS task  
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
- ✅ WBS 1.2.1-1.2.4: Environment & Pipeline (4 tasks)
- 🔄 **Ready for**: WBS 1.2.5 or next assigned task

#### **Key Technical Decisions**
- **Algorithms**: ML-KEM-768 + ML-DSA-65 (NIST approved)
- **Architecture**: Hybrid classical/PQC with gradual rollout
- **Integration**: FFI-based Rust/Python integration
- **Library**: liboqs for comprehensive PQC support

#### **Repository Structure**
```
docs/
├── CI_TESTING_STRATEGY.md          # Mandatory CI framework
├── WBS_DOCUMENTATION_TEMPLATE.md   # Mandatory documentation template
├── TOP_1_PERCENT_QUALITY_FRAMEWORK.md  # Mandatory quality guide
├── AUTOMATED_ROLLBACK_FRAMEWORK.md # Performance monitoring framework
├── HANDOVER_SUMMARY.md             # Complete project status
└── [WBS-specific documentation]

.github/workflows/
└── testing-environment-validation-v1.yml  # CI template for WBS tasks
```

### **IMMEDIATE NEXT STEPS**

1. **Acknowledge Framework Compliance**: Confirm you understand all 4 mandatory frameworks
2. **Request Next WBS Assignment**: Ask user which WBS task to work on next
3. **Review Current State**: Examine existing documentation and CI patterns
4. **Plan Implementation**: Create WBS-specific plan following established patterns

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
