# QynAuth-Portal Backend API Contract Specification
*Service-to-Service Communication Protocol for NIST PQC Integration*

**Document Version**: v1.0  
**Date**: June 25, 2025  
**Status**: Draft  
**Authors**: Integration Team  

## Executive Summary

This document defines the API contract between QynAuth (FastAPI quantum authentication service) and Portal Backend (NestJS consent management service) to ensure seamless service interoperability during NIST Post-Quantum Cryptography implementation while maintaining the existing 57/57 E2E test success rate.

## Current Architecture Analysis

### QynAuth Service (Source of Truth for Authentication)
- **Framework**: FastAPI with Python 3.10+
- **Current Endpoints**: 
  - `POST /auth/register` - User registration
  - `POST /auth/login` - User authentication  
  - `GET /health` - Service health check
- **Authentication**: Placeholder JWT tokens (`f"dummy_jwt_for_{username}_{secrets.token_hex(16)}"`)
- **Storage**: In-memory dictionary (`users_db = {}`)
- **PQC Integration**: Rust FFI placeholder functions

### Portal Backend Service (Consumer of Authentication)
- **Framework**: NestJS with TypeScript
- **Current Endpoints**:
  - `POST /portal/auth/register` - User registration with MongoDB persistence
  - `POST /portal/auth/login` - User authentication with JWT strategy
  - `POST /portal/consent` - Consent capture (requires authentication)
  - `GET /portal/consent` - Consent retrieval (requires authentication)
- **Authentication**: Sophisticated dual-token strategy (access + refresh)
- **Storage**: MongoDB with comprehensive User model
- **Security**: Brute-force protection, rate limiting, security middleware

## Integration Requirements

### 1. Service Communication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Portal as Portal Backend
    participant QynAuth as QynAuth Service
    participant MongoDB
    
    Note over Client,MongoDB: User Registration Flow
    Client->>Portal: POST /portal/auth/register
    Portal->>QynAuth: POST /auth/register (PQC)
    QynAuth->>MongoDB: Store user with PQC keys
    MongoDB-->>QynAuth: User created
    QynAuth-->>Portal: Registration success + user_id
    Portal->>MongoDB: Store portal-specific user data
    Portal-->>Client: Registration complete
    
    Note over Client,MongoDB: User Authentication Flow
    Client->>Portal: POST /portal/auth/login
    Portal->>QynAuth: POST /auth/login (PQC)
    QynAuth->>MongoDB: Validate credentials
    MongoDB-->>QynAuth: User data + PQC keys
    QynAuth-->>Portal: PQC-signed JWT + user metadata
    Portal-->>Client: Access token + refresh cookie
    
    Note over Client,MongoDB: Consent Operations (Authenticated)
    Client->>Portal: POST /portal/consent (with JWT)
    Portal->>QynAuth: GET /auth/validate (JWT verification)
    QynAuth-->>Portal: User validation + metadata
    Portal->>MongoDB: Store consent record
    Portal-->>Client: Consent recorded
```

### 2. API Endpoint Specifications

#### QynAuth Service Endpoints (Enhanced)

##### POST /auth/register
**Purpose**: Register new user with PQC key generation  
**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "pqc_enabled": true,
  "metadata": {
    "source": "portal_backend",
    "session_id": "uuid-v4"
  }
}
```

**Response** (Success - 201):
```json
{
  "success": true,
  "user_id": "uuid-v4",
  "email": "user@example.com",
  "pqc_public_key": "base64-encoded-kyber-public-key",
  "pqc_key_id": "key-identifier",
  "created_at": "2025-06-25T05:20:23Z",
  "metadata": {
    "algorithm": "KYBER-768",
    "signature_algorithm": "DILITHIUM-3"
  }
}
```

**Response** (Error - 400):
```json
{
  "success": false,
  "error": "REGISTRATION_FAILED",
  "message": "Email already exists",
  "code": "EMAIL_DUPLICATE"
}
```

##### POST /auth/login
**Purpose**: Authenticate user and generate PQC-signed JWT  
**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "pqc_mode": true,
  "metadata": {
    "source": "portal_backend",
    "session_id": "uuid-v4"
  }
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "access_token": "pqc-signed-jwt-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "user_id": "uuid-v4",
    "email": "user@example.com",
    "pqc_enabled": true,
    "last_login": "2025-06-25T05:20:23Z"
  },
  "pqc_metadata": {
    "algorithm": "KYBER-768",
    "signature_algorithm": "DILITHIUM-3",
    "key_id": "key-identifier"
  }
}
```

##### GET /auth/validate
**Purpose**: Validate JWT token and return user metadata  
**Headers**:
```
Authorization: Bearer pqc-signed-jwt-token
```

**Response** (Success - 200):
```json
{
  "valid": true,
  "user": {
    "user_id": "uuid-v4",
    "email": "user@example.com",
    "pqc_enabled": true,
    "permissions": ["consent_read", "consent_write"]
  },
  "token_metadata": {
    "issued_at": "2025-06-25T05:20:23Z",
    "expires_at": "2025-06-25T06:20:23Z",
    "algorithm": "PQC-DILITHIUM3"
  }
}
```

#### Portal Backend Endpoints (Updated)

##### POST /portal/auth/register
**Purpose**: Register user through QynAuth integration  
**Implementation**: Proxy to QynAuth with Portal-specific data storage

##### POST /portal/auth/login  
**Purpose**: Authenticate user through QynAuth integration  
**Implementation**: Proxy to QynAuth with Portal session management

##### POST /portal/consent (Requires Authentication)
**Purpose**: Capture user consent with PQC authentication  
**Headers**:
```
Authorization: Bearer pqc-signed-jwt-token
```

**Implementation**: Validate token with QynAuth before processing consent

### 3. JWT Token Structure

#### PQC-Enhanced JWT Format
```json
{
  "header": {
    "alg": "PQC-DILITHIUM3",
    "typ": "JWT",
    "kid": "pqc-key-id-2025"
  },
  "payload": {
    "sub": "user-uuid-v4",
    "email": "user@example.com",
    "iat": 1735110023,
    "exp": 1735113623,
    "iss": "qynauth-service",
    "aud": "portal-backend",
    "pqc": {
      "enabled": true,
      "algorithm": "KYBER-768",
      "signature": "DILITHIUM-3",
      "key_id": "pqc-key-id-2025"
    },
    "permissions": ["consent_read", "consent_write"],
    "session": {
      "id": "session-uuid",
      "source": "portal_backend"
    }
  }
}
```

#### Classical Fallback JWT Format
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "classical-key-id"
  },
  "payload": {
    "sub": "user-uuid-v4",
    "email": "user@example.com",
    "iat": 1735110023,
    "exp": 1735113623,
    "iss": "qynauth-service",
    "aud": "portal-backend",
    "pqc": {
      "enabled": false,
      "fallback_reason": "pqc_unavailable"
    },
    "permissions": ["consent_read", "consent_write"]
  }
}
```

### 4. Error Handling Standards

#### Standard Error Response Format
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "code": "SPECIFIC_ERROR_CODE",
  "timestamp": "2025-06-25T05:20:23Z",
  "request_id": "uuid-v4",
  "details": {
    "field": "specific error details"
  }
}
```

#### Error Codes Mapping

| HTTP Status | Error Code | Description | Action |
|-------------|------------|-------------|---------|
| 400 | INVALID_REQUEST | Malformed request data | Fix request format |
| 401 | AUTHENTICATION_FAILED | Invalid credentials | Re-authenticate |
| 403 | AUTHORIZATION_FAILED | Insufficient permissions | Check user permissions |
| 404 | USER_NOT_FOUND | User does not exist | Register user first |
| 409 | USER_EXISTS | Email already registered | Use different email |
| 422 | VALIDATION_ERROR | Request validation failed | Fix validation errors |
| 500 | INTERNAL_ERROR | Server error | Retry or contact support |
| 503 | SERVICE_UNAVAILABLE | QynAuth service down | Use fallback mode |

### 5. Service Discovery and Configuration

#### QynAuth Service Configuration
```yaml
# QynAuth service configuration
qynauth:
  host: "qynauth-service"
  port: 8000
  base_url: "http://qynauth-service:8000"
  timeout: 30000  # 30 seconds
  retry_attempts: 3
  circuit_breaker:
    failure_threshold: 5
    recovery_timeout: 60000  # 1 minute
```

#### Portal Backend Configuration
```yaml
# Portal Backend QynAuth client configuration
qynauth_client:
  base_url: "${QYNAUTH_SERVICE_URL}"
  api_key: "${QYNAUTH_API_KEY}"
  timeout: 30000
  fallback_mode: true
  pqc_enabled: true
```

### 6. Rate Limiting and Security

#### Rate Limiting Rules
- **Registration**: 5 requests per minute per IP
- **Login**: 10 requests per minute per IP  
- **Token Validation**: 100 requests per minute per service
- **Health Check**: Unlimited

#### Security Headers
```http
# Required headers for all requests
Content-Type: application/json
X-Request-ID: uuid-v4
X-Service-Name: portal-backend
X-API-Version: v1.0

# Authentication headers
Authorization: Bearer jwt-token
```

### 7. Monitoring and Observability

#### Health Check Endpoints
- **QynAuth**: `GET /health`
- **Portal Backend**: `GET /portal/health`

#### Metrics to Track
- Request/response latency
- Success/failure rates
- PQC vs classical authentication ratio
- Token validation performance
- Service availability

#### Logging Standards
```json
{
  "timestamp": "2025-06-25T05:20:23Z",
  "level": "INFO",
  "service": "portal-backend",
  "operation": "qynauth_login",
  "request_id": "uuid-v4",
  "user_id": "uuid-v4",
  "duration_ms": 150,
  "pqc_enabled": true,
  "status": "success"
}
```

### 8. Fallback and Resilience

#### Circuit Breaker Pattern
```python
# Portal Backend QynAuth client with circuit breaker
class QynAuthClient:
    def __init__(self):
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            expected_exception=QynAuthServiceError
        )
    
    @circuit_breaker
    def authenticate_user(self, credentials):
        # Primary PQC authentication
        return self._call_qynauth_api(credentials)
    
    def authenticate_user_fallback(self, credentials):
        # Classical authentication fallback
        return self._classical_authentication(credentials)
```

#### Fallback Scenarios
1. **QynAuth Service Down**: Use classical JWT authentication
2. **PQC Algorithm Failure**: Fall back to RSA/ECDSA
3. **Network Timeout**: Retry with exponential backoff
4. **Database Unavailable**: Use cached user data (read-only)

### 9. Migration Strategy

#### Phase 1: Parallel Operation
- Both services maintain independent authentication
- Cross-validate tokens during transition period
- Monitor performance and error rates

#### Phase 2: Gradual Migration  
- Route 10% of traffic to QynAuth integration
- Increase percentage based on success metrics
- Maintain rollback capability

#### Phase 3: Full Integration
- All authentication flows through QynAuth
- Remove legacy authentication code
- Monitor for 30 days before declaring success

### 10. Testing Requirements

#### Integration Test Scenarios
1. **Happy Path**: Successful registration and login
2. **Error Handling**: Invalid credentials, service failures
3. **Fallback Testing**: QynAuth unavailable scenarios
4. **Performance Testing**: Load testing with PQC operations
5. **Security Testing**: Token validation, injection attacks

#### E2E Test Preservation
- Maintain existing 57/57 test success rate
- Add new tests for PQC integration
- Mock QynAuth service for isolated Portal Backend testing

### 11. Compliance and Security

#### Data Privacy
- User credentials never stored in Portal Backend
- PQC keys managed exclusively by QynAuth
- Audit logging for all authentication events

#### Security Standards
- NIST SP 800-53 compliance for cryptographic operations
- GDPR compliance for user data handling
- ISO/IEC 27701 privacy controls implementation

### 12. Implementation Checklist

#### QynAuth Service Updates
- [ ] Implement enhanced registration endpoint
- [ ] Add PQC-signed JWT generation
- [ ] Create token validation endpoint
- [ ] Add MongoDB integration
- [ ] Implement circuit breaker patterns

#### Portal Backend Updates  
- [ ] Create QynAuth client service
- [ ] Update authentication middleware
- [ ] Implement fallback mechanisms
- [ ] Add integration tests
- [ ] Update User model for PQC fields

#### Infrastructure Updates
- [ ] Update docker-compose.yml
- [ ] Configure service discovery
- [ ] Set up monitoring and logging
- [ ] Implement health checks
- [ ] Configure rate limiting

### 13. Success Metrics

#### Technical Metrics
- [ ] 100% API contract compliance
- [ ] <200ms average authentication latency
- [ ] 99.9% service availability
- [ ] Zero authentication failures during migration

#### Business Metrics
- [ ] Maintain 57/57 E2E test success rate
- [ ] Zero user-facing authentication errors
- [ ] Successful PQC algorithm integration
- [ ] Compliance audit passage

## Conclusion

This API contract provides the foundation for seamless QynAuth-Portal Backend integration while implementing NIST Post-Quantum Cryptography. The specification ensures backward compatibility, robust error handling, and maintains the existing 57/57 E2E test success rate through careful migration planning and fallback mechanisms.

**Next Steps**:
1. Review and approve this API contract
2. Create Database Migration Strategy document
3. Implement QynAuth service enhancements
4. Update Portal Backend integration layer
5. Execute comprehensive testing plan

---

**Document Status**: Ready for Review  
**Approval Required**: Technical Lead, Security Team, QA Team  
**Implementation Timeline**: Aligned with WBS execution plans (Weeks 3-6)
