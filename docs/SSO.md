# Single Sign-On (SSO) Integration Documentation

## Overview

This document provides comprehensive guidance for implementing, configuring, and troubleshooting SAML 2.0-based Single Sign-On (SSO) integration in the Quantum Safe Privacy Portal.

## Architecture Overview

### SAML 2.0 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Portal as Portal Frontend
    participant Backend as Portal Backend
    participant IdP as Identity Provider
    participant AWS as AWS Secrets Manager

    User->>Portal: Click "Sign in with SSO"
    Portal->>Backend: POST /portal/auth/sso/login
    Backend->>AWS: Retrieve IdP credentials
    AWS-->>Backend: Return SAML configuration
    Backend->>Backend: Generate SAML AuthnRequest
    Backend-->>Portal: Return redirect URL + RequestID
    Portal->>IdP: Redirect to IdP with SAML Request
    IdP->>User: Present login form
    User->>IdP: Enter credentials
    IdP->>IdP: Authenticate user
    IdP->>Portal: POST SAML Response to callback
    Portal->>Backend: POST /portal/auth/sso/callback
    Backend->>Backend: Validate SAML Response
    Backend->>Backend: Generate JWT tokens (classical + PQC)
    Backend-->>Portal: Return access token + user data
    Portal->>Portal: Store tokens in localStorage
    Portal->>Portal: Redirect to dashboard/RelayState
```

## Implementation Components

### Backend Components

#### 1. SSO Service (`src/auth/sso.service.ts`)
- **Purpose**: Core SAML authentication logic
- **Key Methods**:
  - `initializeSamlStrategy()`: Configures passport-saml strategy
  - `generateSamlRequest()`: Creates SAML AuthnRequest
  - `processSamlResponse()`: Validates and processes SAML Response
  - `extractUserFromProfile()`: Maps SAML attributes to user data

#### 2. SSO Controller Endpoints (`src/auth/auth.controller.ts`)
- **POST /portal/auth/sso/login**: Initiates SSO flow
- **POST /portal/auth/sso/callback**: Processes SAML Response

#### 3. JWT Service Integration (`src/jwt/jwt.service.ts`)
- Enhanced to support SSO-specific claims
- Generates both classical and post-quantum cryptographic tokens
- Includes `authMethod: 'sso'` claim for SSO sessions

### Frontend Components

#### 1. Login Component (`src/pages/Login.tsx`)
- SSO login button with accessibility compliance
- Loading states and error handling
- Redirect to IdP with proper RelayState handling

#### 2. SSO Callback Component (`src/components/auth/SsoCallback.tsx`)
- Processes SAML Response from IdP
- Token storage and user session establishment
- Error handling and retry mechanisms

#### 3. Protected Route Enhancement (`src/components/auth/ProtectedRoute.tsx`)
- SSO token validation and refresh
- SSO-specific error handling and logging

## Configuration

### Identity Provider Setup

#### Required SAML Configuration
```json
{
  "entityId": "https://your-portal.com/saml/metadata",
  "assertionConsumerServiceURL": "https://your-portal.com/portal/auth/sso/callback",
  "singleLogoutServiceURL": "https://your-portal.com/portal/auth/sso/logout",
  "nameIdFormat": "urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress",
  "signatureAlgorithm": "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
}
```

#### Required SAML Attributes
- `email` (required): User's email address
- `firstName` (optional): User's first name
- `lastName` (optional): User's last name
- `roles` (optional): User's roles/groups

### AWS Secrets Manager Configuration

Store IdP credentials securely in AWS Secrets Manager:

```json
{
  "entryPoint": "https://idp.example.com/sso/saml",
  "issuer": "https://your-portal.com",
  "cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  "callbackUrl": "https://your-portal.com/portal/auth/sso/callback"
}
```

### Environment Variables
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# SSO Configuration
SSO_SECRET_NAME=sso-credentials
SSO_ENABLED=true
```

## Testing

### Unit Tests
Run SSO service unit tests:
```bash
cd src/portal/portal-backend
npm test -- --testPathPatterns=sso.service.spec.ts
```

### Integration Tests
Run complete SSO flow tests:
```bash
cd src/portal/portal-frontend
npm test -- --testPathPatterns=SsoIntegration.test.tsx
```

### Manual Testing with Sandbox IdP

#### Using Okta Developer Account
1. Create free Okta developer account
2. Configure SAML application with portal endpoints
3. Download IdP certificate and metadata
4. Test complete authentication flow

#### Test Scenarios
- [ ] Successful SSO login with valid credentials
- [ ] SSO login failure with invalid credentials
- [ ] Token refresh for SSO sessions
- [ ] RelayState preservation during authentication
- [ ] Accessibility compliance (keyboard navigation, screen readers)
- [ ] Mobile device compatibility

## Security Features

### CSRF Protection
- Request ID validation prevents replay attacks
- RelayState parameter validation
- SAML Response signature verification

### Token Security
- JWT tokens include SSO-specific claims
- Hybrid cryptographic approach (classical + PQC)
- Secure token storage and transmission

### Session Management
- SSO session timeout handling
- Automatic token refresh
- Secure logout with IdP notification

## Troubleshooting Guide

### Common Issues

#### 1. SAML Response Validation Failures
**Symptoms**: "Invalid SAML response" errors
**Causes**:
- Incorrect IdP certificate configuration
- Clock skew between portal and IdP
- Malformed SAML Response

**Solutions**:
```bash
# Check IdP certificate
openssl x509 -in idp-cert.pem -text -noout

# Verify SAML Response structure
echo "base64-saml-response" | base64 -d | xmllint --format -
```

#### 2. AWS Secrets Manager Access Issues
**Symptoms**: "Unable to retrieve SSO credentials" errors
**Causes**:
- Incorrect AWS credentials
- Missing IAM permissions
- Wrong secret name/region

**Solutions**:
```bash
# Test AWS access
aws secretsmanager get-secret-value --secret-id sso-credentials

# Verify IAM permissions
aws iam get-user
```

#### 3. Token Refresh Failures
**Symptoms**: Frequent re-authentication required
**Causes**:
- Expired refresh tokens
- SSO session timeout at IdP
- Network connectivity issues

**Solutions**:
- Check IdP session timeout settings
- Verify refresh token expiration
- Implement proper error handling

### Failover and Recovery

#### IdP Unavailability
When the Identity Provider is unreachable:

1. **Detection**: Monitor IdP health with periodic checks
2. **Fallback**: Redirect users to standard login form
3. **User Communication**: Display clear error message
4. **Retry Logic**: Implement exponential backoff for IdP requests

```typescript
// Example failover implementation
const handleIdPFailure = async () => {
  try {
    // Attempt SSO login
    await initiateSSOLogin();
  } catch (error) {
    if (error.code === 'IDP_UNREACHABLE') {
      // Fallback to standard authentication
      redirectToStandardLogin();
      showNotification('SSO temporarily unavailable. Please use standard login.');
    }
  }
};
```

#### Malformed SAML Response
When IdP returns invalid SAML Response:

1. **Validation**: Strict SAML Response schema validation
2. **Logging**: Detailed error logging for debugging
3. **User Feedback**: Clear error message with retry option
4. **Escalation**: Alert administrators for persistent issues

```typescript
// Example error handling
const processSamlResponse = async (samlResponse: string) => {
  try {
    validateSamlSchema(samlResponse);
    return await parseSamlResponse(samlResponse);
  } catch (error) {
    logger.error('Malformed SAML Response', { error, samlResponse });
    throw new Error('Authentication failed. Please try again or contact support.');
  }
};
```

#### Network Connectivity Issues
Handle network failures gracefully:

1. **Timeout Configuration**: Set appropriate timeouts for IdP requests
2. **Retry Strategy**: Implement retry logic with circuit breaker pattern
3. **Offline Detection**: Detect network connectivity issues
4. **User Guidance**: Provide clear instructions for network issues

### Monitoring and Alerting

#### Key Metrics
- SSO login success/failure rates
- SAML Response validation errors
- Token refresh failures
- IdP response times

#### Alert Conditions
- SSO failure rate > 5%
- IdP response time > 5 seconds
- AWS Secrets Manager access failures
- Certificate expiration warnings

## Maintenance

### Certificate Management
- Monitor IdP certificate expiration
- Implement automated certificate renewal
- Test certificate updates in staging environment

### Performance Optimization
- Cache IdP metadata and certificates
- Implement connection pooling for IdP requests
- Monitor and optimize SAML processing times

### Security Updates
- Regular security audits of SAML implementation
- Keep passport-saml library updated
- Monitor security advisories for SAML vulnerabilities

## Support and Documentation

### Additional Resources
- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/v2.0/)
- [passport-saml Documentation](https://github.com/node-saml/passport-saml)
- [AWS Secrets Manager Guide](https://docs.aws.amazon.com/secretsmanager/)

### Contact Information
For SSO-related issues:
- Technical Support: support@quantum-safe-portal.com
- Security Issues: security@quantum-safe-portal.com
- Documentation Updates: docs@quantum-safe-portal.com
