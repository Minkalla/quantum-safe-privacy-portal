# JWT Utility Documentation

## Overview
This module provides utilities for handling JWT tokens in the Quantum-Safe Privacy Portal frontend, with special support for Post-Quantum Cryptography (PQC) enhanced tokens.

## Functions

### `decodeJWT(token: string): JWTPayload | null`
Decodes a JWT token and returns the payload.

**Parameters:**
- `token`: The JWT token string to decode

**Returns:**
- `JWTPayload` object if successful
- `null` if decoding fails

**Error Behavior:**
- Logs errors to console
- Returns null for any decode failures
- Handles malformed tokens gracefully

### `isTokenExpired(token: string): boolean`
Checks if a JWT token has expired.

**Parameters:**
- `token`: The JWT token string to check

**Returns:**
- `true` if token is expired or invalid
- `false` if token is still valid

**Error Behavior:**
- Returns `true` for any decode errors (fail-safe)
- Compares against current timestamp

### `extractUserFromToken(token: string): { id: string; email: string } | null`
Extracts user information from a JWT token.

**Parameters:**
- `token`: The JWT token string to extract from

**Returns:**
- User object with `id` and `email` if successful
- `null` if extraction fails

**Error Behavior:**
- Returns null for decode failures
- Validates required fields exist

### `isPQCToken(token: string): boolean`
Determines if a JWT token was generated using Post-Quantum Cryptography.

**Parameters:**
- `token`: The JWT token string to check

**Returns:**
- `true` if token has PQC flag set
- `false` if token is classical or check fails

**Error Behavior:**
- Returns `false` for any decode errors
- Checks for `pqc: true` in payload

### `getTokenAlgorithm(token: string): string | null`
Retrieves the cryptographic algorithm used for token generation.

**Parameters:**
- `token`: The JWT token string to analyze

**Returns:**
- Algorithm string (e.g., "ML-DSA-65", "RS256")
- `null` if algorithm not specified or decode fails

**Error Behavior:**
- Returns null for decode failures
- Returns null if algorithm field missing

## JWT Payload Structure

```typescript
interface JWTPayload {
  userId: string;        // User identifier
  email: string;         // User email address
  iat: number;          // Issued at timestamp
  exp: number;          // Expiration timestamp
  pqc?: boolean;        // PQC enhancement flag
  algorithm?: string;   // Cryptographic algorithm
  session_id?: string;  // Session identifier
  keyId?: string;       // Key identifier for PQC
}
```

## Usage Examples

```typescript
import { decodeJWT, isTokenExpired, isPQCToken } from './jwt';

// Basic token validation
const token = localStorage.getItem('accessToken');
if (token && !isTokenExpired(token)) {
  const payload = decodeJWT(token);
  console.log('User:', payload?.email);
  
  if (isPQCToken(token)) {
    console.log('Using PQC-enhanced security');
  }
}

// Extract user for authentication context
const userData = extractUserFromToken(token);
if (userData) {
  setUser(userData);
}
```

## Security Considerations

1. **Client-Side Validation**: These utilities perform client-side validation only. Server-side validation is still required for security.

2. **Token Storage**: Tokens should be stored securely (preferably in memory, not localStorage for production).

3. **Error Handling**: All functions fail gracefully and log errors for debugging.

4. **PQC Compatibility**: Special handling for PQC-enhanced tokens ensures compatibility with quantum-safe cryptography.

## Error Scenarios

### Common Decode Failures
- Malformed JWT structure
- Invalid base64 encoding
- Missing required payload fields
- Corrupted token data

### Expiration Edge Cases
- Clock skew between client/server
- Timezone differences
- Token issued in future (clock drift)

### PQC-Specific Issues
- Missing PQC metadata in payload
- Algorithm mismatch between frontend/backend
- Key rotation during token lifetime
