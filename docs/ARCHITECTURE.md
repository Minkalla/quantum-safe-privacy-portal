# Technical Architecture: Minkalla Quantum-Safe Privacy Portal Backend

**Artifact ID**: ARCHITECTURE  
**Version ID**: v2.0  
**Date**: June 24, 2025  
**Objective**: Comprehensive technical architecture documentation with detailed component interactions, E2E testing infrastructure, and ValidationPipe configuration insights from Sub-task 1.5.6d (100% test success rate).

This document provides detailed technical architecture overview, including major modules, data flow, integration points, and the comprehensive E2E testing infrastructure that ensures 100% test coverage across 57 test scenarios.

---

## 1. High-Level Architecture Overview

### Core Technology Stack
- **Framework:** NestJS (TypeScript) with custom ValidationPipe configuration
- **Runtime:** Node.js 18+ with ES2022 target
- **Containerization:** Docker multi-stage builds, Docker Compose orchestration
- **Database:** MongoDB Atlas (cloud-native, Docker MongoDB deprecated)
- **Authentication:** JWT with dual-token strategy (access + refresh tokens)
- **Observability:** AWS X-Ray, CloudTrail, GuardDuty integration
- **Security:** bcryptjs, Helmet, CORS, HPP, rate limiting, SQL injection detection
- **CI/CD:** GitHub Actions with Trivy SAST, OWASP ZAP DAST, Cypress E2E testing
- **Testing:** Cypress E2E (57 tests, 100% success rate), Jest unit testing

### Architecture Principles
- **Contract-First Development**: Shared error message constants between tests and implementation
- **Security by Design**: Multiple layers of validation, authentication, and monitoring
- **Observability First**: Comprehensive logging, tracing, and monitoring integration
- **Test-Driven Quality**: 100% E2E test coverage with exact API contract validation

---

## 2. Detailed Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend Layer (Planned)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                     API Gateway / Load Balancer                            │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────┐
│                        NestJS Backend                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │  Auth Module    │  │ Consent Module  │  │  DSAR Module    │            │
│  │                 │  │                 │  │   (Planned)     │            │
│  │ • JWT Strategy  │  │ • Validation    │  │ • GDPR Art. 15  │            │
│  │ • SQL Injection │  │ • Duplicate     │  │ • Data Export   │            │
│  │   Detection     │  │   Prevention    │  │ • Audit Trail   │            │
│  │ • Refresh Token │  │ • Audit Logging │  │                 │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ValidationPipe (Custom)                         │   │
│  │  • Exact error message format matching                             │   │
│  │  • Single string for single violations                             │   │
│  │  • Array format for multiple violations                            │   │
│  │  • HTTP status code contract enforcement                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Security Middleware                           │   │
│  │  • Helmet (Security Headers)    • Rate Limiting                    │   │
│  │  • CORS Configuration           • HPP Protection                   │   │
│  │  • JWT Authentication           • Request Validation               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────┐
│                       Data Layer                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   MongoDB       │  │  Mongoose ODM   │  │   Audit Logs    │            │
│  │                 │  │                 │  │                 │            │
│  │ • Users         │  │ • Schema        │  │ • Consent       │            │
│  │ • Consents      │  │   Validation    │  │   Changes       │            │
│  │ • Audit Trail   │  │ • Middleware    │  │ • Auth Events   │            │
│  │ • Sessions      │  │ • Indexing      │  │ • API Access    │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        Observability Layer                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   AWS X-Ray     │  │   CloudTrail    │  │   GuardDuty     │            │
│  │                 │  │                 │  │                 │            │
│  │ • Request       │  │ • API Calls     │  │ • Threat        │            │
│  │   Tracing       │  │ • Data Access   │  │   Detection     │            │
│  │ • Performance   │  │ • Compliance    │  │ • Anomaly       │            │
│  │   Monitoring    │  │   Auditing      │  │   Detection     │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         Testing Infrastructure                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Cypress E2E   │  │   Jest Unit     │  │   CI/CD Tests   │            │
│  │                 │  │                 │  │                 │            │
│  │ • 57 Tests      │  │ • Unit Tests    │  │ • Trivy SAST    │            │
│  │ • 100% Success  │  │ • Integration   │  │ • OWASP ZAP     │            │
│  │ • API Contract  │  │   Tests         │  │   DAST          │            │
│  │   Validation    │  │ • Mocking       │  │ • Security      │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Module Architecture

### 3.1 Authentication Module (`src/auth/`)
**Purpose**: Secure user authentication with JWT dual-token strategy

**Components**:
- **AuthController**: Login, registration, token refresh endpoints
- **AuthService**: Business logic for authentication, password hashing
- **JwtStrategy**: Passport JWT strategy configuration
- **AuthGuard**: Route protection middleware
- **DTOs**: Login, registration request/response validation

**Key Features**:
- **Dual-Token Strategy**: Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- **SQL Injection Detection**: Pattern matching for malicious input, returns 401 status
- **Case-Insensitive Email**: Supports email variations during login
- **Brute Force Protection**: Account lockout after multiple failed attempts
- **Refresh Token Management**: Secure HttpOnly cookies with SameSite=Strict

**E2E Test Coverage**: 15 test cases covering login flows, security validation, token handling

### 3.2 Consent Management Module (`src/consent/`)
**Purpose**: GDPR-compliant consent capture and management

**Components**:
- **ConsentController**: REST API endpoints for consent CRUD operations
- **ConsentService**: Business logic for consent processing, duplicate prevention
- **ConsentSchema**: MongoDB schema with audit trail
- **DTOs**: Create/update/retrieve consent validation

**Key Features**:
- **Immediate Duplicate Prevention**: No time-based windows, strict duplicate detection
- **Comprehensive Validation**: User ID (24 chars), user agent (500 chars max), IP address
- **Audit Trail**: Complete history of consent changes with timestamps
- **Response Format**: Includes ipAddress and userAgent fields as required by E2E tests

**E2E Test Coverage**: 35 test cases covering creation, retrieval, validation, edge cases

### 3.3 ValidationPipe Configuration (`src/main.ts`)
**Purpose**: Custom validation with exact error message format matching

**Critical Configuration**:
```typescript
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

**Key Features**:
- **Exact Format Matching**: Returns single string for single violations, array for multiple
- **Contract Compliance**: Ensures E2E tests receive expected error message formats
- **Production Safety**: Disables detailed error messages in production environment

---

## 4. Data Flow Architecture

### 4.1 Authentication Flow
```
Client Request → CORS Middleware → Rate Limiting → ValidationPipe → 
AuthController → AuthService → Password Verification → JWT Generation → 
Response (Access Token + Optional Refresh Token)
```

### 4.2 Consent Management Flow
```
Authenticated Request → JWT Validation → ValidationPipe → ConsentController → 
ConsentService → Duplicate Check → MongoDB Operation → Audit Log → 
Response (Consent Record with Metadata)
```

### 4.3 E2E Testing Flow
```
Cypress Test → Database Setup → API Request → ValidationPipe → 
Business Logic → Database Operation → Response Validation → 
Database Cleanup → Test Assertion
```

### 4.4 Observability Flow
```
API Request → X-Ray Trace Start → Business Logic Execution → 
Database Operation Tracing → Response Generation → X-Ray Trace End → 
CloudTrail Logging → GuardDuty Analysis
```

---

## 5. File Structure & Key Components

### 5.1 Core Application Files
```
src/
├── main.ts                    # App bootstrap, ValidationPipe, X-Ray init
├── app.module.ts             # Main NestJS module configuration
├── auth/
│   ├── auth.controller.ts    # Authentication endpoints
│   ├── auth.service.ts       # Authentication business logic
│   ├── jwt.strategy.ts       # Passport JWT configuration
│   └── dto/
│       └── login.dto.ts      # Login request validation
├── consent/
│   ├── consent.controller.ts # Consent management endpoints
│   ├── consent.service.ts    # Consent business logic
│   ├── consent.schema.ts     # MongoDB schema definition
│   └── dto/
│       ├── create-consent.dto.ts  # Consent creation validation
│       └── get-consent.dto.ts     # Consent retrieval validation
└── config/
    ├── database.config.ts    # MongoDB connection configuration
    └── jwt.config.ts         # JWT strategy configuration
```

### 5.2 E2E Testing Infrastructure
```
test/e2e/
├── cypress.config.js         # Cypress configuration with custom tasks
├── e2e-setup.js             # Database setup/cleanup utilities
├── consent-creation.cy.js    # Consent creation test scenarios
├── consent-retrieval.cy.js   # Consent retrieval test scenarios
├── login-flow.cy.js         # Authentication flow test scenarios
└── support/
    └── index.js             # Cypress support configuration
```

### 5.3 Configuration & Deployment
```
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Local development orchestration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── nest-cli.json           # NestJS CLI configuration
```

---

## 6. Integration Points & External Services

### 6.1 AWS X-Ray Integration
- **Initialization**: Configured in `main.ts` before app bootstrap
- **Tracing**: HTTP requests, database operations, external API calls
- **Segments**: Custom segments for business logic operations
- **Daemon**: Sidecar container in docker-compose.yml

### 6.2 MongoDB Integration
- **Connection**: Mongoose ODM with connection pooling
- **Schemas**: Strongly typed with validation middleware
- **Indexing**: Optimized queries for consent retrieval
- **Transactions**: ACID compliance for critical operations

### 6.3 CI/CD Pipeline Integration
- **GitHub Actions**: Automated testing, security scanning, deployment
- **Trivy SAST**: Container image vulnerability scanning
- **OWASP ZAP DAST**: Dynamic application security testing
- **Cypress E2E**: Comprehensive API contract validation

### 6.4 Security Integration Points
- **Helmet**: Security headers configuration
- **CORS**: Cross-origin request handling
- **Rate Limiting**: Express rate limiter middleware
- **HPP**: HTTP parameter pollution protection
- **JWT**: Token-based authentication with refresh strategy

---

## 7. Performance & Scalability Considerations

### 7.1 Database Optimization
- **Connection Pooling**: Mongoose connection pool configuration
- **Indexing Strategy**: Optimized indexes for consent queries
- **Query Optimization**: Efficient aggregation pipelines
- **Caching**: Redis integration for session management (planned)

### 7.2 API Performance
- **Response Compression**: Gzip compression middleware
- **Request Validation**: Early validation to prevent unnecessary processing
- **Error Handling**: Efficient error response generation
- **Logging**: Structured logging with minimal performance impact

### 7.3 Scalability Architecture
- **Horizontal Scaling**: Stateless application design
- **Load Balancing**: Ready for multiple instance deployment
- **Database Sharding**: MongoDB sharding strategy (planned)
- **Caching Layer**: Redis for session and response caching (planned)

---

## 8. Security Architecture

### 8.1 Authentication Security
- **Password Hashing**: bcryptjs with salt rounds
- **JWT Security**: RS256 algorithm, short expiration times
- **Refresh Token**: Secure storage, rotation strategy
- **Session Management**: Stateless with JWT validation

### 8.2 Input Validation Security
- **SQL Injection Prevention**: Pattern detection and sanitization
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: SameSite cookie configuration
- **Rate Limiting**: Brute force attack prevention

### 8.3 Data Protection
- **Encryption at Rest**: MongoDB encryption (production)
- **Encryption in Transit**: TLS/SSL for all communications
- **Data Minimization**: Only collect necessary consent data
- **Audit Trail**: Complete history of data access and modifications

---

## 9. E2E Testing Architecture Achievements

### 9.1 Test Coverage Statistics
- **Total Tests**: 57 test scenarios
- **Success Rate**: 100% (57/57 passing)
- **Test Categories**: Authentication (15), Consent Creation (20), Consent Retrieval (15), Security (7)
- **Validation Coverage**: All API endpoints, error scenarios, edge cases

### 9.2 Testing Infrastructure
- **Database Management**: Automated setup/cleanup with unique test data
- **API Contract Validation**: Exact error message format verification
- **Security Testing**: SQL injection, malformed requests, unauthorized access
- **Response Format Testing**: JSON schema validation, field presence verification

### 9.3 Key Testing Insights
- **ValidationPipe Format**: Critical importance of exact error message matching
- **HTTP Status Codes**: Strict business logic adherence (401 for SQL injection, 409 for duplicates)
- **Database Isolation**: Comprehensive test data cleanup prevents contamination
- **Authentication Flow**: JWT token validation and refresh token handling verification

---

## 10. Deployment Architecture

### 10.1 Local Development
- **Docker Compose**: Backend, MongoDB, X-Ray daemon orchestration
- **Hot Reload**: NestJS development mode with file watching
- **Environment Variables**: `.env` file configuration
- **Database Seeding**: Automated test data setup

### 10.2 Production Deployment (Planned)
- **Container Registry**: Docker images in AWS ECR
- **Orchestration**: Kubernetes or ECS deployment
- **Database**: MongoDB Atlas with encryption
- **Monitoring**: CloudWatch, X-Ray, GuardDuty integration

### 10.3 CI/CD Pipeline
- **Build**: Multi-stage Docker builds for optimization
- **Test**: Unit tests, integration tests, E2E tests
- **Security**: SAST with Trivy, DAST with OWASP ZAP
- **Deploy**: Automated deployment with rollback capability

---

## 11. Version History & Evolution

- **v2.0** (June 24, 2025): Complete architecture rewrite with E2E testing insights, detailed component interactions, and security documentation
- **v1.0** (June 21, 2025): Initial architecture overview with basic component descriptions

---

**Document Maintainer**: Minkalla Development Team  
**Last Updated**: June 24, 2025  
**Next Review**: July 24, 2025  
**Related Documents**: `docs/E2E_TESTING_BEST_PRACTICES.md`, `docs/VALIDATION_CONTRACTS.md`, `docs/API_REFERENCE.md`
