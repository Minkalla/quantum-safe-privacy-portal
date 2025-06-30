# Consent Form Component Documentation

## Overview
The ConsentForm component provides a comprehensive interface for managing user privacy preferences in the Quantum-Safe Privacy Portal. It supports granular consent management with real-time updates and PQC-enhanced security.

## Features

### Consent Types Supported
1. **Data Processing** (Required) - Core platform functionality
2. **Analytics & Performance** (Optional) - Usage analytics
3. **Marketing Communications** (Optional) - Feature updates
4. **Cookies & Tracking** (Optional) - Enhanced user experience
5. **Third-Party Sharing** (Optional) - Security research partnerships

### UX Design Principles
- **Clear Information**: Each consent type has descriptive text
- **Visual Feedback**: Color-coded allow/deny buttons
- **Loading States**: Spinner during API calls
- **Error Handling**: User-friendly error messages
- **Required Indicators**: Clear marking of mandatory consents

### API Payload Structure

#### Create/Update Consent Request
```typescript
{
  userId: string;           // User identifier (24-char MongoDB ObjectId)
  consentType: ConsentType; // Enum value
  granted: boolean;         // Consent decision
  ipAddress?: string;       // Optional IP for audit trail
  userAgent?: string;       // Browser info for audit trail
}
```

#### Response Format
```typescript
{
  consentId: string;        // Unique consent record ID
  userId: string;           // User identifier
  consentType: ConsentType; // Consent type
  granted: boolean;         // Consent status
  ipAddress?: string;       // IP address if provided
  userAgent?: string;       // User agent if provided
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}
```

### Error Handling

#### Validation Errors (400/422)
- Invalid userId format (must be 24-char hex)
- Missing required fields
- Invalid consentType enum value
- Invalid boolean for granted field

#### Authentication Errors (401)
- Missing JWT token
- Expired JWT token
- Invalid JWT signature

#### Authorization Errors (403)
- User not authorized to update consent
- Account locked or suspended

#### Server Errors (500)
- Database connection issues
- PQC service unavailable
- Internal server errors

### State Management

#### Local State
- `pendingUpdates`: Set of consent types being updated
- Form validation state
- Error display state

#### Context State
- `consentState`: Current consent preferences
- `consents`: Full consent records with metadata
- `isLoading`: Global loading state
- `error`: Current error state

### Accessibility Features

#### WCAG 2.1 AA Compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast color scheme
- Focus indicators
- Semantic HTML structure

#### Interactive Elements
- Button states clearly indicated
- Loading states announced
- Error messages associated with controls
- Required field indicators

### Performance Optimizations

#### API Efficiency
- Debounced updates to prevent rapid-fire requests
- Optimistic UI updates with rollback on error
- Minimal payload size
- Request deduplication

#### Rendering Optimization
- Memoized consent options
- Conditional rendering for pending states
- Efficient re-renders on state changes

### Security Features

#### PQC Integration
- All consent updates protected by PQC-enhanced JWT
- Audit trail with IP and user agent tracking
- Secure transmission over HTTPS
- Server-side validation and sanitization

#### Privacy Protection
- No sensitive data in client-side logs
- Secure token handling
- GDPR-compliant data processing
- User control over all data sharing

### Testing Considerations

#### Unit Tests
- Component rendering with different consent states
- Button click handlers
- Error state display
- Loading state behavior

#### Integration Tests
- API call success/failure scenarios
- Context state updates
- Error boundary behavior
- Accessibility compliance

#### E2E Tests
- Complete consent flow
- Required consent enforcement
- Error recovery
- Cross-browser compatibility

### Browser Compatibility
- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Mobile responsive design
- Progressive enhancement
- Graceful degradation for older browsers

### Monitoring and Analytics
- Consent update success/failure rates
- User interaction patterns
- Performance metrics
- Error frequency and types
