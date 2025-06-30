# Frontend Auth & Consent Flow Debugging Guide

## Common Issues and Solutions

### JWT Token Issues

#### Token Decode Failures
- **Symptom**: JWT decode returns null or throws errors
- **Cause**: Malformed token, expired token, or incorrect secret
- **Solution**: Check token format, verify expiration, ensure backend JWT secret matches

#### Token Expiration Handling
- **Symptom**: User gets logged out unexpectedly
- **Cause**: Access token expired without proper refresh
- **Solution**: Implement automatic token refresh in API interceptor

#### PQC Token Validation
- **Symptom**: PQC-enhanced tokens fail validation
- **Cause**: Backend PQC signature verification failing
- **Solution**: Verify PQC FFI integration, check algorithm compatibility

### Authentication Flow Edge Cases

#### Login Form Validation
- **Symptom**: Form submission fails with validation errors
- **Cause**: Email/password format issues, missing required fields
- **Solution**: Check DTO validation rules, ensure proper input sanitization

#### Redirect After Login
- **Symptom**: User not redirected to intended page after login
- **Cause**: Location state not preserved or invalid redirect URL
- **Solution**: Verify React Router location state handling

#### Remember Me Functionality
- **Symptom**: Remember me checkbox not working
- **Cause**: Refresh token not being set or stored properly
- **Solution**: Check cookie settings, verify backend refresh token logic

### Consent Management Issues

#### Consent State Synchronization
- **Symptom**: UI shows incorrect consent status
- **Cause**: Context state not updated after API calls
- **Solution**: Ensure consent context updates after successful API responses

#### Required Consent Handling
- **Symptom**: Users can deny required consents
- **Cause**: UI not properly disabling required consent toggles
- **Solution**: Check consent option configuration, verify required flag handling

#### Consent Submission Errors
- **Symptom**: Consent updates fail with 400/422 errors
- **Cause**: Invalid payload format or missing required fields
- **Solution**: Verify DTO structure matches backend expectations

### API Integration Issues

#### CORS Errors
- **Symptom**: Browser blocks API requests
- **Cause**: Backend CORS configuration not allowing frontend origin
- **Solution**: Update backend CORS settings for development/production

#### Network Timeouts
- **Symptom**: API requests timeout or fail
- **Cause**: Backend services not running or network issues
- **Solution**: Verify backend services are running, check network connectivity

#### Authentication Headers
- **Symptom**: 401 errors on authenticated endpoints
- **Cause**: JWT token not being sent in Authorization header
- **Solution**: Check API client interceptor configuration

## Debugging Tools

### Browser DevTools
- Network tab: Monitor API requests/responses
- Console: Check for JavaScript errors
- Application tab: Inspect localStorage/cookies
- React DevTools: Examine component state

### Backend Logs
- Check NestJS application logs for authentication errors
- Monitor PQC service logs for cryptographic operation failures
- Review JWT service logs for token generation/validation issues

### Testing Commands
```bash
# Run frontend tests
pnpm test

# Run PQC FFI verification tests
pnpm test ffi-verification

# Start development server with debugging
pnpm dev --debug
```

## Error Codes Reference

### Authentication Errors
- **400**: Bad Request - Invalid login credentials format
- **401**: Unauthorized - Invalid credentials or expired token
- **403**: Forbidden - Account locked or insufficient permissions
- **409**: Conflict - User already exists (registration)
- **429**: Too Many Requests - Rate limiting triggered

### Consent Errors
- **400**: Bad Request - Invalid consent data format
- **401**: Unauthorized - JWT token required
- **404**: Not Found - User or consent record not found
- **422**: Unprocessable Entity - Validation errors

## Performance Monitoring

### Key Metrics
- Login response time (target: <2s)
- Consent update response time (target: <1s)
- JWT token validation time (target: <100ms)
- PQC operation time (target: <5s)

### Monitoring Tools
- Browser Performance tab
- Network waterfall analysis
- React Profiler for component rendering
