import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface ClassicalEncryptionResult {
  encryptedData: string;
  keyId?: string;
  metadata?: any;
}

export interface ClassicalSignatureResult {
  signature: string;
  keyId?: string;
  metadata?: any;
}

export interface ClassicalVerificationResult {
  isValid: boolean;
  metadata?: any;
}

export interface ClassicalKeyPair {
  publicKey: string;
  privateKey: string;
  keyId?: string;
}

@Injectable()
export class ClassicalCryptoService {
  private readonly logger = new Logger(ClassicalCryptoService.name);

  async encryptRSA(data: string, publicKey: string): Promise<ClassicalEncryptionResult> {
    try {
      this.logger.debug('Performing RSA-2048 encryption');

      let formattedPublicKey = publicKey;
      if (!publicKey.startsWith('-----BEGIN')) {
        this.logger.debug('Public key missing PEM headers, wrapping in PEM format');
        formattedPublicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
      }

      const buffer = Buffer.from(data, 'utf8');
      const encrypted = crypto.publicEncrypt(
        {
          key: formattedPublicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer,
      );

      const encryptedData = encrypted.toString('base64');

      this.logger.debug('RSA encryption completed successfully');

      return {
        encryptedData,
        metadata: {
          algorithm: 'RSA-2048',
          padding: 'OAEP',
          hash: 'SHA-256',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`RSA encryption failed: ${error.message}`);
      throw new Error(`RSA encryption failed: ${error.message}`);
    }
  }

  async decryptRSA(encryptedData: string, privateKey: string): Promise<ClassicalEncryptionResult> {
    try {
      this.logger.debug('Performing RSA-2048 decryption');

      let formattedPrivateKey = privateKey;
      if (!privateKey.startsWith('-----BEGIN')) {
        this.logger.debug('Private key missing PEM headers, wrapping in PEM format');
        formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }

      const buffer = Buffer.from(encryptedData, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: formattedPrivateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer,
      );

      const decryptedData = decrypted.toString('utf8');

      this.logger.debug('RSA decryption completed successfully');

      return {
        encryptedData: decryptedData, // Reusing interface, this is actually decrypted data
        metadata: {
          algorithm: 'RSA-2048',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`RSA decryption failed: ${error.message}`);
      throw new Error(`RSA decryption failed: ${error.message}`);
    }
  }

  async encryptAES(data: string, key?: string): Promise<ClassicalEncryptionResult> {
    try {
      this.logger.debug('Performing AES-256-GCM encryption');

      const encryptionKey = key ? Buffer.from(key, 'hex') : crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
      cipher.setAAD(Buffer.from('quantum-safe-privacy-portal', 'utf8'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      const result = {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        key: encryptionKey.toString('hex'),
      };

      const encryptedData = Buffer.from(JSON.stringify(result)).toString('base64');

      this.logger.debug('AES encryption completed successfully');

      return {
        encryptedData,
        metadata: {
          algorithm: 'AES-256-GCM',
          keyLength: 256,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`AES encryption failed: ${error.message}`);
      throw new Error(`AES encryption failed: ${error.message}`);
    }
  }

  async decryptAES(encryptedData: string): Promise<ClassicalEncryptionResult> {
    try {
      this.logger.debug('Performing AES-256-GCM decryption');

      const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      const { encrypted, iv, authTag, key } = data;

      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
      decipher.setAAD(Buffer.from('quantum-safe-privacy-portal', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      this.logger.debug('AES decryption completed successfully');

      return {
        encryptedData: decrypted, // Reusing interface, this is actually decrypted data
        metadata: {
          algorithm: 'AES-256-GCM',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`AES decryption failed: ${error.message}`);
      throw new Error(`AES decryption failed: ${error.message}`);
    }
  }

  async signRSA(message: string, privateKey: string): Promise<ClassicalSignatureResult> {
    try {
      this.logger.debug('Performing RSA-PSS signature generation');

      let formattedPrivateKey = privateKey;
      
      if (!privateKey || privateKey.trim() === '' || privateKey === 'undefined') {
        this.logger.debug('No valid private key provided, generating new RSA key pair');
        const keyPair = await this.generateRSAKeyPair();
        formattedPrivateKey = keyPair.privateKey;
      } else if (!privateKey.startsWith('-----BEGIN')) {
        this.logger.debug('Private key missing PEM headers, wrapping in PEM format');
        formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }

      const signature = crypto.sign('sha256', Buffer.from(message, 'utf8'), {
        key: formattedPrivateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      });

      const signatureBase64 = signature.toString('base64');

      this.logger.debug('RSA signature generation completed successfully');

      return {
        signature: signatureBase64,
        metadata: {
          algorithm: 'RSA-PSS',
          hash: 'SHA-256',
          saltLength: 'digest',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`RSA signature generation failed: ${error.message}`);
      throw new Error(`RSA signature generation failed: ${error.message}`);
    }
  }

  async verifyRSA(signature: string, message: string, publicKey: string): Promise<ClassicalVerificationResult> {
    try {
      this.logger.debug('Performing RSA-PSS signature verification');

      let formattedPublicKey = publicKey;
      if (!publicKey.startsWith('-----BEGIN')) {
        this.logger.debug('Public key missing PEM headers, wrapping in PEM format');
        formattedPublicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
      }

      const signatureBuffer = Buffer.from(signature, 'base64');
      const messageBuffer = Buffer.from(message, 'utf8');

      const isValid = crypto.verify(
        'sha256',
        messageBuffer,
        {
          key: formattedPublicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        },
        signatureBuffer,
      );

      this.logger.debug(`RSA signature verification completed: ${isValid ? 'valid' : 'invalid'}`);

      return {
        isValid,
        metadata: {
          algorithm: 'RSA-PSS',
          hash: 'SHA-256',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`RSA signature verification failed: ${error.message}`);
      throw new Error(`RSA signature verification failed: ${error.message}`);
    }
  }

  async generateRSAKeyPair(): Promise<ClassicalKeyPair> {
    try {
      this.logger.debug('Generating RSA-2048 key pair');

      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      const keyId = crypto.randomBytes(16).toString('hex');

      this.logger.debug('RSA key pair generation completed successfully');

      return {
        publicKey,
        privateKey,
        keyId,
      };
    } catch (error) {
      this.logger.error(`RSA key pair generation failed: ${error.message}`);
      throw new Error(`RSA key pair generation failed: ${error.message}`);
    }
  }

  async generateAESKey(): Promise<{ key: string; keyId: string }> {
    try {
      this.logger.debug('Generating AES-256 key');

      const key = crypto.randomBytes(32);
      const keyId = crypto.randomBytes(16).toString('hex');

      this.logger.debug('AES key generation completed successfully');

      return {
        key: key.toString('hex'),
        keyId,
      };
    } catch (error) {
      this.logger.error(`AES key generation failed: ${error.message}`);
      throw new Error(`AES key generation failed: ${error.message}`);
    }
  }

  async healthCheck(): Promise<void> {
    try {
      const testData = 'health-check-test';
      const keyPair = await this.generateRSAKeyPair();

      const encrypted = await this.encryptRSA(testData, keyPair.publicKey);
      const decrypted = await this.decryptRSA(encrypted.encryptedData, keyPair.privateKey);

      if (decrypted.encryptedData !== testData) {
        throw new Error('Health check encryption/decryption mismatch');
      }

      const signature = await this.signRSA(testData, keyPair.privateKey);
      const verification = await this.verifyRSA(signature.signature, testData, keyPair.publicKey);

      if (!verification.isValid) {
        throw new Error('Health check signature verification failed');
      }

      this.logger.debug('Classical crypto service health check passed');
    } catch (error) {
      this.logger.error(`Classical crypto service health check failed: ${error.message}`);
      throw error;
    }
  }
}
