import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PQCSignature,
  PQCDataIntegrity,
  PQCValidationResult,
  PQCAlgorithmType,
} from '../models/interfaces/pqc-data.interface';
import { PQCBridgeService } from './pqc-bridge.service';
import { generateCryptoUserId, validateCryptoUserId } from '../utils/crypto-user-id.util';
import { EnhancedErrorBoundaryService, PQCErrorCategory } from './enhanced-error-boundary.service';
import { QuantumSafeCryptoIdentityService } from './quantum-safe-crypto-identity.service';

export interface SignatureOptions {
  algorithm?: PQCAlgorithmType;
  publicKeyHash?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

export interface ValidationOptions {
  strictMode?: boolean;
  checkTimestamp?: boolean;
  maxAge?: number;
  userId?: string;
}

@Injectable()
export class PQCDataValidationService {
  private readonly logger = new Logger(PQCDataValidationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly pqcBridgeService: PQCBridgeService,
    private readonly errorBoundary: EnhancedErrorBoundaryService,
    private readonly cryptoIdentityService: QuantumSafeCryptoIdentityService,
  ) {}

  async generateSignature(data: any, options: SignatureOptions = {}): Promise<PQCSignature> {
    try {
      const algorithm = options.algorithm || PQCAlgorithmType.DILITHIUM_3;
      const dataHash = this.generateDataHash(data);

      let signature: string;

      if (algorithm === PQCAlgorithmType.DILITHIUM_3) {
        signature = await this.signWithDilithium(dataHash, options.userId);
      } else {
        signature = await this.signWithClassical(dataHash);
      }

      return {
        signature,
        algorithm: algorithm.toString(),
        publicKeyHash: options.publicKeyHash || this.generatePublicKeyHash(),
        timestamp: new Date(),
        signedDataHash: dataHash,
      };
    } catch (error) {
      this.logger.error(`Signature generation failed: ${error.message}`);
      throw error;
    }
  }

  async verifySignature(
    data: any,
    signature: PQCSignature,
    options: ValidationOptions = {},
  ): Promise<PQCValidationResult> {
    const startTime = performance.now();
    const result: PQCValidationResult = {
      isValid: false,
      algorithm: signature.algorithm,
      timestamp: new Date(),
      errors: [],
      warnings: [],
    };

    try {
      const dataHash = this.generateDataHash(data);

      this.logger.debug(`Verification: dataHash=${dataHash}, signedDataHash=${signature.signedDataHash}`);

      if (dataHash !== signature.signedDataHash) {
        this.logger.debug('Data hash mismatch detected - signature invalid');
        result.errors.push('Data hash mismatch');
        result.performanceMetrics = {
          validationTime: Math.max(1, Math.round(performance.now() - startTime)),
          memoryUsage: process.memoryUsage().heapUsed,
        };
        return result;
      }

      if (options.checkTimestamp && options.maxAge) {
        const age = Date.now() - signature.timestamp.getTime();
        if (age > options.maxAge) {
          result.errors.push(`Signature expired (age: ${age}ms, max: ${options.maxAge}ms)`);
          result.performanceMetrics = {
            validationTime: Math.max(1, Math.round(performance.now() - startTime)),
            memoryUsage: process.memoryUsage().heapUsed,
          };
          return result;
        }
      }

      let isValidSignature: boolean;

      if (signature.algorithm === PQCAlgorithmType.DILITHIUM_3.toString() || signature.algorithm === 'ML-DSA-65') {
        isValidSignature = await this.verifyDilithiumSignature(dataHash, signature.signature, options.userId, signature.metadata);
      } else {
        isValidSignature = await this.verifyClassicalSignature(dataHash, signature.signature);
      }

      result.isValid = isValidSignature;

      if (!isValidSignature) {
        result.errors.push('Invalid signature');
      }

      result.performanceMetrics = {
        validationTime: Math.max(1, Math.round(performance.now() - startTime)),
        memoryUsage: process.memoryUsage().heapUsed,
      };

      return result;
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      result.errors.push(`Verification error: ${error.message}`);
      result.performanceMetrics = {
        validationTime: Math.max(1, Math.round(performance.now() - startTime)),
        memoryUsage: process.memoryUsage().heapUsed,
      };
      return result;
    }
  }

  async generateDataIntegrity(
    data: any,
    options: SignatureOptions = {},
  ): Promise<PQCDataIntegrity> {
    try {
      const hash = this.generateDataHash(data);
      const signature = await this.generateSignature(data, options);

      return {
        hash,
        algorithm: 'SHA-256',
        signature,
        timestamp: new Date(),
        validationStatus: 'valid',
      };
    } catch (error) {
      this.logger.error(`Data integrity generation failed: ${error.message}`);
      throw error;
    }
  }

  async createDataIntegrity(data: any, userId: string): Promise<PQCDataIntegrity> {
    try {
      this.logger.log(`Creating data integrity for user: ${userId}`);
      const hash = this.generateDataHash(data);

      const cryptoUserId = this.generateStandardizedCryptoUserId(userId, 'ML-DSA-65', 'signing');

      this.logger.debug(`Using crypto user ID: ${cryptoUserId} for original user: ${userId}`);

      const pqcResult = await this.pqcBridgeService.executePQCOperation('sign_token', {
        user_id: cryptoUserId,
        payload: { data, hash, operation: 'create_integrity', original_user_id: userId },
      });

      this.logger.log(`PQC service response: ${JSON.stringify(pqcResult)}`);

      if (pqcResult.success && pqcResult.token) {
        const algorithmUsed = pqcResult.algorithm === 'Classical' ? 'RSA-2048' : 'ML-DSA-65';
        const signaturePrefix = pqcResult.algorithm === 'Classical' ? 'classical' : 'dilithium3';

        const signature: PQCSignature = {
          signature: `${signaturePrefix}:${pqcResult.token}`,
          algorithm: algorithmUsed as PQCAlgorithmType,
          publicKeyHash: this.generatePublicKeyHash(),
          timestamp: new Date(),
          signedDataHash: hash,
          metadata: {
            cryptoUserId,
            originalUserId: userId,
            algorithm: algorithmUsed,
            operation: 'signing',
          },
        };

        this.logger.log(`Data integrity created successfully with ${algorithmUsed} for crypto user: ${cryptoUserId}`);

        return {
          hash,
          algorithm: 'SHA-256',
          signature,
          timestamp: new Date(),
          validationStatus: 'valid',
        };
      } else {
        const errorMsg = pqcResult.error_message || 'PQC signing failed';
        this.logger.error(`PQC signing failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (error) {
      this.logger.error(`Data integrity creation failed: ${error.message}`);
      throw error;
    }
  }

  async validateDataIntegrity(
    data: any,
    integrity: PQCDataIntegrity,
    options: ValidationOptions = {},
  ): Promise<PQCValidationResult> {
    const result: PQCValidationResult = {
      isValid: false,
      algorithm: integrity.algorithm,
      timestamp: new Date(),
      errors: [],
      warnings: [],
    };

    try {
      this.logger.debug(`Starting data integrity validation for algorithm: ${integrity.algorithm}`);
      this.logger.debug(`Input data type: ${typeof data}, data preview: ${JSON.stringify(data).slice(0, 200)}...`);
      this.logger.debug(`Expected integrity hash: ${integrity.hash}`);
      this.logger.debug(`Integrity signature present: ${!!integrity.signature}`);

      const currentHash = this.generateDataHash(data);
      this.logger.debug(`Generated current hash: ${currentHash}`);

      if (currentHash !== integrity.hash) {
        this.logger.error(`Hash mismatch detected - expected: ${integrity.hash}, got: ${currentHash}`);
        result.errors.push('Data integrity hash mismatch');
        return result;
      }

      this.logger.debug('Hash validation passed, proceeding to signature verification');

      if (integrity.signature) {
        this.logger.debug(`Verifying signature with algorithm: ${integrity.signature.algorithm}`);
        const signatureResult = await this.verifySignature(data, integrity.signature, options);
        this.logger.debug(`Signature verification result: ${signatureResult.isValid}`);
        this.logger.debug(`Signature verification errors: ${JSON.stringify(signatureResult.errors)}`);

        result.isValid = signatureResult.isValid;
        result.errors.push(...signatureResult.errors);
        result.warnings.push(...signatureResult.warnings);
        result.performanceMetrics = signatureResult.performanceMetrics;
      } else {
        this.logger.debug('No signature to verify, marking as valid');
        result.isValid = true;
      }

      this.logger.debug(`Final validation result: ${result.isValid}`);
      return result;
    } catch (error) {
      this.logger.error(`Data integrity validation failed: ${error.message}`);
      result.errors.push(`Validation error: ${error.message}`);
      return result;
    }
  }

  private generateDataHash(data: any): string {
    if (!data) {
      this.logger.warn('generateDataHash received null/undefined data');
      return crypto.createHash('sha256').update('{}').digest('hex');
    }

    try {
      let serializedData: string;

      if (typeof data === 'string') {
        serializedData = data;
      } else if (typeof data === 'object') {
        serializedData = JSON.stringify(data, Object.keys(data).sort());
      } else {
        serializedData = String(data);
      }

      return crypto.createHash('sha256').update(serializedData).digest('hex');
    } catch (error) {
      this.logger.error(`generateDataHash serialization failed: ${error.message}`);
      return crypto.createHash('sha256').update('{}').digest('hex');
    }
  }

  private async signWithDilithium(dataHash: string, userId?: string): Promise<string> {
    try {
      const baseUserId = userId || 'anonymous';
      const signUserId = this.generateStandardizedCryptoUserId(baseUserId, 'ML-DSA-65', 'signing');

      const pqcResult = await this.pqcBridgeService.executePQCOperation('sign_token', {
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

  private async signWithClassical(dataHash: string): Promise<string> {
    const signature = crypto
      .createHash('sha256')
      .update(`classical-${dataHash}-verification`)
      .digest('hex');
    return `classical:${signature}`;
  }

  private async verifyDilithiumSignature(dataHash: string, signature: string, userId?: string, signatureMetadata?: any): Promise<boolean> {
    try {
      this.logger.debug(`ML-DSA-65 verification starting for signature: ${signature.slice(0, 50)}...`);

      if (!signature.startsWith('dilithium3:') || signature.length < 20) {
        this.logger.debug('Signature format validation failed');
        return false;
      }

      const signaturePart = signature.slice(11);
      this.logger.debug(`Extracted signature part: ${signaturePart.slice(0, 50)}...`);

      const isValidFormat = signaturePart.length > 10 && !signaturePart.includes('undefined');

      if (!isValidFormat) {
        this.logger.debug('ML-DSA-65 verification failed: invalid signature format');
        return false;
      }

      try {
        let verifyUserId: string;
        let baseUserId: string;

        if (signatureMetadata?.cryptoUserId) {
          verifyUserId = signatureMetadata.cryptoUserId;
          baseUserId = signatureMetadata.originalUserId || userId || 'anonymous';
          this.logger.debug(`Using stored crypto user ID from signature metadata: ${verifyUserId}`);
        } else {
          baseUserId = userId || 'anonymous';
          const algorithm = signatureMetadata?.algorithm || 'ML-DSA-65';
          verifyUserId = this.generateStandardizedCryptoUserId(baseUserId, algorithm, 'signing');
          this.logger.debug(`Generated standardized crypto user ID for verification: ${verifyUserId} from base: ${baseUserId}`);
        }

        const pqcResult = await this.pqcBridgeService.executePQCOperation('verify_token', {
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
      } catch (pqcError) {
        this.logger.error(`PQC service verification failed: ${pqcError.message}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`ML-DSA-65 verification failed for dataHash ${dataHash}:`, error);
      return false;
    }
  }

  private async verifyClassicalSignature(dataHash: string, signature: string): Promise<boolean> {
    if (!signature.startsWith('classical:') || signature.length < 20) {
      return false;
    }

    const signaturePart = signature.slice(10);
    const expectedSignature = crypto
      .createHash('sha256')
      .update(`classical-${dataHash}-verification`)
      .digest('hex');

    return this.constantTimeCompare(
      signaturePart.slice(0, expectedSignature.length),
      expectedSignature,
    );
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  private generatePublicKeyHash(): string {
    return crypto.createHash('sha256').update('pubkey-deterministic-hash').digest('hex');
  }

  /**
   * Generate a standardized crypto user ID for consistent cryptographic operations
   * This ensures the same user ID is used for both signing and verification operations
   */
  private generateStandardizedCryptoUserId(baseUserId: string, algorithm: string, operation: string): string {
    return this.cryptoIdentityService.generateStandardizedCryptoUserId(baseUserId, algorithm, operation);
  }

  async batchValidateIntegrity(
    dataItems: Array<{ data: any; integrity: PQCDataIntegrity }>,
    options: ValidationOptions = {},
  ): Promise<PQCValidationResult[]> {
    const results: PQCValidationResult[] = [];

    for (const item of dataItems) {
      try {
        const result = await this.validateDataIntegrity(item.data, item.integrity, options);
        results.push(result);
      } catch (error) {
        this.logger.error(`Batch validation item failed: ${error.message}`);
        results.push({
          isValid: false,
          algorithm: 'unknown',
          timestamp: new Date(),
          errors: [`Validation error: ${error.message}`],
          warnings: [],
        });
      }
    }

    return results;
  }
}
