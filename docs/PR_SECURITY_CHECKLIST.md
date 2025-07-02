# 🔒 PR Security Checklist

## Overview

This checklist must be completed for every Pull Request to ensure security risks are identified and addressed before merging. This checklist was established following the security analysis of WBS 1.14 Enterprise SSO Integration.

## ✅ Pre-PR Security Verification

### 🛡️ **Critical Security Risks Check**

Before submitting any PR, verify that your changes do NOT introduce these specific security risks:

#### **1. Fallback Logic Implementation** ⚠️ HIGH PRIORITY
- [ ] **No removal of fallback mechanisms without proper replacement**
  - Check: Does your code remove try/catch blocks or fallback logic?
  - Check: Are you throwing errors instead of graceful degradation?
  - **Required**: If removing fallback logic, integrate `HybridCryptoService` or equivalent
  - **Files to review**: `auth.service.ts`, `*crypto*.service.ts`, `*pqc*.service.ts`

#### **2. Private Method Access Patterns** ⚠️ MEDIUM PRIORITY  
- [ ] **No bracket notation access to private methods**
  - Check: Are you using `obj['privateMethod']()` syntax?
  - Check: Are you bypassing TypeScript access control?
  - **Required**: Use public wrapper methods or proper dependency injection
  - **Files to review**: `*.service.ts`, `*.controller.ts`

#### **3. User ID Consistency** ⚠️ HIGH PRIORITY
- [ ] **Consistent user identification across cryptographic operations**
  - Check: Are you using `Date.now()` or timestamps in user ID generation?
  - Check: Do signing and verification operations use the same user ID format?
  - **Required**: Use `generateStandardizedCryptoUserId()` for crypto operations
  - **Files to review**: `pqc-data-validation.service.ts`, `auth.service.ts`, `*crypto*.service.ts`

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
