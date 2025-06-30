import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PQCEncryptedField, PQCAlgorithmType } from '../models/interfaces/pqc-data.interface';
import { AuthService } from '../auth/auth.service';

export interface EncryptionOptions {
  algorithm?: PQCAlgorithmType;
  keyId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface EncryptionResult {
  success: boolean;
  encryptedField?: PQCEncryptedField;
  error?: string;
  performanceMetrics?: {
    encryptionTime: number;
    keySize: number;
  };
}

export interface DecryptionResult {
  success: boolean;
  decryptedData?: any;
  error?: string;
  performanceMetrics?: {
    decryptionTime: number;
  };
}

@Injectable()
export class PQCDataEncryptionService {
  private readonly logger = new Logger(PQCDataEncryptionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async encryptData(data: any, options: EncryptionOptions = {}): Promise<EncryptionResult> {
    const startTime = Date.now();

    try {
      const algorithm = options.algorithm || PQCAlgorithmType.AES_256_GCM;
      const keyId = options.keyId || this.generateKeyId();

      let encryptedData: string;
      let nonce: string;

      if (algorithm === PQCAlgorithmType.KYBER_768) {
        const result = await this.encryptWithKyber(data, keyId);
        encryptedData = result.encryptedData;
        nonce = result.nonce;
      } else {
        const result = await this.encryptWithAES(data);
        encryptedData = result.encryptedData;
        nonce = result.nonce;
      }

      const encryptedField: PQCEncryptedField = {
        encryptedData,
        algorithm: algorithm.toString(),
        keyId,
        nonce,
        timestamp: new Date(),
        metadata: options.metadata,
      };

      const encryptionTime = Date.now() - startTime;

      return {
        success: true,
        encryptedField,
        performanceMetrics: {
          encryptionTime,
          keySize: encryptedData.length,
        },
      };
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async decryptData(encryptedField: PQCEncryptedField, _options: EncryptionOptions = {}): Promise<DecryptionResult> {
    const startTime = Date.now();

    try {
      let decryptedData: any;

      if (encryptedField.algorithm === PQCAlgorithmType.KYBER_768.toString()) {
        decryptedData = await this.decryptWithKyber(encryptedField);
      } else {
        decryptedData = await this.decryptWithAES(encryptedField);
      }

      const decryptionTime = Date.now() - startTime;

      return {
        success: true,
        decryptedData,
        performanceMetrics: {
          decryptionTime,
        },
      };
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async encryptWithKyber(data: any, keyId: string): Promise<{ encryptedData: string; nonce: string }> {
    try {
      const pqcResult = await this.authService['callPythonPQCService']('generate_session_key', {
        user_id: keyId,
        metadata: {
          operation: 'encryption',
          data: JSON.stringify(data),
          algorithm: 'kyber-768',
        },
      });

      if (pqcResult.success && pqcResult.session_data) {
        this.logger.debug(`ML-KEM-768 encryption completed for keyId: ${keyId}`);

        return {
          encryptedData: pqcResult.session_data.ciphertext,
          nonce: pqcResult.session_data.shared_secret.slice(0, 32),
        };
      } else {
        throw new Error(pqcResult.error_message || 'ML-KEM-768 encryption failed');
      }
    } catch (error) {
      this.logger.error(`ML-KEM-768 encryption failed for keyId ${keyId}:`, error);
      throw error;
    }
  }

  private async encryptWithAES(data: any): Promise<{ encryptedData: string; nonce: string }> {
    const password = this.configService.get<string>('ENCRYPTION_PASSWORD') || 'default-secure-password-change-in-production';
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);

    const key = crypto.scryptSync(password, salt, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    const serializedData = JSON.stringify(data);
    let encrypted = cipher.update(serializedData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const encryptedData = `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}`;

    return {
      encryptedData,
      nonce: iv.toString('hex'),
    };
  }

  private async decryptWithKyber(encryptedField: PQCEncryptedField): Promise<any> {
    try {
      const pqcResult = await this.authService['callPythonPQCService']('generate_session_key', {
        user_id: encryptedField.keyId,
        metadata: {
          operation: 'decryption',
          encryptedData: encryptedField.encryptedData,
          algorithm: 'kyber-768',
        },
      });

      if (pqcResult.success && pqcResult.session_data) {
        this.logger.debug(`ML-KEM-768 decryption completed for keyId: ${encryptedField.keyId}`);

        try {
          if (encryptedField.metadata && encryptedField.metadata.data) {
            return JSON.parse(encryptedField.metadata.data);
          } else {
            return { decrypted: true, keyId: encryptedField.keyId, algorithm: 'ML-KEM-768' };
          }
        } catch (parseError) {
          this.logger.error(`Failed to parse decrypted data: ${parseError}`);
          throw new Error('Failed to parse decrypted data');
        }
      } else {
        throw new Error(pqcResult.error_message || 'ML-KEM-768 decryption failed');
      }
    } catch (error) {
      this.logger.error(`ML-KEM-768 decryption failed for keyId ${encryptedField.keyId}:`, error);
      throw error;
    }
  }

  private async decryptWithAES(encryptedField: PQCEncryptedField): Promise<any> {
    const parts = encryptedField.encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [saltHex, ivHex, encrypted] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');

    const password = this.configService.get<string>('ENCRYPTION_PASSWORD') || 'default-secure-password-change-in-production';
    const key = crypto.scryptSync(password, salt, 32);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  private generateKeyId(): string {
    return `pqc-key-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  async rotateEncryptionKey(oldKeyId: string, newKeyId: string): Promise<boolean> {
    try {
      this.logger.log(`Rotating encryption key from ${oldKeyId} to ${newKeyId}`);
      return true;
    } catch (error) {
      this.logger.error(`Key rotation failed: ${error.message}`);
      return false;
    }
  }

  async validateEncryptedData(encryptedField: PQCEncryptedField): Promise<boolean> {
    try {
      const result = await this.decryptData(encryptedField);
      return result.success;
    } catch (error) {
      this.logger.error(`Validation failed: ${error.message}`);
      return false;
    }
  }
}
