# API Reference: Minkalla Quantum-Safe Privacy Portal Backend

**Artifact ID**: API_REFERENCE  
**Version ID**: v2.0  
**Date**: June 24, 2025  
**Objective**: Comprehensive API documentation with detailed schemas, authentication flows, and E2E testing insights from Sub-task 1.5.6d (100% test success rate).

This document provides detailed API endpoint documentation, including request/response schemas, authentication flows, validation requirements, and error handling patterns. For interactive documentation, see the Swagger UI at `/api-docs` when running the backend.

---

## 🔐 Authentication & User Management

### POST `/portal/auth/register`
**Purpose:** Register a new user with secure password hashing and validation

**Request Schema:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Validation Requirements:**
- Email: Valid email format, case-insensitive
- Password: Minimum 8 characters, must include uppercase, lowercase, number, and special character

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "userId": "60d5ec49f1a23c001c8a4d7d"
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors (exact format: single string or array)
- `409 Conflict`: Email already exists

---

### POST `/portal/auth/login`
**Purpose:** Authenticate user and issue JWT tokens with optional refresh token

**Request Schema:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "optional-refresh-token-when-rememberMe-true",
  "user": {
    "id": "60d5ec49f1a23c001c8a4d7d",
    "email": "user@example.com"
  }
}
```

**Authentication Features:**
- **JWT Access Token**: Short-lived (15 minutes), includes user ID and email
- **Refresh Token**: Long-lived (7 days), only returned when `rememberMe: true`
- **Case-Insensitive Email**: Supports uppercase/lowercase email variations
- **SQL Injection Protection**: Returns 401 for injection attempts (not 400)
- **Brute Force Protection**: Account lockout after multiple failed attempts

**Error Responses:**
- `401 Unauthorized`: Invalid credentials or SQL injection attempts
- `400 Bad Request`: Malformed request body
- `422 Unprocessable Entity`: Missing required fields

**Security Headers:**
```
Authorization: Bearer <accessToken>
```

---

## 📋 Consent Management (Active)

### POST `/portal/consent`
**Purpose:** Create or update user consent with comprehensive validation

**Authentication:** Required (JWT Bearer token)

**Request Schema:**
```json
{
  "userId": "60d5ec49f1a23c001c8a4d7d",
  "consentType": "marketing",
  "granted": true,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

**Validation Requirements:**
- **userId**: Exactly 24 characters, valid MongoDB ObjectId format
- **consentType**: One of: 'marketing', 'analytics', 'functional', 'necessary'
- **granted**: Boolean value
- **ipAddress**: Valid IPv4 or IPv6 address
- **userAgent**: Maximum 500 characters

**Response (201 Created):**
```json
{
  "consentId": "60d5ec49f1a23c001c8a4d8e",
  "userId": "60d5ec49f1a23c001c8a4d7d",
  "consentType": "marketing",
  "granted": true,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2025-06-24T20:47:37.000Z",
  "updatedAt": "2025-06-24T20:47:37.000Z"
}
```

**Duplicate Prevention:**
- **409 Conflict**: Immediate prevention of exact duplicate consents
- **Business Logic**: No time-based windows, strict duplicate detection

**Error Responses:**
- `400 Bad Request`: Validation errors with exact messages:
  - `'User ID must be exactly 24 characters long'`
  - `'User agent must not exceed 500 characters'`
- `401 Unauthorized`: Missing or invalid JWT token
- `409 Conflict`: Duplicate consent record

---

### GET `/portal/consent/:userId`
**Purpose:** Retrieve user consent records with filtering and validation

**Authentication:** Required (JWT Bearer token)

**Path Parameters:**
- `userId`: 24-character MongoDB ObjectId

**Query Parameters:**
```
?consentType=marketing&granted=true&limit=10&offset=0
```

**Response (200 OK):**
```json
{
  "consents": [
    {
      "consentId": "60d5ec49f1a23c001c8a4d8e",
      "userId": "60d5ec49f1a23c001c8a4d7d",
      "consentType": "marketing",
      "granted": true,
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2025-06-24T20:47:37.000Z",
      "updatedAt": "2025-06-24T20:47:37.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

**Error Responses:**
- `400 Bad Request`: Invalid userId format
- `401 Unauthorized`: Missing or invalid JWT token
- `404 Not Found`: No consents found for user

---

## 🔒 Data Subject Rights (Planned)

### POST `/portal/dsar`
**Purpose:** Data Subject Access Request (GDPR Article 15)

**Authentication:** Required (JWT Bearer token)

**Request Schema:**
```json
{
  "userId": "60d5ec49f1a23c001c8a4d7d",
  "requestType": "access",
  "dataCategories": ["consents", "profile", "activity"]
}
```

**Response (202 Accepted):**
```json
{
  "requestId": "dsar-60d5ec49f1a23c001c8a4d9f",
  "status": "processing",
  "estimatedCompletion": "2025-06-25T20:47:37.000Z"
}
```

---

## 🛡️ Security & Validation

### ValidationPipe Configuration
The API uses a custom ValidationPipe configuration that ensures exact error message formats for E2E test compatibility:

```typescript
// Returns single error message string for single violations
{ "message": "User ID must be exactly 24 characters long" }

// Returns array for multiple violations
{ "message": ["Error 1", "Error 2"] }
```

### SQL Injection Protection
- **Detection**: Patterns like `'`, `;`, `--`, `OR`, `AND` in login fields
- **Response**: 401 Unauthorized with generic message
- **Logging**: Security events logged for monitoring

### Rate Limiting
- **Login Endpoint**: 5 attempts per minute per IP
- **Consent Endpoints**: 100 requests per minute per user
- **Global**: 1000 requests per minute per IP

---

## 📊 E2E Testing Achievements

**Current Status**: 100% E2E Test Success Rate (57/57 tests passing)

### Test Coverage
- **Authentication Flow**: 15 test cases covering login, validation, security
- **Consent Creation**: 20 test cases covering validation, duplicates, edge cases
- **Consent Retrieval**: 15 test cases covering filtering, authorization, errors
- **Security Testing**: 7 test cases covering SQL injection, malformed requests

### Key Testing Insights
- **ValidationPipe Format**: Exact error message string matching required
- **HTTP Status Codes**: Strict adherence to business logic requirements
- **Database Cleanup**: Comprehensive test data isolation
- **Authentication**: JWT token format validation and refresh token handling

---

## 🔧 API Documentation

### Interactive Documentation
- **Swagger UI**: `/api-docs` (enabled when `ENABLE_SWAGGER_DOCS=true`)
- **OpenAPI Spec**: Downloadable JSON/YAML from Swagger UI
- **Postman Collection**: Available in `docs/postman/` directory

### Development Tools
- **Base URL**: `http://localhost:8080` (development)
- **Global Prefix**: All endpoints prefixed with `/portal/`
- **Content Type**: `application/json` for all requests
- **CORS**: Configured for development origins

---

## 📝 Implementation Notes

### NestJS Configuration
- **Global Validation**: Custom ValidationPipe with exact error message formatting
- **Authentication**: JWT strategy with passport integration
- **Database**: MongoDB with Mongoose ODM
- **Security**: Helmet, CORS, rate limiting, HPP protection

### Error Handling Patterns
- **Validation Errors**: 400 with specific field messages
- **Authentication Errors**: 401 with generic security messages
- **Authorization Errors**: 403 with resource-specific messages
- **Not Found Errors**: 404 with entity-specific messages
- **Conflict Errors**: 409 with business rule explanations

### Response Format Standards
- **Success**: Include relevant data and metadata
- **Errors**: Consistent structure with `statusCode`, `message`, `error`
- **Pagination**: Include `total`, `limit`, `offset` for list endpoints
- **Timestamps**: ISO 8601 format in UTC

---

## 🔄 Version History

- **v2.0** (June 24, 2025): Complete rewrite with E2E testing insights, detailed schemas, and security documentation
- **v1.0** (June 21, 2025): Initial API reference with basic endpoint information

---

**Document Maintainer**: Minkalla Development Team  
**Last Updated**: June 24, 2025  
**Next Review**: July 24, 2025  
**Related Documents**: `docs/E2E_TESTING_BEST_PRACTICES.md`, `docs/VALIDATION_CONTRACTS.md`
