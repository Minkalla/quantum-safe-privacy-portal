# 🔒 PR Security Checklist

✅ All PRs must pass this checklist prior to merge. This ensures compliance with Minkalla's enterprise-grade cryptographic, identity, and SSO hardening standards.

## 1. 🔐 Cryptographic Resilience

- [ ] Crypto fallback logic uses HybridCryptoService, not error throws
- [ ] Fallback usage emits telemetry (CRYPTO_FALLBACK_USED, fallbackReason)

## 2. 🆔 Consistent Identity Generation

- [ ] Standardized user ID via generateStandardizedCryptoUserId()
- [ ] No use of Date.now() or dynamic timestamps in signing flows

## 3. 💥 Fault Tolerance & Recovery

- [ ] CircuitBreakerService integrated for PQC & external services
- [ ] Fallback thresholds logged and observable

## 4. 📦 SAML & XML Hardening

- [ ] Content-Type of SAML responses enforced (e.g. text/xml)
- [ ] SAML payload limits, timeout controls, and XML entity restriction applied

## 5. 📋 Checklist Enforcement

- [ ] This checklist is verified in CI preflight
- [ ] CI fails if any checkbox is unmarked at PR open/merge

## 6. 📈 Monitoring & Alerting

- [ ] Telemetry events emitted for fallback, circuit breaker, and XML anomalies
- [ ] Alerts registered for outlier payloads or retry cascades

## 7. 📘 Documentation

- [ ] SECURITY.md updated if mitigations or configs change
- [ ] SAML_RISK_REGISTER.md updated if new XML/SAML issues found

## 8. 🧪 Future-Safe Upgrades

- [ ] Compatibility with passport-saml@4.x or alt libs assessed
- [ ] PR includes TODO or tag for WBS 1.23 if incompatible but planned

## 🚨 **Security Risk Patterns to Avoid**

### ❌ **Anti-Patterns**
```typescript
// DON'T: Remove fallback without replacement
throw new Error('PQC service unavailable and no fallback configured');

// DON'T: Access private methods via bracket notation  
this.authService['callPythonPQCService'](operation, params);

// DON'T: Use timestamps in crypto user IDs
const userId = `user_${Date.now()}`;
```

### ✅ **Secure Patterns**
```typescript
// DO: Use hybrid crypto service for fallback
return await this.hybridCryptoService.encryptWithFallback(data, publicKey);

// DO: Use public wrapper methods
return await this.authService.callPQCService(operation, params);

// DO: Use standardized crypto user IDs
const cryptoUserId = this.generateStandardizedCryptoUserId(baseUserId, 'ML-DSA-65', 'signing');
```

## 📋 **PR Submission Checklist**

### **Before Creating PR**
- [ ] All security checks above completed
- [ ] Local testing performed with security scenarios
- [ ] No security anti-patterns introduced
- [ ] Error handling and fallback logic verified

### **PR Description Requirements**
- [ ] Security impact assessment included
- [ ] Any security-related changes documented
- [ ] Fallback behavior documented (if applicable)
- [ ] Breaking changes clearly marked

### **Code Review Focus Areas**
- [ ] Reviewer must verify security checklist completion
- [ ] Security-sensitive files require extra scrutiny
- [ ] Any crypto-related changes need security team review

## 🔧 **Tools & Commands**

### **Security Scanning Commands**
```bash
# Check for hardcoded secrets
grep -r "password\|secret\|key\|token" src/ --exclude-dir=node_modules

# Check for private method access patterns
grep -r "\[.*\](" src/ --include="*.ts"

# Check for timestamp-based IDs in crypto operations
grep -r "Date\.now()\|timestamp.*user" src/ --include="*.ts"
```

### **Testing Security Scenarios**
```bash
# Test fallback behavior
npm test -- --testNamePattern="fallback"

# Test error handling
npm test -- --testNamePattern="error"

# Test authentication flows
npm test -- --testNamePattern="auth"
```

## 📚 **Reference Documentation**

- [Security Architecture](./SECURITY.md)
- [Hybrid Crypto Service](../src/portal/portal-backend/src/services/hybrid-crypto.service.ts)
- [PQC Data Validation](../src/portal/portal-backend/src/services/pqc-data-validation.service.ts)
- [Error Handling Patterns](../src/portal/portal-backend/src/errors/)

## 🎯 **Enforcement**

**This checklist is MANDATORY for all PRs touching:**
- Authentication/authorization code
- Cryptographic operations
- External service integrations
- User data handling
- Security-sensitive configurations

**Non-compliance will result in:**
- PR rejection until security issues are resolved
- Required security team review
- Additional testing requirements

🧠 Tip: Use npm run validate-pr-security to auto-verify checklist state.

### 🔍 **Additional Security Checks**

#### **4. Error Handling & Circuit Breakers**
- [ ] **Proper error boundaries implemented**
  - Check: Are external service calls wrapped in try/catch?
  - Check: Is `CircuitBreakerService` used for PQC operations?
  - **Files to review**: Services calling external APIs or PQC operations

#### **5. Secrets & Configuration**
- [ ] **No hardcoded secrets or credentials**
  - Check: Are API keys, passwords, or tokens hardcoded?
  - Check: Are secrets properly retrieved from AWS Secrets Manager?
  - **Files to review**: `*.ts`, `*.js`, `*.json`, `.env` files

#### **6. Input Validation & Sanitization**
- [ ] **Proper input validation implemented**
  - Check: Are user inputs validated and sanitized?
  - Check: Are SQL injection and XSS protections in place?
  - **Files to review**: Controllers, DTOs, validation pipes

#### **7. Authentication & Authorization**
- [ ] **Proper authentication checks**
  - Check: Are protected routes properly secured?
  - Check: Are JWT tokens validated correctly?
  - **Files to review**: Guards, middleware, protected routes

## 🚨 **Security Risk Patterns to Avoid**

### ❌ **Anti-Patterns**
```typescript
// DON'T: Remove fallback without replacement
throw new Error('PQC service unavailable and no fallback configured');

// DON'T: Access private methods via bracket notation  
this.authService['callPythonPQCService'](operation, params);

// DON'T: Use timestamps in crypto user IDs
const userId = `user_${Date.now()}`;
```

### ✅ **Secure Patterns**
```typescript
// DO: Use hybrid crypto service for fallback
return await this.hybridCryptoService.encryptWithFallback(data, publicKey);

// DO: Use public wrapper methods
return await this.authService.callPQCService(operation, params);

// DO: Use standardized crypto user IDs
const cryptoUserId = this.generateStandardizedCryptoUserId(baseUserId, 'ML-DSA-65', 'signing');
```

## 📋 **PR Submission Checklist**

### **Before Creating PR**
- [ ] All security checks above completed
- [ ] Local testing performed with security scenarios
- [ ] No security anti-patterns introduced
- [ ] Error handling and fallback logic verified

### **PR Description Requirements**
- [ ] Security impact assessment included
- [ ] Any security-related changes documented
- [ ] Fallback behavior documented (if applicable)
- [ ] Breaking changes clearly marked

### **Code Review Focus Areas**
- [ ] Reviewer must verify security checklist completion
- [ ] Security-sensitive files require extra scrutiny
- [ ] Any crypto-related changes need security team review

## 🔧 **Tools & Commands**

### **Security Scanning Commands**
```bash
# Check for hardcoded secrets
grep -r "password\|secret\|key\|token" src/ --exclude-dir=node_modules

# Check for private method access patterns
grep -r "\[.*\](" src/ --include="*.ts"

# Check for timestamp-based IDs in crypto operations
grep -r "Date\.now()\|timestamp.*user" src/ --include="*.ts"
```

### **Testing Security Scenarios**
```bash
# Test fallback behavior
npm test -- --testNamePattern="fallback"

# Test error handling
npm test -- --testNamePattern="error"

# Test authentication flows
npm test -- --testNamePattern="auth"
```

## 📚 **Reference Documentation**

- [Security Architecture](./SECURITY.md)
- [Hybrid Crypto Service](../src/portal/portal-backend/src/services/hybrid-crypto.service.ts)
- [PQC Data Validation](../src/portal/portal-backend/src/services/pqc-data-validation.service.ts)
- [Error Handling Patterns](../src/portal/portal-backend/src/errors/)

## 🎯 **Enforcement**

**This checklist is MANDATORY for all PRs touching:**
- Authentication/authorization code
- Cryptographic operations
- External service integrations
- User data handling
- Security-sensitive configurations

**Non-compliance will result in:**
- PR rejection until security issues are resolved
- Required security team review
- Additional testing requirements

---

*This checklist was established following the security analysis of WBS 1.14 Enterprise SSO Integration (July 2, 2025) to prevent recurring security risks in future development.*
