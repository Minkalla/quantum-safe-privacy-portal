# PQC System Data Flow Guide

**Document ID**: PQC-SYSTEM-DATA-FLOW-v1.0  
**Created**: June 30, 2025  
**Purpose**: Comprehensive guide to data flows and integration patterns in the PQC system  
**Scope**: Complete system architecture from frontend to cryptographic operations

## Executive Summary

This document provides a comprehensive guide to understanding data flows, integration patterns, and system architecture in the Quantum-Safe Privacy Portal. It serves as a critical reference for future engineers to understand how data moves through the system and how components interact.

## 🔄 **CORE DATA FLOW ARCHITECTURE**

### 1. Authentication Data Flow

```
Frontend Request → Portal Backend → AuthService → callPythonPQCService → QynAuth Python Service → Rust PQC Library → NIST Algorithms
```

**Detailed Flow**:
1. **Frontend Authentication Request**: User submits credentials via React frontend
2. **Portal Backend Processing**: NestJS backend receives request at `/auth/login` endpoint
3. **AuthService Invocation**: `AuthService.authenticateUser()` method called
4. **Python Service Call**: `callPythonPQCService('sign_token', payload)` executed
5. **QynAuth Processing**: Python FastAPI service processes authentication
6. **Rust FFI Bridge**: Python calls Rust library via FFI for PQC operations
7. **NIST Algorithm Execution**: ML-KEM-768 or ML-DSA-65 operations performed
8. **Response Chain**: Results flow back through the same chain in reverse

**Critical Integration Points**:
- **Parameter Conversion**: JavaScript camelCase → Python snake_case
- **Error Handling**: Each layer has specific error handling patterns
- **Performance Monitoring**: Timing tracked at each integration point
- **Security Validation**: Input sanitization at multiple layers

### 2. Data Encryption Flow

```
Data Input → PQCDataEncryptionService → AuthService → Python PQC Service → Encrypted Output
```

**Detailed Flow**:
1. **Data Input**: Raw data submitted for encryption
2. **Service Validation**: `PQCDataEncryptionService.encryptData()` validates input
3. **Algorithm Selection**: Kyber-768 or ML-KEM-768 algorithm chosen
4. **Key Generation**: Real PQC key generation via `callPythonPQCService`
5. **Encryption Operation**: Actual quantum-safe encryption performed
6. **Result Packaging**: Encrypted data packaged with metadata
7. **Performance Metrics**: Timing and memory usage recorded

**Data Structure Flow**:
```typescript
Input: { data: string, options: EncryptionOptions }
↓
Processing: { algorithm: 'Kyber-768', keyId: string, timestamp: Date }
↓
Output: { success: boolean, encryptedField: EncryptedField, performanceMetrics: Metrics }
```

### 3. Data Validation Flow

```
Data + Signature → PQCDataValidationService → AuthService → Python PQC Service → Validation Result
```

**Detailed Flow**:
1. **Signature Generation**: `generateSignature()` creates ML-DSA-65 signatures
2. **Data Hash Creation**: SHA-256 hash generated for data integrity
3. **PQC Signing**: Real Dilithium-3 signature via `callPythonPQCService`
4. **Signature Verification**: `verifySignature()` validates authenticity
5. **Integrity Checking**: Complete data integrity validation
6. **Result Compilation**: Comprehensive validation results returned

## 🏗️ **SYSTEM ARCHITECTURE PATTERNS**

### 1. Service Layer Architecture

```
Controllers → Services → AuthService → Python Bridge → Rust Library
```

**Layer Responsibilities**:
- **Controllers**: HTTP request handling, input validation, response formatting
- **Services**: Business logic, data processing, orchestration
- **AuthService**: PQC operations coordination, Python service communication
- **Python Bridge**: Language bridge, parameter conversion, error handling
- **Rust Library**: Core cryptographic operations, NIST algorithm implementation

### 2. Dependency Injection Pattern

```typescript
@Injectable()
export class PQCDataEncryptionService {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,  // Critical dependency
  ) {}
}
```

**Critical Dependencies**:
- **ConfigService**: Configuration management
- **AuthService**: PQC operations provider
- **Logger**: Comprehensive logging throughout system

### 3. Error Handling Architecture

```
Try/Catch → Service Error → Python Error → Rust Error → NIST Error
```

**Error Flow Patterns**:
1. **Service Level**: Business logic error handling
2. **Integration Level**: Python service communication errors
3. **FFI Level**: Foreign function interface errors
4. **Cryptographic Level**: NIST algorithm errors
5. **System Level**: Infrastructure and resource errors

## 🔧 **INTEGRATION PATTERNS**

### 1. Python Service Integration

**Method**: `callPythonPQCService(operation: string, payload: any)`

**Operations Supported**:
- `generate_session_key`: ML-KEM-768 key generation
- `sign_token`: ML-DSA-65 signature generation
- `verify_token`: ML-DSA-65 signature verification
- `get_status`: Service health checking

**Parameter Patterns**:
```typescript
// JavaScript (camelCase)
{ userId: 'user123', sessionData: {...} }

// Converted to Python (snake_case)
{ user_id: 'user123', session_data: {...} }
```

### 2. Real-Time Performance Monitoring

**Monitoring Points**:
- **Request Initiation**: Timestamp and request ID
- **Service Entry**: Service method entry timing
- **Python Call**: FFI bridge timing
- **Cryptographic Operation**: Core algorithm timing
- **Response Assembly**: Result packaging timing

**Performance Metrics Structure**:
```typescript
interface PerformanceMetrics {
  encryptionTime: number;    // Milliseconds
  keySize: number;           // Bytes
  memoryUsage: number;       // Bytes
  operationCount: number;    // Operations performed
}
```

### 3. Security Validation Patterns

**Input Sanitization**:
1. **Parameter Validation**: Type checking and format validation
2. **Command Injection Prevention**: Secure subprocess execution
3. **Memory Safety**: Proper buffer management
4. **Timing Attack Protection**: Constant-time operations

## 📊 **DATA STRUCTURES AND INTERFACES**

### 1. Core PQC Interfaces

```typescript
interface PQCEncryptedField {
  encryptedData: string;     // Base64 encoded ciphertext
  algorithm: string;         // 'Kyber-768' or 'ML-KEM-768'
  keyId: string;            // Unique key identifier
  timestamp: Date;          // Encryption timestamp
}

interface PQCSignature {
  signature: string;        // 'dilithium3:' prefixed signature
  algorithm: string;        // 'Dilithium-3' or 'ML-DSA-65'
  publicKeyHash: string;    // SHA-256 hash of public key
  timestamp: Date;          // Signature timestamp
  signedDataHash: string;   // SHA-256 hash of signed data
}
```

### 2. Service Response Patterns

```typescript
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  performanceMetrics?: PerformanceMetrics;
  timestamp: Date;
}
```

### 3. Configuration Patterns

**Environment Variables**:
- `PQC_SERVICE_URL`: Python service endpoint
- `PQC_TIMEOUT`: Operation timeout in milliseconds
- `PQC_ALGORITHM_PREFERENCE`: Default algorithm selection

## 🚀 **PERFORMANCE OPTIMIZATION PATTERNS**

### 1. Caching Strategies

**Key Caching**:
- **Session Keys**: Cached for session duration
- **Public Keys**: Cached with TTL
- **Algorithm Parameters**: Cached indefinitely

**Cache Invalidation**:
- **Time-based**: TTL expiration
- **Event-based**: Security events trigger invalidation
- **Manual**: Administrative cache clearing

### 2. Connection Pooling

**Python Service Connections**:
- **Pool Size**: Configurable connection pool
- **Health Checking**: Regular connection validation
- **Failover**: Automatic connection recovery

### 3. Batch Processing

**Bulk Operations**:
- **Encryption Batching**: Multiple items in single call
- **Signature Batching**: Batch signature generation
- **Validation Batching**: Bulk validation operations

## 🔒 **SECURITY PATTERNS**

### 1. Key Management

**Key Lifecycle**:
1. **Generation**: Secure random key generation
2. **Storage**: Encrypted key storage
3. **Rotation**: Automatic key rotation
4. **Destruction**: Secure key deletion

### 2. Audit Trail

**Logging Patterns**:
- **Operation Logging**: All PQC operations logged
- **Performance Logging**: Timing and resource usage
- **Error Logging**: Comprehensive error tracking
- **Security Logging**: Security events and violations

### 3. Compliance Validation

**NIST Compliance**:
- **Algorithm Validation**: NIST test vector compliance
- **Parameter Validation**: NIST parameter compliance
- **Performance Validation**: NIST performance requirements

## 🧪 **TESTING PATTERNS**

### 1. Real PQC Testing

**No Mocks Policy**:
- **Unit Tests**: Real service calls only
- **Integration Tests**: End-to-end real operations
- **Performance Tests**: Actual timing measurements
- **Security Tests**: Real cryptographic validation

### 2. Test Data Management

**Test Fixtures**:
- **Real Keys**: Generated for each test run
- **Real Signatures**: Authentic cryptographic signatures
- **Real Encrypted Data**: Actual encrypted test data

### 3. Performance Testing

**Benchmark Patterns**:
- **NIST Thresholds**: Kyber-768 <100ms, Dilithium-3 <200ms
- **Load Testing**: Concurrent operation validation
- **Memory Testing**: Memory leak detection
- **Throughput Testing**: Operations per second measurement

## 🔄 **DEPLOYMENT PATTERNS**

### 1. Service Orchestration

**Docker Composition**:
- **Portal Backend**: NestJS application
- **QynAuth Service**: Python FastAPI service
- **MongoDB**: Database service
- **Network Configuration**: Service communication

### 2. Health Monitoring

**Health Checks**:
- **Service Health**: Individual service status
- **Integration Health**: Cross-service communication
- **Performance Health**: Performance threshold monitoring
- **Security Health**: Security compliance monitoring

### 3. Rollback Strategies

**Deployment Safety**:
- **Blue-Green Deployment**: Zero-downtime deployment
- **Canary Releases**: Gradual rollout
- **Automatic Rollback**: Performance-triggered rollback
- **Manual Rollback**: Administrative rollback capability

## 📚 **TROUBLESHOOTING PATTERNS**

### 1. Common Integration Issues

**Parameter Mismatch**:
- **Symptom**: "Cannot read properties of undefined"
- **Cause**: camelCase/snake_case conversion issues
- **Solution**: Verify parameter naming conventions

**Service Communication**:
- **Symptom**: Connection refused errors
- **Cause**: Service not running or network issues
- **Solution**: Check service status and network configuration

### 2. Performance Issues

**Slow Operations**:
- **Symptom**: Operations exceeding NIST thresholds
- **Cause**: Resource contention or algorithm issues
- **Solution**: Performance profiling and optimization

**Memory Leaks**:
- **Symptom**: Increasing memory usage over time
- **Cause**: Improper resource cleanup
- **Solution**: Memory profiling and resource management

### 3. Security Issues

**Authentication Failures**:
- **Symptom**: Invalid signature errors
- **Cause**: Key mismatch or algorithm issues
- **Solution**: Key validation and algorithm verification

**Timing Attacks**:
- **Symptom**: Variable operation timing
- **Cause**: Non-constant-time operations
- **Solution**: Constant-time algorithm implementation

## 🎯 **FUTURE ENHANCEMENT PATTERNS**

### 1. Algorithm Upgrades

**NIST Algorithm Updates**:
- **Version Management**: Algorithm version tracking
- **Migration Strategies**: Smooth algorithm transitions
- **Backward Compatibility**: Legacy algorithm support

### 2. Performance Improvements

**Optimization Opportunities**:
- **Hardware Acceleration**: GPU/FPGA acceleration
- **Algorithm Optimization**: Implementation improvements
- **Caching Enhancement**: Advanced caching strategies

### 3. Security Enhancements

**Advanced Security**:
- **Multi-Factor Authentication**: Enhanced authentication
- **Zero-Knowledge Proofs**: Privacy enhancements
- **Homomorphic Encryption**: Computation on encrypted data

---

**Document Maintenance**: This document should be updated whenever significant changes are made to data flows, integration patterns, or system architecture. Future engineers MUST enhance this document with new insights and patterns discovered during development.

**Next Review**: Upon any major system changes or architectural updates

**Critical for Success**: Understanding these data flows and patterns is essential for maintaining and enhancing the PQC system. This document serves as the foundation for all future development work.
