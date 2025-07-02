# Validation Contracts for Quantum-Safe Privacy Portal

**Artifact ID**: VALIDATION_CONTRACTS  
**Version ID**: v1.0  
**Date**: June 24, 2025  
**Objective**: Standardize error message formats and validation contracts across E2E tests and backend implementation to prevent format mismatches.

## 1. Overview

This document defines the exact validation error messages and HTTP status codes that must be used consistently across:
- NestJS DTOs and validation decorators
- E2E test expectations
- API documentation
- Error handling logic

## 2. Error Message Constants

### 2.1 User ID Validation

```typescript
export const USER_ID_VALIDATION = {
  EXACT_LENGTH: 'User ID must be exactly 24 characters long',
  REQUIRED: 'User ID is required',
  FORMAT: 'User ID must be exactly 24 characters long' // Use same message for format validation
} as const;
```

**Usage in DTOs**:
```typescript
@IsString({ message: USER_ID_VALIDATION.REQUIRED })
@MinLength(24, { message: USER_ID_VALIDATION.EXACT_LENGTH })
@MaxLength(24, { message: USER_ID_VALIDATION.EXACT_LENGTH })
@Matches(/^[a-fA-F0-9]{24}$/, { message: USER_ID_VALIDATION.FORMAT })
userId: string;
```

**E2E Test Expectations**:
```javascript
expect(response.body.message).to.include('User ID must be exactly 24 characters long');
```

### 2.2 User Agent Validation

```typescript
export const USER_AGENT_VALIDATION = {
  MAX_LENGTH: 'User agent must not exceed 500 characters',
  REQUIRED: 'User agent is required'
} as const;
```

**Usage in DTOs**:
```typescript
@IsString({ message: USER_AGENT_VALIDATION.REQUIRED })
@MaxLength(500, { message: USER_AGENT_VALIDATION.MAX_LENGTH })
userAgent: string;
```

### 2.3 Email Validation

```typescript
export const EMAIL_VALIDATION = {
  INVALID_FORMAT: 'Please enter a valid email address',
  REQUIRED: 'Email is required',
  MIN_LENGTH: 'Email must be at least 5 characters long',
  MAX_LENGTH: 'Email must not exceed 255 characters'
} as const;
```

### 2.4 Password Validation

```typescript
export const PASSWORD_VALIDATION = {
  MIN_LENGTH: 'Password must be at least 8 characters long',
  MAX_LENGTH: 'Password must not exceed 128 characters',
  REQUIRED: 'Password is required'
} as const;
```

## 3. HTTP Status Code Contracts

### 3.1 Authentication Status Codes

```typescript
export const AUTH_STATUS_CODES = {
  SUCCESS: 200,
  INVALID_CREDENTIALS: 401,
  SQL_INJECTION_ATTEMPT: 401, // Must return 401, not 400
  ACCOUNT_LOCKED: 403,
  TOO_MANY_ATTEMPTS: 429
} as const;
```

### 3.2 Validation Status Codes

```typescript
export const VALIDATION_STATUS_CODES = {
  BAD_REQUEST: 400,
  DUPLICATE_CONSENT: 409, // Must return 409 for exact duplicates
  NOT_FOUND: 404,
  CONFLICT: 409
} as const;
```

## 4. ValidationPipe Configuration Contract

### 4.1 Required Configuration

```typescript
// main.ts - ValidationPipe configuration
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  disableErrorMessages: nodeEnv === 'production',
  exceptionFactory: (errors) => {
    const errorMessages: string[] = [];
    errors.forEach((error) => {
      if (error.constraints) {
        const constraintMessages = Object.values(error.constraints);
        if (constraintMessages.length > 0) {
          // Always use first constraint message for consistency
          errorMessages.push(constraintMessages[0] as string);
        }
      }
    });
    return new BadRequestException({
      statusCode: 400,
      message: errorMessages.length === 1 ? errorMessages[0] : errorMessages,
      error: 'Bad Request',
    });
  },
}));
```

### 4.2 Response Format Contract

**Single Validation Error**:
```json
{
  "statusCode": 400,
  "message": "User ID must be exactly 24 characters long",
  "error": "Bad Request"
}
```

**Multiple Validation Errors**:
```json
{
  "statusCode": 400,
  "message": [
    "User ID must be exactly 24 characters long",
    "User agent must not exceed 500 characters"
  ],
  "error": "Bad Request"
}
```

## 5. Business Logic Contracts

### 5.1 Duplicate Consent Prevention

```typescript
export const CONSENT_BUSINESS_RULES = {
  DUPLICATE_PREVENTION: 'immediate', // No time-based window
  DUPLICATE_ERROR_MESSAGE: 'Consent record already exists with the same granted status',
  DUPLICATE_STATUS_CODE: 409
} as const;
```

**Implementation**:
```typescript
// consent.service.ts
if (existingConsent && existingConsent.granted === granted) {
  throw new ConflictException(CONSENT_BUSINESS_RULES.DUPLICATE_ERROR_MESSAGE);
}
```

### 5.2 SQL Injection Detection

```typescript
export const SECURITY_CONTRACTS = {
  SQL_INJECTION_PATTERNS: ["'", ';', '--', 'DROP', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  SQL_INJECTION_RESPONSE: {
    statusCode: 401,
    message: 'Invalid credentials',
    error: 'Unauthorized'
  }
} as const;
```

**Implementation**:
```typescript
// auth.controller.ts
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(loginDto.email) || 
    loginDto.email.includes("'") || loginDto.email.includes(';') || loginDto.email.includes('--') ||
    loginDto.password.includes("'") || loginDto.password.includes(';') || loginDto.password.includes('--')) {
  throw new UnauthorizedException('Invalid credentials');
}
```

## 6. E2E Test Contract Verification

### 6.1 Validation Error Tests

```javascript
// Template for validation error tests
describe('Validation Error Format', () => {
  it('should return exact error message for userId validation', () => {
    cy.request({
      method: 'POST',
      url: '/portal/consent',
      body: { userId: 'invalid' },
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body.message).to.include('User ID must be exactly 24 characters long');
    });
  });
});
```

### 6.2 Status Code Tests

```javascript
// Template for status code tests
describe('HTTP Status Code Contracts', () => {
  it('should return 401 for SQL injection attempts', () => {
    cy.request({
      method: 'POST',
      url: '/portal/auth/login',
      body: {
        email: "'; DROP TABLE users; --",
        password: 'TestPassword123!'
      },
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });
  
  it('should return 409 for duplicate consent', () => {
    // Create initial consent
    // Attempt to create exact duplicate
    // Verify 409 status code
  });
});
```

## 7. Implementation Checklist

### 7.1 Backend Implementation
- [ ] Create validation constants file
- [ ] Update all DTOs to use constants
- [ ] Configure ValidationPipe with exact format
- [ ] Implement business logic contracts
- [ ] Add SQL injection detection

### 7.2 Test Implementation
- [ ] Update E2E tests to use exact error messages
- [ ] Verify status code expectations
- [ ] Add contract verification tests
- [ ] Test ValidationPipe format independently

### 7.3 Documentation
- [ ] Update API documentation with exact error formats
- [ ] Document status code contracts
- [ ] Create troubleshooting guide
- [ ] Add examples for common scenarios

## 8. Troubleshooting Guide

### 8.1 Common Issues

**Issue**: E2E test expects string but gets array
**Solution**: Check ValidationPipe exceptionFactory configuration

**Issue**: Wrong error message returned
**Solution**: Verify decorator message matches constant

**Issue**: Wrong status code
**Solution**: Check business logic throws correct exception type

### 8.2 Debugging Commands

```bash
# Test ValidationPipe format
npm run test:validation-format

# Verify error message consistency
npm run test:error-messages

# Check status code contracts
npm run test:status-codes
```

## 9. Maintenance

### 9.1 Regular Reviews
- Monthly review of error message consistency
- Quarterly validation contract updates
- Annual framework effectiveness assessment

### 9.2 Change Management
- All error message changes require E2E test updates
- Status code changes require API documentation updates
- New validation rules require contract documentation

---

**Document Maintainer**: Devin AI  
**Last Updated**: June 24, 2025  
**Next Review**: July 24, 2025
