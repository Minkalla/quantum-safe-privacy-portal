import { Injectable, Logger } from '@nestjs/common';
import { PQCDataEncryptionService, EncryptionOptions } from './pqc-data-encryption.service';
import { PQCEncryptedField } from '../models/interfaces/pqc-data.interface';

export interface FieldEncryptionResult {
  success: boolean;
  encryptedData?: any;
  error?: string;
  encryptedFields?: string[];
}

export interface FieldDecryptionResult {
  success: boolean;
  decryptedData?: any;
  error?: string;
  decryptedFields?: string[];
}

@Injectable()
export class FieldEncryptionService {
  private readonly logger = new Logger(FieldEncryptionService.name);

  constructor(private readonly encryptionService: PQCDataEncryptionService) {}

  async encryptFields(
    data: any,
    fieldsToEncrypt: string[],
    options: EncryptionOptions = {},
  ): Promise<FieldEncryptionResult> {
    try {
      const encryptedData = { ...data };
      const encryptedFields: string[] = [];

      for (const fieldPath of fieldsToEncrypt) {
        const fieldValue = this.getNestedValue(data, fieldPath);

        if (fieldValue !== undefined && fieldValue !== null) {
          const encryptionResult = await this.encryptionService.encryptData(fieldValue, options);

          if (encryptionResult.success) {
            this.setNestedValue(encryptedData, fieldPath, encryptionResult.encryptedField);
            encryptedFields.push(fieldPath);
          } else {
            this.logger.warn(`Failed to encrypt field ${fieldPath}: ${encryptionResult.error}`);
          }
        }
      }

      return {
        success: true,
        encryptedData,
        encryptedFields,
      };
    } catch (error) {
      this.logger.error(`Field encryption failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async decryptFields(
    data: any,
    fieldsToDecrypt: string[],
    userId?: string,
  ): Promise<FieldDecryptionResult> {
    try {
      const decryptedData = { ...data };
      const decryptedFields: string[] = [];

      for (const fieldPath of fieldsToDecrypt) {
        const encryptedField = this.getNestedValue(data, fieldPath) as PQCEncryptedField;

        if (encryptedField && this.isEncryptedField(encryptedField)) {
          const decryptionResult = await this.encryptionService.decryptData(encryptedField, { userId });

          if (decryptionResult.success) {
            this.setNestedValue(decryptedData, fieldPath, decryptionResult.decryptedData);
            decryptedFields.push(fieldPath);
          } else {
            this.logger.warn(`Failed to decrypt field ${fieldPath}: ${decryptionResult.error}`);
          }
        }
      }

      return {
        success: true,
        decryptedData,
        decryptedFields,
      };
    } catch (error) {
      this.logger.error(`Field decryption failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async encryptSelectiveFields(
    data: any,
    encryptionRules: Record<string, EncryptionOptions>,
  ): Promise<FieldEncryptionResult> {
    try {
      const encryptedData = { ...data };
      const encryptedFields: string[] = [];

      for (const [fieldPath, options] of Object.entries(encryptionRules)) {
        const fieldValue = this.getNestedValue(data, fieldPath);

        if (fieldValue !== undefined && fieldValue !== null) {
          const encryptionResult = await this.encryptionService.encryptData(fieldValue, options);

          if (encryptionResult.success) {
            this.setNestedValue(encryptedData, fieldPath, encryptionResult.encryptedField);
            encryptedFields.push(fieldPath);
          }
        }
      }

      return {
        success: true,
        encryptedData,
        encryptedFields,
      };
    } catch (error) {
      this.logger.error(`Selective field encryption failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  private isEncryptedField(value: any): value is PQCEncryptedField {
    return (
      value &&
      typeof value === 'object' &&
      typeof value.encryptedData === 'string' &&
      typeof value.algorithm === 'string' &&
      typeof value.keyId === 'string' &&
      typeof value.nonce === 'string' &&
      value.timestamp instanceof Date
    );
  }

  async validateEncryptedFields(data: any, fieldPaths: string[]): Promise<boolean> {
    try {
      for (const fieldPath of fieldPaths) {
        const encryptedField = this.getNestedValue(data, fieldPath) as PQCEncryptedField;

        if (encryptedField && this.isEncryptedField(encryptedField)) {
          const isValid = await this.encryptionService.validateEncryptedData(encryptedField);
          if (!isValid) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Field validation failed: ${error.message}`);
      return false;
    }
  }
}
