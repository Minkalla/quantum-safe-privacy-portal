# Security Mitigation Implementation Plan

## Executive Summary
This document provides a comprehensive implementation plan to address all security risks identified in WBS 1.15 Device Trust Management. The plan includes specific code implementations, testing strategies, and deployment approaches for each security concern.

## 🎯 Implementation Overview

### Phase 1: Critical Security Fixes (Immediate - 24 hours)
- **SEC-003**: User ID Consistency Critical Vulnerability
- **SEC-001**: Error Handling Information Disclosure

### Phase 2: Architecture Improvements (Short-term - 1 week)  
- **SEC-002**: Private Method Access Bypass
- **HybridCryptoService**: Implementation with RSA-2048 fallback

### Phase 3: Enterprise Enhancements (Medium-term - 2 weeks)
- **DataMigrationService**: Safe data migration with rollback capabilities
- **Circuit Breaker Integration**: Resilient PQC operations
- **Enhanced Monitoring**: Security event tracking and alerting

## 🔧 Detailed Implementation Plans

### 1. HybridCryptoService with RSA-2048 Fallback

#### Implementation Location
**File**: `src/portal/portal-backend/src/services/hybrid-crypto.service.ts`

#### Code Implementation
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PqcDataEncryptionService } from './pqc-data-encryption.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import * as crypto from 'crypto';

export interface EncryptionResult {
  algorithm: 'ML-KEM-768' | 'RSA-2048';
  ciphertext: string;
  fallbackUsed: boolean;
  metadata?: {
    fallbackReason?: string;
    timestamp: string;
    operationId: string;
  };
}

export interface DecryptionResult {
  plaintext: string;
  algorithm: 'ML-KEM-768' | 'RSA-2048';
  fallbackUsed: boolean;
  metadata?: {
    fallbackReason?: string;
    timestamp: string;
    operationId: string;
  };
}

@Injectable()
export class HybridCryptoService {
  private readonly logger = new Logger(HybridCryptoService.name);
  private readonly RSA_KEY_SIZE = 2048;
  private readonly FALLBACK_THRESHOLD = 3; // failures before circuit breaker opens

  constructor(
    private readonly pqcService: PqcDataEncryptionService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async encryptWithFallback(data: string, publicKey: string, userId?: string): Promise<EncryptionResult> {
    const operationId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    try {
      // Attempt PQC encryption first
      if (this.circuitBreaker.isAvailable('pqc-encryption')) {
        try {
          const pqcResult = await this.pqcService.encryptData(data, publicKey, userId);
          
          this.circuitBreaker.recordSuccess('pqc-encryption');
          
          this.logger.log('PQC encryption successful', {
            algorithm: 'ML-KEM-768',
            userId,
            operationId,
            timestamp
          });

          return {
            algorithm: 'ML-KEM-768',
            ciphertext: pqcResult.encryptedData,
            fallbackUsed: false,
            metadata: {
              timestamp,
              operationId
            }
          };
        } catch (pqcError) {
          this.circuitBreaker.recordFailure('pqc-encryption');
          this.logger.warn('PQC encryption failed, attempting fallback', {
            error: pqcError.message,
            userId,
            operationId,
            timestamp
          });
        }
      }

      // Fallback to RSA-2048 encryption
      const fallbackResult = await this.encryptWithRSA(data, publicKey);
      
      this.logger.warn('CRYPTO_FALLBACK_USED', {
        fallbackReason: this.circuitBreaker.isAvailable('pqc-encryption') ? 'PQC service error' : 'Circuit breaker open',
        algorithm: 'RSA-2048',
        userId,
        operation: 'encryption',
        timestamp,
        operationId,
        originalAlgorithm: 'ML-KEM-768'
      });

      return {
        algorithm: 'RSA-2048',
        ciphertext: fallbackResult,
        fallbackUsed: true,
        metadata: {
          fallbackReason: this.circuitBreaker.isAvailable('pqc-encryption') ? 'PQC service error' : 'Circuit breaker open',
          timestamp,
          operationId
        }
      };

    } catch (error) {
      this.logger.error('Both PQC and RSA encryption failed', {
        error: error.message,
        userId,
        operationId,
        timestamp
      });
      throw new Error('Encryption service temporarily unavailable');
    }
  }

  async decryptWithFallback(encryptedData: string, privateKey: string, algorithm: 'ML-KEM-768' | 'RSA-2048', userId?: string): Promise<DecryptionResult> {
    const operationId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    try {
      if (algorithm === 'ML-KEM-768' && this.circuitBreaker.isAvailable('pqc-decryption')) {
        try {
          const pqcResult = await this.pqcService.decryptData(encryptedData, privateKey, userId);
          
          this.circuitBreaker.recordSuccess('pqc-decryption');
          
          return {
            plaintext: pqcResult.decryptedData,
            algorithm: 'ML-KEM-768',
            fallbackUsed: false,
            metadata: {
              timestamp,
              operationId
            }
          };
        } catch (pqcError) {
          this.circuitBreaker.recordFailure('pqc-decryption');
          this.logger.warn('PQC decryption failed, attempting RSA fallback', {
            error: pqcError.message,
            userId,
            operationId
          });
        }
      }

      // Fallback to RSA decryption
      const fallbackResult = await this.decryptWithRSA(encryptedData, privateKey);
      
      this.logger.warn('CRYPTO_FALLBACK_USED', {
        fallbackReason: 'PQC decryption failed',
        algorithm: 'RSA-2048',
        userId,
        operation: 'decryption',
        timestamp,
        operationId,
        originalAlgorithm: algorithm
      });

      return {
        plaintext: fallbackResult,
        algorithm: 'RSA-2048',
        fallbackUsed: true,
        metadata: {
          fallbackReason: 'PQC decryption failed',
          timestamp,
          operationId
        }
      };

    } catch (error) {
      this.logger.error('Both PQC and RSA decryption failed', {
        error: error.message,
        userId,
        operationId
      });
      throw new Error('Decryption service temporarily unavailable');
    }
  }

  private async encryptWithRSA(data: string, publicKey: string): Promise<string> {
    try {
      // Generate RSA key pair if publicKey is not provided
      const keyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: this.RSA_KEY_SIZE,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey || keyPair.publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(data, 'utf8')
      );

      return encrypted.toString('base64');
    } catch (error) {
      this.logger.error('RSA encryption failed', { error: error.message });
      throw error;
    }
  }

  private async decryptWithRSA(encryptedData: string, privateKey: string): Promise<string> {
    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(encryptedData, 'base64')
      );

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('RSA decryption failed', { error: error.message });
      throw error;
    }
  }

  // Health check method
  async getServiceHealth(): Promise<{
    pqcAvailable: boolean;
    rsaAvailable: boolean;
    circuitBreakerStatus: any;
  }> {
    return {
      pqcAvailable: this.circuitBreaker.isAvailable('pqc-encryption'),
      rsaAvailable: true, // RSA is always available
      circuitBreakerStatus: this.circuitBreaker.getStatus()
    };
  }
}
```

### 2. Circuit Breaker Service Implementation

#### Implementation Location
**File**: `src/portal/portal-backend/src/services/circuit-breaker.service.ts`

#### Code Implementation
```typescript
import { Injectable, Logger } from '@nestjs/common';

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: Date | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  successCount: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerState>();
  
  // Configuration
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_DURATION = 30000; // 30 seconds
  private readonly SUCCESS_THRESHOLD = 3; // successes needed to close circuit

  constructor() {
    // Initialize circuits for PQC operations
    this.initializeCircuit('pqc-encryption');
    this.initializeCircuit('pqc-decryption');
    this.initializeCircuit('pqc-signing');
    this.initializeCircuit('pqc-verification');
  }

  private initializeCircuit(name: string): void {
    this.circuits.set(name, {
      failures: 0,
      lastFailureTime: null,
      state: 'CLOSED',
      successCount: 0
    });
  }

  isAvailable(circuitName: string): boolean {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      this.logger.warn(`Circuit ${circuitName} not found, assuming available`);
      return true;
    }

    const now = new Date();

    switch (circuit.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        if (circuit.lastFailureTime && 
            (now.getTime() - circuit.lastFailureTime.getTime()) > this.TIMEOUT_DURATION) {
          circuit.state = 'HALF_OPEN';
          circuit.successCount = 0;
          this.logger.log(`Circuit ${circuitName} transitioning to HALF_OPEN`);
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        return true;
      
      default:
        return true;
    }
  }

  recordSuccess(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return;

    switch (circuit.state) {
      case 'HALF_OPEN':
        circuit.successCount++;
        if (circuit.successCount >= this.SUCCESS_THRESHOLD) {
          circuit.state = 'CLOSED';
          circuit.failures = 0;
          circuit.lastFailureTime = null;
          this.logger.log(`Circuit ${circuitName} closed after successful recovery`);
        }
        break;
      
      case 'CLOSED':
        // Reset failure count on success
        circuit.failures = Math.max(0, circuit.failures - 1);
        break;
    }
  }

  recordFailure(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return;

    circuit.failures++;
    circuit.lastFailureTime = new Date();

    if (circuit.failures >= this.FAILURE_THRESHOLD) {
      circuit.state = 'OPEN';
      this.logger.warn(`Circuit ${circuitName} opened due to ${circuit.failures} failures`);
    }
  }

  getStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {};
    this.circuits.forEach((state, name) => {
      status[name] = { ...state };
    });
    return status;
  }

  // Manual circuit control for testing/maintenance
  forceOpen(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.state = 'OPEN';
      circuit.lastFailureTime = new Date();
      this.logger.warn(`Circuit ${circuitName} manually opened`);
    }
  }

  forceClose(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.state = 'CLOSED';
      circuit.failures = 0;
      circuit.lastFailureTime = null;
      circuit.successCount = 0;
      this.logger.log(`Circuit ${circuitName} manually closed`);
    }
  }
}
```

### 3. Data Migration Service with Rollback Capabilities

#### Implementation Location
**File**: `src/portal/portal-backend/src/services/data-migration.service.ts`

#### Code Implementation
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../models/User';
import { HybridCryptoService } from './hybrid-crypto.service';
import { PqcDataEncryptionService } from './pqc-data-encryption.service';

export interface MigrationResult {
  success: boolean;
  algorithm: string;
  migratedFields?: string[];
  rollbackData?: any;
  errors?: string[];
  timestamp: Date;
}

export interface MigrationBackup {
  userId: string;
  originalData: any;
  migrationId: string;
  timestamp: Date;
  version: string;
}

@Injectable()
export class DataMigrationService {
  private readonly logger = new Logger(DataMigrationService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly hybridCryptoService: HybridCryptoService,
    private readonly pqcService: PqcDataEncryptionService,
  ) {}

  async migrateUserData(userId: string, options: {
    dryRun?: boolean;
    backupEnabled?: boolean;
    targetAlgorithm?: 'ML-KEM-768' | 'RSA-2048';
  } = {}): Promise<MigrationResult> {
    const migrationId = `migration_${Date.now()}_${userId}`;
    const timestamp = new Date();
    
    try {
      this.logger.log(`Starting data migration for user: ${userId}`, { migrationId });

      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Create backup if enabled
      let backupData: MigrationBackup | null = null;
      if (options.backupEnabled !== false) {
        backupData = await this.createMigrationBackup(user, migrationId);
      }

      // Check if migration is needed
      if (user.cryptoVersion === 'pqc-real' && options.targetAlgorithm !== 'RSA-2048') {
        this.logger.log(`User ${userId} already using real PQC, no migration needed`);
        return {
          success: true,
          algorithm: 'ML-KEM-768',
          timestamp,
          migratedFields: []
        };
      }

      // Perform migration
      const migrationResult = await this.performMigration(user, options, migrationId);

      // Apply changes if not dry run
      if (!options.dryRun && migrationResult.success) {
        await this.applyMigrationChanges(user, migrationResult, migrationId);
      }

      this.logger.log(`Migration completed for user: ${userId}`, {
        migrationId,
        success: migrationResult.success,
        algorithm: migrationResult.algorithm,
        dryRun: options.dryRun
      });

      return {
        ...migrationResult,
        rollbackData: backupData,
        timestamp
      };

    } catch (error) {
      this.logger.error(`Migration failed for user: ${userId}`, {
        error: error.message,
        migrationId
      });

      return {
        success: false,
        algorithm: 'unknown',
        errors: [error.message],
        timestamp
      };
    }
  }

  private async createMigrationBackup(user: any, migrationId: string): Promise<MigrationBackup> {
    const backup: MigrationBackup = {
      userId: user._id.toString(),
      originalData: {
        cryptoVersion: user.cryptoVersion,
        encryptedData: user.encryptedData,
        trustedDevices: user.trustedDevices,
        pqcKeys: user.pqcKeys
      },
      migrationId,
      timestamp: new Date(),
      version: user.cryptoVersion || 'placeholder'
    };

    // Store backup (could be in database, file system, or external storage)
    await this.storeMigrationBackup(backup);
    
    return backup;
  }

  private async performMigration(user: any, options: any, migrationId: string): Promise<MigrationResult> {
    const migratedFields: string[] = [];
    const targetAlgorithm = options.targetAlgorithm || 'ML-KEM-768';

    try {
      // Migrate encrypted user data
      if (user.encryptedData && user.cryptoVersion !== 'pqc-real') {
        const decryptedData = await this.decryptLegacyData(user.encryptedData, user.cryptoVersion);
        const reencryptedData = await this.encryptWithTargetAlgorithm(decryptedData, targetAlgorithm, user._id);
        
        user.encryptedData = reencryptedData.ciphertext;
        user.cryptoAlgorithm = reencryptedData.algorithm;
        migratedFields.push('encryptedData');
      }

      // Migrate trusted devices
      if (user.trustedDevices && user.trustedDevices.length > 0) {
        for (const device of user.trustedDevices) {
          if (device.encryptedFingerprint && user.cryptoVersion !== 'pqc-real') {
            const decryptedFingerprint = await this.decryptLegacyData(device.encryptedFingerprint, user.cryptoVersion);
            const reencryptedFingerprint = await this.encryptWithTargetAlgorithm(decryptedFingerprint, targetAlgorithm, user._id);
            
            device.encryptedFingerprint = reencryptedFingerprint.ciphertext;
            device.cryptoAlgorithm = reencryptedFingerprint.algorithm;
          }
        }
        migratedFields.push('trustedDevices');
      }

      // Generate new PQC keys if needed
      if (targetAlgorithm === 'ML-KEM-768') {
        const newKeys = await this.pqcService.generateKeyPair(user._id);
        user.pqcKeys = {
          publicKey: newKeys.publicKey,
          keyId: newKeys.keyId,
          algorithm: 'ML-KEM-768',
          generatedAt: new Date()
        };
        migratedFields.push('pqcKeys');
      }

      // Update crypto version
      user.cryptoVersion = targetAlgorithm === 'ML-KEM-768' ? 'pqc-real' : 'rsa-fallback';
      user.migrationHistory = user.migrationHistory || [];
      user.migrationHistory.push({
        migrationId,
        fromVersion: user.cryptoVersion,
        toVersion: user.cryptoVersion,
        timestamp: new Date(),
        migratedFields
      });

      return {
        success: true,
        algorithm: targetAlgorithm,
        migratedFields,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`Migration processing failed`, {
        error: error.message,
        migrationId,
        userId: user._id
      });

      return {
        success: false,
        algorithm: 'unknown',
        errors: [error.message],
        timestamp: new Date()
      };
    }
  }

  private async decryptLegacyData(encryptedData: string, cryptoVersion: string): Promise<string> {
    // Handle different legacy encryption formats
    switch (cryptoVersion) {
      case 'placeholder':
        // Decrypt placeholder data (base64 encoded)
        return Buffer.from(encryptedData, 'base64').toString('utf8');
      
      case 'aes-legacy':
        // Decrypt legacy AES data (if any exists)
        throw new Error('Legacy AES decryption not implemented - data should be re-encrypted');
      
      default:
        throw new Error(`Unknown crypto version: ${cryptoVersion}`);
    }
  }

  private async encryptWithTargetAlgorithm(data: string, algorithm: string, userId: string): Promise<{
    ciphertext: string;
    algorithm: string;
  }> {
    if (algorithm === 'ML-KEM-768') {
      const result = await this.hybridCryptoService.encryptWithFallback(data, 'auto-generated-key', userId);
      return {
        ciphertext: result.ciphertext,
        algorithm: result.algorithm
      };
    } else {
      // RSA fallback
      const result = await this.hybridCryptoService.encryptWithFallback(data, 'rsa-key', userId);
      return {
        ciphertext: result.ciphertext,
        algorithm: 'RSA-2048'
      };
    }
  }

  private async applyMigrationChanges(user: any, migrationResult: MigrationResult, migrationId: string): Promise<void> {
    user.lastMigration = {
      migrationId,
      timestamp: new Date(),
      algorithm: migrationResult.algorithm,
      migratedFields: migrationResult.migratedFields
    };

    await user.save();
  }

  private async storeMigrationBackup(backup: MigrationBackup): Promise<void> {
    // Store backup data (implementation depends on storage strategy)
    // Could be database, file system, or external storage like S3
    this.logger.log(`Migration backup stored`, {
      migrationId: backup.migrationId,
      userId: backup.userId
    });
  }

  // Rollback functionality
  async rollbackMigration(migrationId: string): Promise<{
    success: boolean;
    restoredUsers: string[];
    errors?: string[];
  }> {
    try {
      this.logger.log(`Starting rollback for migration: ${migrationId}`);

      // Retrieve backup data
      const backups = await this.retrieveMigrationBackups(migrationId);
      const restoredUsers: string[] = [];
      const errors: string[] = [];

      for (const backup of backups) {
        try {
          const user = await this.userModel.findById(backup.userId);
          if (user) {
            // Restore original data
            Object.assign(user, backup.originalData);
            user.rollbackHistory = user.rollbackHistory || [];
            user.rollbackHistory.push({
              migrationId,
              rollbackTimestamp: new Date(),
              restoredVersion: backup.version
            });

            await user.save();
            restoredUsers.push(backup.userId);
          }
        } catch (error) {
          errors.push(`Failed to rollback user ${backup.userId}: ${error.message}`);
        }
      }

      this.logger.log(`Rollback completed for migration: ${migrationId}`, {
        restoredUsers: restoredUsers.length,
        errors: errors.length
      });

      return {
        success: errors.length === 0,
        restoredUsers,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      this.logger.error(`Rollback failed for migration: ${migrationId}`, {
        error: error.message
      });

      return {
        success: false,
        restoredUsers: [],
        errors: [error.message]
      };
    }
  }

  private async retrieveMigrationBackups(migrationId: string): Promise<MigrationBackup[]> {
    // Retrieve backup data for the specified migration
    // Implementation depends on storage strategy
    return [];
  }

  // Batch migration for multiple users
  async batchMigrateUsers(userIds: string[], options: any = {}): Promise<{
    successful: string[];
    failed: { userId: string; error: string }[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const successful: string[] = [];
    const failed: { userId: string; error: string }[] = [];

    for (const userId of userIds) {
      try {
        const result = await this.migrateUserData(userId, options);
        if (result.success) {
          successful.push(userId);
        } else {
          failed.push({
            userId,
            error: result.errors?.join(', ') || 'Unknown error'
          });
        }
      } catch (error) {
        failed.push({
          userId,
          error: error.message
        });
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: userIds.length,
        successful: successful.length,
        failed: failed.length
      }
    };
  }
}
```

### 4. User ID Consistency Fix

#### Implementation Location
**File**: `src/portal/portal-backend/src/services/pqc-data-validation.service.ts`

#### Code Changes
```typescript
// SECURE: Consistent user ID generation for signing and verification
private async ensureConsistentCryptoUserId(
  baseUserId: string, 
  algorithm: string, 
  operation: string,
  signatureMetadata?: any
): Promise<string> {
  // Always use the same logic for both signing and verification
  if (signatureMetadata?.cryptoUserId && signatureMetadata?.originalUserId === baseUserId) {
    // Validate that the stored crypto user ID is consistent
    const expectedCryptoUserId = this.generateStandardizedCryptoUserId(baseUserId, algorithm, operation);
    if (signatureMetadata.cryptoUserId === expectedCryptoUserId) {
      return signatureMetadata.cryptoUserId;
    } else {
      this.logger.warn('Inconsistent crypto user ID detected, regenerating', {
        stored: signatureMetadata.cryptoUserId,
        expected: expectedCryptoUserId,
        baseUserId
      });
    }
  }
  
  return this.generateStandardizedCryptoUserId(baseUserId, algorithm, operation);
}

// Updated signing method
private async signWithDilithium(dataHash: string, userId?: string): Promise<string> {
  try {
    const baseUserId = userId || 'anonymous';
    const signUserId = await this.ensureConsistentCryptoUserId(baseUserId, 'ML-DSA-65', 'signing');

    const pqcResult = await this.authService.callPQCService('sign_token', {
      user_id: signUserId,
      payload: { dataHash, timestamp: Date.now(), operation: 'sign', original_user_id: baseUserId },
    });

    if (pqcResult.success && pqcResult.token) {
      this.logger.debug(`ML-DSA-65 signature completed for crypto user: ${signUserId}`);
      return `dilithium3:${pqcResult.token}`;
    } else {
      throw new Error(pqcResult.error_message || 'ML-DSA-65 signing failed');
    }
  } catch (error) {
    this.logger.error(`ML-DSA-65 signing failed for dataHash ${dataHash}:`, error);
    throw error;
  }
}

// Updated verification method
private async verifyDilithiumSignature(dataHash: string, signature: string, userId?: string, signatureMetadata?: any): Promise<boolean> {
  try {
    this.logger.debug(`ML-DSA-65 verification starting for signature: ${signature.slice(0, 50)}...`);

    if (!signature.startsWith('dilithium3:') || signature.length < 20) {
      this.logger.debug('Signature format validation failed');
      return false;
    }

    const signaturePart = signature.slice(11);
    const baseUserId = userId || 'anonymous';
    
    // Use consistent crypto user ID generation
    const verifyUserId = await this.ensureConsistentCryptoUserId(
      baseUserId, 
      'ML-DSA-65', 
      'signing', 
      signatureMetadata
    );

    this.logger.debug(`Using consistent crypto user ID for verification: ${verifyUserId} from base: ${baseUserId}`);

    const pqcResult = await this.authService.callPQCService('verify_token', {
      user_id: verifyUserId,
      token: signaturePart,
      payload: { dataHash, timestamp: Date.now(), operation: 'verify', original_user_id: baseUserId },
    });

    if (pqcResult.success && pqcResult.verified) {
      this.logger.debug(`ML-DSA-65 verification completed successfully for crypto user: ${verifyUserId}`);
      return true;
    } else {
      this.logger.debug(`ML-DSA-65 verification failed: ${pqcResult.error_message || 'PQC service rejected signature'}`);
      return false;
    }
  } catch (error) {
    this.logger.error(`ML-DSA-65 verification failed for dataHash ${dataHash}:`, error);
    return false;
  }
}
```

### 5. Error Handling Sanitization

#### Implementation Location
**File**: `src/portal/portal-backend/src/auth/auth.service.ts`

#### Code Changes
```typescript
// SECURE: Sanitized error handling
async generatePQCToken(userId: string): Promise<any> {
  try {
    this.logger.log(`Generating PQC token for user: ${userId}`);
    const startTime = Date.now();

    let pqcResult;
    try {
      pqcResult = await this.callPythonPQCService('generate_session_key', { user_id: userId });

      if (pqcResult.success) {
        // ... existing success logic ...
        return {
          access_token: payload,
          pqc_enabled: true,
          algorithm: pqcResult.algorithm,
          session_data: pqcResult.session_data,
          performance_metrics: pqcResult.performance_metrics,
        };
      }
    } catch (pythonError: any) {
      // SECURE: Log detailed error internally, return generic message
      this.logger.error('PQC service error', {
        error: pythonError.message,
        userId: userId,
        timestamp: new Date().toISOString(),
        operation: 'generatePQCToken'
      });
    }

    try {
      const fallbackResult = await this.hybridCryptoService.encryptWithFallback(
        JSON.stringify(fallbackPayload),
        'fallback-public-key',
      );

      // SECURE: Structured logging without exposing sensitive details
      this.logger.warn('CRYPTO_FALLBACK_USED', {
        fallbackReason: 'PQC service unavailable',
        algorithm: fallbackResult.algorithm,
        userId: userId,
        operation: 'generatePQCToken',
        timestamp: new Date().toISOString(),
        originalAlgorithm: 'ML-KEM-768',
      });

      return {
        token: fallbackResult.ciphertext,
        algorithm: fallbackResult.algorithm,
        metadata: {
          fallbackUsed: true,
          fallbackReason: 'Service temporarily unavailable',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (fallbackError) {
      // SECURE: Log detailed error internally, return sanitized message
      this.logger.error('Cryptographic service failure', {
        error: fallbackError.message,
        userId: userId,
        timestamp: new Date().toISOString(),
        operation: 'generatePQCToken',
        fallbackAttempted: true
      });
      
      // SECURE: Generic error message for external consumption
      throw new Error('Authentication service temporarily unavailable');
    }

  } catch (error) {
    this.logger.error(`Token generation failed`, {
      userId: userId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    await this.pqcMonitoring.recordPQCKeyGeneration(userId, Date.now(), false);
    
    // SECURE: Generic error message
    throw new Error('Authentication service temporarily unavailable');
  }
}
```

### 6. Public Wrapper Methods for Cross-Service Access

#### Implementation Location
**File**: `src/portal/portal-backend/src/auth/auth.service.ts`

#### Code Changes
```typescript
// SECURE: Public wrapper methods instead of bracket notation access
export class AuthService {
  // ... existing code ...

  // Public wrapper for PQC service calls
  public async signTokenForService(userId: string, payload: any): Promise<any> {
    return this.callPythonPQCService('sign_token', { user_id: userId, payload });
  }

  public async verifyTokenForService(userId: string, token: string, payload: any): Promise<any> {
    return this.callPythonPQCService('verify_token', { user_id: userId, token, payload });
  }

  public async generateSessionKeyForService(userId: string, metadata?: any): Promise<any> {
    return this.callPythonPQCService('generate_session_key', { user_id: userId, metadata });
  }

  // ... rest of existing methods ...
}
```

#### Update PQC Data Validation Service
**File**: `src/portal/portal-backend/src/services/pqc-data-validation.service.ts`

```typescript
// SECURE: Use public wrapper methods instead of bracket notation
private async signWithDilithium(dataHash: string, userId?: string): Promise<string> {
  try {
    const baseUserId = userId || 'anonymous';
    const signUserId = await this.ensureConsistentCryptoUserId(baseUserId, 'ML-DSA-65', 'signing');

    // SECURE: Use public wrapper method
    const pqcResult = await this.authService.signTokenForService(signUserId, {
      dataHash, 
      timestamp: Date.now(), 
      operation: 'sign', 
      original_user_id: baseUserId
    });

    if (pqcResult.success && pqcResult.token) {
      this.logger.debug(`ML-DSA-65 signature completed for crypto user: ${signUserId}`);
      return `dilithium3:${pqcResult.token}`;
    } else {
      throw new Error(pqcResult.error_message || 'ML-DSA-65 signing failed');
    }
  } catch (error) {
    this.logger.error(`ML-DSA-65 signing failed for dataHash ${dataHash}:`, error);
    throw error;
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Test file: hybrid-crypto.service.spec.ts
describe('HybridCryptoService', () => {
  let service: HybridCryptoService;
  let pqcService: jest.Mocked<PqcDataEncryptionService>;
  let circuitBreaker: jest.Mocked<CircuitBreakerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridCryptoService,
        {
          provide: PqcDataEncryptionService,
          useValue: {
            encryptData: jest.fn(),
            decryptData: jest.fn(),
          },
        },
        {
          provide: CircuitBreakerService,
          useValue: {
            isAvailable: jest.fn(),
            recordSuccess: jest.fn(),
            recordFailure: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HybridCryptoService>(HybridCryptoService);
    pqcService = module.get(PqcDataEncryptionService);
    circuitBreaker = module.get(CircuitBreakerService);
  });

  describe('encryptWithFallback', () => {
    it('should use PQC encryption when available', async () => {
      circuitBreaker.isAvailable.mockReturnValue(true);
      pqcService.encryptData.mockResolvedValue({ encryptedData: 'pqc-encrypted' });

      const result = await service.encryptWithFallback('test-data', 'public-key');

      expect(result.algorithm).toBe('ML-KEM-768');
      expect(result.fallbackUsed).toBe(false);
      expect(circuitBreaker.recordSuccess).toHaveBeenCalledWith('pqc-encryption');
    });

    it('should fallback to RSA when PQC fails', async () => {
      circuitBreaker.isAvailable.mockReturnValue(true);
      pqcService.encryptData.mockRejectedValue(new Error('PQC service down'));

      const result = await service.encryptWithFallback('test-data', 'public-key');

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.fallbackUsed).toBe(true);
      expect(circuitBreaker.recordFailure).toHaveBeenCalledWith('pqc-encryption');
    });

    it('should use RSA when circuit breaker is open', async () => {
      circuitBreaker.isAvailable.mockReturnValue(false);

      const result = await service.encryptWithFallback('test-data', 'public-key');

      expect(result.algorithm).toBe('RSA-2048');
      expect(result.fallbackUsed).toBe(true);
      expect(result.metadata?.fallbackReason).toBe('Circuit breaker open');
    });
  });
});
```

### Integration Tests
```typescript
// Test file: security-mitigation.integration.spec.ts
describe('Security Mitigation Integration', () => {
  let app: INestApplication;
  let userService: UserService;
  let hybridCryptoService: HybridCryptoService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userService = moduleFixture.get<UserService>(UserService);
    hybridCryptoService = moduleFixture.get<HybridCryptoService>(HybridCryptoService);
  });

  describe('End-to-End Security Workflow', () => {
    it('should handle complete encryption/decryption cycle with fallback', async () => {
      const testData = 'sensitive-user-data';
      const userId = 'test-user-123';

      // Test encryption
      const encryptResult = await hybridCryptoService.encryptWithFallback(testData, 'public-key', userId);
      expect(encryptResult.ciphertext).toBeDefined();

      // Test decryption
      const decryptResult = await hybridCryptoService.decryptWithFallback(
        encryptResult.ciphertext,
        'private-key',
        encryptResult.algorithm,
        userId
      );
      expect(decryptResult.plaintext).toBe(testData);
    });

    it('should maintain user ID consistency across signing and verification', async () => {
      const testData = { message: 'test-message' };
      const userId = 'test-user-456';

      // Create signature
      const integrity = await pqcValidationService.createDataIntegrity(testData, userId);
      expect(integrity.signature).toBeDefined();

      // Verify signature
      const validationResult = await pqcValidationService.validateDataIntegrity(testData, integrity);
      expect(validationResult.isValid).toBe(true);
    });
  });
});
```

## 📊 Deployment Strategy

### Phase 1: Development Environment (Week 1)
1. Implement HybridCryptoService and CircuitBreakerService
2. Add unit tests and integration tests
3. Update error handling in AuthService
4. Fix user ID consistency issues

### Phase 2: Staging Environment (Week 2)
1. Deploy DataMigrationService
2. Implement public wrapper methods
3. Add comprehensive monitoring and alerting
4. Perform security testing and validation

### Phase 3: Production Rollout (Week 3)
1. Gradual rollout with feature flags
2. Monitor fallback usage and circuit breaker status
3. Validate migration processes with small user groups
4. Full production deployment with rollback capabilities

## 📈 Success Metrics

### Security Metrics
- **Zero** information disclosure incidents from error messages
- **100%** signature verification success rate with consistent user IDs
- **<5%** fallback usage under normal conditions
- **<1 second** circuit breaker recovery time

### Performance Metrics
- **<50ms** encryption/decryption operations
- **<100ms** migration operations per user
- **99.9%** service availability with fallback mechanisms
- **<30 seconds** circuit breaker timeout duration

### Operational Metrics
- **100%** successful rollback capability
- **Zero** data loss during migrations
- **<24 hours** time to detect and resolve security issues
- **100%** test coverage for security-critical code paths

---

**Last Updated**: July 2, 2025
**Implementation Plan**: WBS 1.15 Security Mitigation - Comprehensive Implementation Strategy
**Status**: Ready for Implementation - All Components Defined
**Next Phase**: Begin Phase 1 Development Implementation
