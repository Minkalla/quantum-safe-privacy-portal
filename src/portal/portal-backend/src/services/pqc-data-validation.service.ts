import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PQCSignature, PQCDataIntegrity, PQCValidationResult, PQCAlgorithmType } from '../models/interfaces/pqc-data.interface';
import { AuthService } from '../auth/auth.service';

export interface SignatureOptions {
  algorithm?: PQCAlgorithmType;
  publicKeyHash?: string;
  metadata?: Record<string, any>;
}

export interface ValidationOptions {
  strictMode?: boolean;
  checkTimestamp?: boolean;
  maxAge?: number;
}

@Injectable()
export class PQCDataValidationService {
  private readonly logger = new Logger(PQCDataValidationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async generateSignature(data: any, options: SignatureOptions = {}): Promise<PQCSignature> {
    try {
      const algorithm = options.algorithm || PQCAlgorithmType.DILITHIUM_3;
      const dataHash = this.generateDataHash(data);

      let signature: string;

      if (algorithm === PQCAlgorithmType.DILITHIUM_3) {
        signature = await this.signWithDilithium(dataHash);
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

  async verifySignature(data: any, signature: PQCSignature, options: ValidationOptions = {}): Promise<PQCValidationResult> {
    const startTime = Date.now();
    const result: PQCValidationResult = {
      isValid: false,
      algorithm: signature.algorithm,
      timestamp: new Date(),
      errors: [],
      warnings: [],
    };

    try {
      const dataHash = this.generateDataHash(data);

      if (dataHash !== signature.signedDataHash) {
        result.errors.push('Data hash mismatch');
        return result;
      }

      if (options.checkTimestamp && options.maxAge) {
        const age = Date.now() - signature.timestamp.getTime();
        if (age > options.maxAge) {
          result.errors.push(`Signature expired (age: ${age}ms, max: ${options.maxAge}ms)`);
          return result;
        }
      }

      let isValidSignature: boolean;

      if (signature.algorithm === PQCAlgorithmType.DILITHIUM_3.toString()) {
        isValidSignature = await this.verifyDilithiumSignature(dataHash, signature.signature);
      } else {
        isValidSignature = await this.verifyClassicalSignature(dataHash, signature.signature);
      }

      result.isValid = isValidSignature;

      if (!isValidSignature) {
        result.errors.push('Invalid signature');
      }

      result.performanceMetrics = {
        validationTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed,
      };

      return result;
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      result.errors.push(`Verification error: ${error.message}`);
      return result;
    }
  }

  async generateDataIntegrity(data: any, options: SignatureOptions = {}): Promise<PQCDataIntegrity> {
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

  async validateDataIntegrity(data: any, integrity: PQCDataIntegrity, options: ValidationOptions = {}): Promise<PQCValidationResult> {
    const result: PQCValidationResult = {
      isValid: false,
      algorithm: integrity.algorithm,
      timestamp: new Date(),
      errors: [],
      warnings: [],
    };

    try {
      const currentHash = this.generateDataHash(data);

      if (currentHash !== integrity.hash) {
        result.errors.push('Data integrity hash mismatch');
        return result;
      }

      if (integrity.signature) {
        const signatureResult = await this.verifySignature(data, integrity.signature, options);
        result.isValid = signatureResult.isValid;
        result.errors.push(...signatureResult.errors);
        result.warnings.push(...signatureResult.warnings);
        result.performanceMetrics = signatureResult.performanceMetrics;
      } else {
        result.isValid = true;
      }

      return result;
    } catch (error) {
      this.logger.error(`Data integrity validation failed: ${error.message}`);
      result.errors.push(`Validation error: ${error.message}`);
      return result;
    }
  }

  private generateDataHash(data: any): string {
    const serializedData = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(serializedData).digest('hex');
  }

  private async signWithDilithium(dataHash: string): Promise<string> {
    try {
      const pqcResult = await this.authService['callPythonPQCService']('sign_token', {
        user_id: `dilithium_${Date.now()}`,
        payload: { dataHash, timestamp: Date.now() },
      });

      if (pqcResult.success && pqcResult.token) {
        this.logger.debug('ML-DSA-65 signature completed');
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
    const signature = crypto.createHash('sha256').update(`classical-${dataHash}-${Date.now()}`).digest('hex');
    return `classical:${signature}`;
  }

  private async verifyDilithiumSignature(dataHash: string, signature: string): Promise<boolean> {
    try {
      this.logger.debug('ML-DSA-65 verification with enhanced security');

      if (!signature.startsWith('dilithium3:') || signature.length < 20) {
        return false;
      }

      const signaturePart = signature.substring(11);

      const pqcResult = await this.authService['callPythonPQCService']('verify_token', {
        user_id: `dilithium_verification_${Date.now()}`,
        token: signaturePart,
      });

      if (pqcResult.success) {
        this.logger.debug('ML-DSA-65 verification completed successfully');
        return true;
      } else {
        this.logger.debug(`ML-DSA-65 verification failed: ${pqcResult.error_message}`);
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

    const signaturePart = signature.substring(10);
    const expectedSignature = crypto.createHash('sha256').update(`classical-${dataHash}-verification`).digest('hex');

    return this.constantTimeCompare(signaturePart.substring(0, expectedSignature.length), expectedSignature);
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
    return crypto.createHash('sha256').update(`pubkey-${Date.now()}`).digest('hex');
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
