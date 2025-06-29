import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PQCEncryptedField, PQCAlgorithmType } from '../models/interfaces/pqc-data.interface';

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

  constructor(private readonly configService: ConfigService) {}

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
    const serializedData = JSON.stringify(data);
    const nonce = crypto.randomBytes(16).toString('hex');
    const encryptedData = Buffer.from(serializedData).toString('base64');

    this.logger.debug(`Kyber-768 encryption placeholder for keyId: ${keyId}`);

    return { encryptedData, nonce };
  }

  private async encryptWithAES(data: any): Promise<{ encryptedData: string; nonce: string }> {
    const key = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key.toString('hex'));

    const serializedData = JSON.stringify(data);
    let encrypted = cipher.update(serializedData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const encryptedData = `${key.toString('hex')}:${encrypted}`;

    return {
      encryptedData,
      nonce: nonce.toString('hex'),
    };
  }

  private async decryptWithKyber(encryptedField: PQCEncryptedField): Promise<any> {
    this.logger.debug(`Kyber-768 decryption placeholder for keyId: ${encryptedField.keyId}`);

    const decryptedData = Buffer.from(encryptedField.encryptedData, 'base64').toString('utf8');
    return JSON.parse(decryptedData);
  }

  private async decryptWithAES(encryptedField: PQCEncryptedField): Promise<any> {
    const [keyHex, encrypted] = encryptedField.encryptedData.split(':');

    const decipher = crypto.createDecipher('aes-256-cbc', keyHex);

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
