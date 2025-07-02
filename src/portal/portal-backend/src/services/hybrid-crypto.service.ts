import { Injectable, Logger } from '@nestjs/common';
import { PQCDataEncryptionService, EncryptionResult, DecryptionResult } from './pqc-data-encryption.service';
import { ClassicalCryptoService } from './classical-crypto.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { EnhancedErrorBoundaryService, PQCErrorCategory } from './enhanced-error-boundary.service';
import { PQCEncryptedField, PQCAlgorithmType } from '../models/interfaces/pqc-data.interface';

export interface HybridEncryptionResult {
  algorithm: 'ML-KEM-768' | 'RSA-2048';
  ciphertext: string;
  fallbackUsed: boolean;
  isPQCDegraded: boolean;
  errorCategory?: PQCErrorCategory;
  metadata?: any;
}

export interface HybridOperationResult {
  algorithm: 'ML-KEM-768' | 'ML-DSA-65' | 'RSA-2048';
  data: string;
  fallbackUsed: boolean;
  isPQCDegraded: boolean;
  errorCategory?: PQCErrorCategory;
  metadata?: any;
}

export interface HybridSignatureResult {
  algorithm: 'ML-DSA-65' | 'RSA-2048';
  signature: string;
  fallbackUsed: boolean;
  isPQCDegraded: boolean;
  errorCategory?: PQCErrorCategory;
  metadata?: any;
}

export interface HybridDecryptionInput {
  algorithm: 'ML-KEM-768' | 'RSA-2048';
  ciphertext: string;
  metadata?: any;
}

@Injectable()
export class HybridCryptoService {
  private readonly logger = new Logger(HybridCryptoService.name);

  constructor(
    private readonly pqcService: PQCDataEncryptionService,
    private readonly classicalService: ClassicalCryptoService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly errorBoundary: EnhancedErrorBoundaryService,
  ) {}

  async encryptWithFallback(data: string, publicKey: string): Promise<HybridEncryptionResult> {
    const pqcOperation = async () => {
      const pqcResult = await this.pqcService.encryptData(data, {
        algorithm: PQCAlgorithmType.ML_KEM_768,
        keyId: publicKey,
      });

      if (pqcResult.success && pqcResult.encryptedField) {
        this.logger.log('PQC encryption successful with ML-KEM-768');
        return {
          algorithm: 'ML-KEM-768' as const,
          ciphertext: pqcResult.encryptedField.encryptedData,
          fallbackUsed: false,
          isPQCDegraded: false,
          metadata: {
            keyId: pqcResult.encryptedField.keyId,
            timestamp: new Date().toISOString(),
            performance: pqcResult.performanceMetrics,
          },
        };
      } else {
        throw new Error(pqcResult.error || 'PQC encryption failed');
      }
    };

    const fallbackOperation = async () => {
      const classicalResult = await this.classicalService.encryptRSA(data, publicKey);
      return {
        algorithm: 'RSA-2048' as const,
        ciphertext: classicalResult.encryptedData,
        fallbackUsed: true,
        isPQCDegraded: true,
        metadata: {
          timestamp: new Date().toISOString(),
          fallbackReason: 'PQC_SERVICE_UNAVAILABLE',
        },
      };
    };

    return await this.errorBoundary.executeWithErrorBoundary<HybridEncryptionResult>(
      pqcOperation,
      {
        category: PQCErrorCategory.CRYPTO_OPERATION,
        retryCount: 2,
        fallbackEnabled: false,
        logLevel: 'error',
      },
    ).catch(async (error) => {
      this.logger.warn('CRYPTO_FALLBACK_USED', {
        fallbackReason: error.message,
        algorithm: 'RSA-2048',
        operation: 'encryptWithFallback',
        timestamp: new Date().toISOString(),
        originalAlgorithm: 'ML-KEM-768',
      });
      return await fallbackOperation();
    });
  }

  async decryptWithFallback(encryptedData: HybridDecryptionInput, privateKey: string): Promise<string> {
    if (encryptedData.algorithm === 'ML-KEM-768') {
      try {
        this.logger.debug('Attempting PQC decryption with ML-KEM-768');

        const pqcField: PQCEncryptedField = {
          encryptedData: encryptedData.ciphertext,
          algorithm: PQCAlgorithmType.ML_KEM_768.toString(),
          keyId: privateKey,
          nonce: '',
          timestamp: new Date(),
          metadata: encryptedData.metadata,
        };

        const result = await this.pqcService.decryptData(pqcField);

        if (result.success && result.decryptedData) {
          this.logger.log('PQC decryption successful');
          return typeof result.decryptedData === 'string' ? result.decryptedData : JSON.stringify(result.decryptedData);
        } else {
          throw new Error(result.error || 'PQC decryption failed');
        }
      } catch (error) {
        this.logger.error(`PQC decryption failed: ${error.message}`);
        throw new Error(`PQC decryption failed: ${error.message}`);
      }
    } else if (encryptedData.algorithm === 'RSA-2048') {
      try {
        this.logger.debug('Attempting classical RSA decryption');

        const result = await this.classicalService.decryptRSA(encryptedData.ciphertext, privateKey);

        this.logger.log('Classical RSA decryption successful');
        return result.encryptedData; // Note: this is actually decrypted data due to interface reuse
      } catch (error) {
        this.logger.error(`RSA decryption failed: ${error.message}`);
        throw new Error(`RSA decryption failed: ${error.message}`);
      }
    }

    throw new Error(`Unknown encryption algorithm: ${encryptedData.algorithm}`);
  }

  async signWithFallback(message: string, privateKey: string): Promise<HybridSignatureResult> {
    try {
      this.logger.debug('Attempting PQC signing with ML-DSA-65');
      this.logger.warn('PQC signing not yet implemented in PQCDataEncryptionService, falling back to RSA');

      throw new Error('PQC signing not yet available');
    } catch (error) {
      this.logger.warn(`PQC signing failed, falling back to RSA: ${error.message}`);

      try {
        const classicalResult = await this.classicalService.signRSA(message, privateKey);

        this.logger.log('Classical RSA signing successful as fallback');

        return {
          algorithm: 'RSA-2048',
          signature: classicalResult.signature,
          fallbackUsed: true,
          isPQCDegraded: true,
          metadata: {
            fallbackReason: error.message,
            timestamp: new Date().toISOString(),
            originalError: 'PQC_SIGNING_NOT_AVAILABLE',
          },
        };
      } catch (fallbackError) {
        this.logger.error(`Both PQC and classical signing failed: ${fallbackError.message}`);
        throw new Error(`Signing failed: PQC (${error.message}), RSA (${fallbackError.message})`);
      }
    }
  }

  async verifyWithFallback(signature: HybridSignatureResult, message: string, publicKey: string): Promise<boolean> {
    if (signature.algorithm === 'ML-DSA-65' || signature.metadata?.algorithm === 'ML-DSA-65') {
      try {
        this.logger.debug('Attempting PQC signature verification with ML-DSA-65');
        this.logger.warn('PQC signature verification not yet implemented, returning false');

        return false;
      } catch (error) {
        this.logger.error(`PQC signature verification failed: ${error.message}`);
        throw new Error(`PQC signature verification failed: ${error.message}`);
      }
    } else if (signature.algorithm === 'RSA-2048') {
      try {
        this.logger.debug('Attempting classical RSA signature verification');

        const result = await this.classicalService.verifyRSA(signature.signature, message, publicKey);

        this.logger.log('Classical RSA signature verification completed');
        return result.isValid;
      } catch (error) {
        this.logger.error(`RSA signature verification failed: ${error.message}`);
        throw new Error(`RSA signature verification failed: ${error.message}`);
      }
    }

    throw new Error(`Unknown signature algorithm: ${signature.algorithm}`);
  }

  async generateKeyPairWithFallback(): Promise<{ publicKey: string; privateKey: string; algorithm: string }> {
    try {
      this.logger.debug('Attempting PQC key pair generation with ML-KEM-768');
      this.logger.warn('PQC key pair generation not yet implemented in PQCDataEncryptionService, falling back to RSA');

      throw new Error('PQC key pair generation not yet available');
    } catch (error) {
      this.logger.warn(`PQC key generation failed, falling back to RSA: ${error.message}`);

      try {
        const classicalResult = await this.classicalService.generateRSAKeyPair();

        this.logger.log('Classical RSA key pair generation successful as fallback');

        return {
          publicKey: classicalResult.publicKey,
          privateKey: classicalResult.privateKey,
          algorithm: 'RSA-2048',
        };
      } catch (fallbackError) {
        this.logger.error(`Both PQC and classical key generation failed: ${fallbackError.message}`);
        throw new Error(`Key generation failed: PQC (${error.message}), RSA (${fallbackError.message})`);
      }
    }
  }

  async getHealthStatus(): Promise<{ pqc: boolean; classical: boolean; fallbackActive: boolean }> {
    let pqcHealthy = false;
    let classicalHealthy = false;

    try {
      const testResult = await this.pqcService.encryptData('health-check', {
        algorithm: PQCAlgorithmType.AES_256_GCM,
      });
      pqcHealthy = testResult.success;
    } catch (error) {
      this.logger.warn(`PQC service health check failed: ${error.message}`);
    }

    try {
      await this.classicalService.healthCheck();
      classicalHealthy = true;
    } catch (error) {
      this.logger.warn(`Classical service health check failed: ${error.message}`);
    }

    return {
      pqc: pqcHealthy,
      classical: classicalHealthy,
      fallbackActive: !pqcHealthy && classicalHealthy,
    };
  }
}
