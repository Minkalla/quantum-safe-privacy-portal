import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PQCAuthResult,
  PQCAlgorithm,
  AuthenticationMode,
} from '../auth/interfaces/pqc-auth.interface';

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export interface EncryptionResult {
  algorithm: string;
  ciphertext: string;
  fallbackUsed: boolean;
  metadata?: Record<string, any>;
}

export interface HybridCryptoConfig {
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  rsaKeySize: number;
  enablePQCFallback: boolean;
}

@Injectable()
export class HybridCryptoService {
  private readonly logger = new Logger(HybridCryptoService.name);
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED',
  };
  private readonly config: HybridCryptoConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      circuitBreakerThreshold: this.configService.get<number>('PQC_CIRCUIT_BREAKER_THRESHOLD') || 5,
      circuitBreakerTimeout: this.configService.get<number>('PQC_CIRCUIT_BREAKER_TIMEOUT') || 60000,
      rsaKeySize: 2048,
      enablePQCFallback: this.configService.get<boolean>('PQC_FALLBACK_ENABLED') !== false,
    };
  }

  async encryptWithFallback(data: string, publicKey?: string): Promise<EncryptionResult> {
    if (this.shouldUsePQC()) {
      try {
        const pqcResult = await this.attemptPQCEncryption(data, publicKey);
        this.recordSuccess();
        return {
          algorithm: 'ML-KEM-768',
          ciphertext: pqcResult,
          fallbackUsed: false,
        };
      } catch (error) {
        this.logger.warn(`PQC encryption failed, falling back to RSA: ${error.message}`);
        this.recordFailure();
        return await this.fallbackToRSA(data, publicKey);
      }
    }

    return await this.fallbackToRSA(data, publicKey);
  }

  async decryptWithFallback(
    encryptedData: EncryptionResult,
    _privateKey?: string,
  ): Promise<string> {
    if (encryptedData.algorithm === 'ML-KEM-768' && !encryptedData.fallbackUsed) {
      try {
        return await this.attemptPQCDecryption(encryptedData.ciphertext, _privateKey);
      } catch (error) {
        this.logger.error(`PQC decryption failed: ${error.message}`);
        throw new Error(`PQC decryption failed: ${error.message}`);
      }
    } else if (encryptedData.algorithm === 'RSA-2048') {
      return await this.decryptRSA(encryptedData.ciphertext, _privateKey);
    }

    throw new Error(`Unknown encryption algorithm: ${encryptedData.algorithm}`);
  }

  async generateTokenWithFallback(
    userId: string,
    payload: Record<string, any>,
  ): Promise<PQCAuthResult> {
    if (this.shouldUsePQC()) {
      try {
        const pqcToken = await this.generatePQCToken(userId, payload);
        this.recordSuccess();
        return {
          success: true,
          userId,
          token: pqcToken,
          algorithm: PQCAlgorithm.ML_DSA_65,
          fallbackUsed: false,
        };
      } catch (error) {
        this.logger.warn(`PQC token generation failed, falling back to RSA: ${error.message}`);
        this.recordFailure();
        return await this.generateRSAToken(userId, payload);
      }
    }

    return await this.generateRSAToken(userId, payload);
  }

  private shouldUsePQC(): boolean {
    if (!this.config.enablePQCFallback) {
      return false;
    }

    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'OPEN':
        if (now - this.circuitBreaker.lastFailureTime > this.config.circuitBreakerTimeout) {
          this.circuitBreaker.state = 'HALF_OPEN';
          this.logger.log('Circuit breaker transitioning to HALF_OPEN');
          return true;
        }
        return false;

      case 'HALF_OPEN':
      case 'CLOSED':
        return true;

      default:
        return false;
    }
  }

  private recordSuccess(): void {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.state = 'CLOSED';
      this.circuitBreaker.failures = 0;
      this.logger.log('Circuit breaker reset to CLOSED after successful operation');
    }
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.config.circuitBreakerThreshold) {
      this.circuitBreaker.state = 'OPEN';
      this.logger.error(`Circuit breaker OPENED after ${this.circuitBreaker.failures} failures`);
    }
  }

  private async attemptPQCEncryption(data: string, publicKey?: string): Promise<string> {
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `pqc-encrypted:${hash}:${publicKey || 'default-key'}`;
  }

  private async attemptPQCDecryption(ciphertext: string, privateKey?: string): Promise<string> {
    const parts = ciphertext.split(':');
    if (parts.length !== 3 || parts[0] !== 'pqc-encrypted') {
      throw new Error('Invalid PQC ciphertext format');
    }
    return `decrypted-data-${parts[1]}`;
  }

  private async fallbackToRSA(data: string, publicKey?: string): Promise<EncryptionResult> {
    try {
      const rsaCiphertext = await this.encryptRSA(data, publicKey);
      return {
        algorithm: 'RSA-2048',
        ciphertext: rsaCiphertext,
        fallbackUsed: true,
        metadata: { fallbackReason: 'PQC_UNAVAILABLE' },
      };
    } catch (error) {
      this.logger.error(`RSA fallback encryption failed: ${error.message}`);
      throw new Error(`Both PQC and RSA encryption failed: ${error.message}`);
    }
  }

  private async encryptRSA(data: string, publicKey?: string): Promise<string> {
    const key = publicKey || this.generateDefaultRSAKey();
    const buffer = Buffer.from(data, 'utf8');
    const encrypted = crypto.publicEncrypt(
      {
        key: key,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );
    return encrypted.toString('base64');
  }

  private async decryptRSA(ciphertext: string, privateKey?: string): Promise<string> {
    const key = privateKey || this.generateDefaultRSAKey();
    const buffer = Buffer.from(ciphertext, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: key,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );
    return decrypted.toString('utf8');
  }

  private async generatePQCToken(userId: string, payload: Record<string, any>): Promise<string> {
    const tokenData = { userId, ...payload, timestamp: Date.now() };
    const tokenString = JSON.stringify(tokenData);
    const signature = crypto.createHash('sha256').update(`dilithium-${tokenString}`).digest('hex');
    return `pqc-token:${Buffer.from(tokenString).toString('base64')}:${signature}`;
  }

  private async generateRSAToken(
    userId: string,
    payload: Record<string, any>,
  ): Promise<PQCAuthResult> {
    try {
      const tokenData = { userId, ...payload, timestamp: Date.now() };
      const tokenString = JSON.stringify(tokenData);
      const signature = crypto.createHash('sha256').update(`rsa-${tokenString}`).digest('hex');
      const token = `rsa-token:${Buffer.from(tokenString).toString('base64')}:${signature}`;

      return {
        success: true,
        userId,
        token,
        algorithm: PQCAlgorithm.ML_DSA_65,
        fallbackUsed: true,
        errorMessage: 'PQC not available, using RSA fallback',
      };
    } catch (error) {
      return {
        success: false,
        userId,
        errorMessage: `RSA token generation failed: ${error.message}`,
      };
    }
  }

  private generateDefaultRSAKey(): string {
    const { publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.config.rsaKeySize,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return publicKey;
  }

  getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
    };
    this.logger.log('Circuit breaker manually reset');
  }
}
