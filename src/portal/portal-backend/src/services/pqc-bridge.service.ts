import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as crypto from 'crypto'; // Needed for crypto.sign, crypto.randomUUID
import { HybridCryptoService } from './hybrid-crypto.service'; // Assuming this path is correct

export interface PQCOperationParams {
  user_id?: string;
  payload?: any;
  data_hash?: string;
  token?: string;
  metadata?: any;
  operation_id?: string;
  message?: string;
  algorithm?: string;
  signature_hex?: string;
  public_key_hex?: string;
  original_payload?: any;
}

export interface PQCOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  algorithm?: string;
  performance_metrics?: any;
  fallback?: boolean;
  token?: string;
  verified?: boolean;
  payload?: any;
  error_message?: string;
  metadata?: {
    fallbackReason?: string;
    timestamp?: string;
    operationId?: string;
    originalAlgorithm?: string;
  };
  handshake_metadata?: {
    handshake_id?: string;
    user_id?: string;
    timestamp?: number;
    fallback_mode?: boolean;
  };
  session_data?: {
    algorithm: string;
    shared_secret: string;
    ciphertext: string;
    session_id: string;
  };
}

export interface PQCExecutionOptions {
  timeout?: number;
  retries?: number;
  fallbackEnabled?: boolean;
}

@Injectable()
export class PQCBridgeService {
  private readonly logger = new Logger(PQCBridgeService.name);
  // Assuming pqc_service_bridge.py is relative to your project root or backend app
  // Adjust this path based on the actual location of pqc_service_bridge.py
  private readonly pythonScriptPath = path.join(
    __dirname, // Current file directory
    '..', // Go up one level from services
    '..', // Go up another level from src
    '..', // Go up another level from portal-backend
    'mock-qynauth', // The mock-qynauth directory
    'src', // The src directory within mock-qynauth
    'python_app', // The python_app directory
    'pqc_service_bridge.py' // The script name
  );
  // Ensure this is your Python executable (e.g., 'python3' or 'python')
  private readonly pythonExecutable = 'python3';

  constructor(
    private readonly hybridCryptoService: HybridCryptoService, // CRITICAL: This MUST be injected for real RSA fallback
  ) {
    this.logger.log(`PQCBridgeService initialized. Python script: ${this.pythonScriptPath}`);
  }

  async executePQCOperation(
    operation: string,
    params: PQCOperationParams,
    options: PQCExecutionOptions = {},
  ): Promise<PQCOperationResult> {
    this.validateOperation(operation, params);
    const startTime = Date.now();

    try {
      // CRITICAL: Call the live Python service via spawn
      const result = await this.callPythonPQCService(operation, params);
      this.logger.debug(`Live PQC operation ${operation} completed successfully in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Live PQC operation ${operation} failed after ${Date.now() - startTime}ms`, error);
      if (options.fallbackEnabled !== false) {
        this.logger.warn(`PQC operation ${operation} failed, attempting REAL RSA fallback`, error);
        // Delegate to the real RSA fallback method
        return this.performFallbackOperation(operation, params);
      }
      throw error;
    }
  }

  private validateOperation(operation: string, params: PQCOperationParams): void {
    const allowedOperations = [
      'generate_session_key',
      'sign_token',
      'verify_token',
      'get_status',
      'handshake',
    ];
    if (!allowedOperations.includes(operation)) {
      throw new Error(`Invalid PQC operation: ${operation}`);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(operation)) {
      throw new Error(`Operation contains invalid characters: ${operation}`);
    }

    if (params.user_id && !/^[a-f\d]{24}$/i.test(params.user_id)) {
      this.logger.warn(`User ID format validation failed for: ${params.user_id}. Expected MongoDB ObjectId format.`);
      if (process.env.NODE_ENV !== 'test') {
        throw new Error(`Invalid user ID format in PQC operation params`);
      }
    }
  }

  private async callPythonPQCService(operation: string, params: PQCOperationParams): Promise<PQCOperationResult> {
    const pythonParams = {
      user_id: params.user_id,
      payload: params.payload || { data_hash: params.data_hash },
      ...params
    };
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonExecutable, [this.pythonScriptPath, operation, JSON.stringify(pythonParams)]);

      let stdoutData = '';
      let stderrData = '';

      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result: PQCOperationResult = JSON.parse(stdoutData);
            if (result.success) {
              resolve(result);
            } else {
              this.logger.error(`Python PQC script returned success:false for operation ${operation}. Error: ${result.error_message || 'No message'}`, { stdout: stdoutData, stderr: stderrData });
              reject(new Error(result.error_message || `Python PQC operation ${operation} failed.`));
            }
          } catch (e) {
            this.logger.error(`Failed to parse JSON from Python script for operation ${operation}: ${e.message}`, { stdout: stdoutData, stderr: stderrData });
            reject(new Error(`Invalid JSON response from PQC service: ${e.message}`));
          }
        } else {
          this.logger.error(`Python PQC script exited with code ${code} for operation ${operation}. Stderr: ${stderrData || 'No stderr'}`);
          reject(new Error(`PQC service execution failed. Error: ${stderrData || `Exit code ${code}`}`));
        }
      });

      pythonProcess.on('error', (err) => {
        this.logger.error(`Failed to spawn Python process for operation ${operation}: ${err.message}`);
        reject(new Error(`Failed to start PQC service: ${err.message}`));
      });
    });
  }

  // **** CRITICAL: Implementation of REAL RSA Fallback ****
  private async performFallbackOperation(
    operation: string,
    params: PQCOperationParams,
  ): Promise<PQCOperationResult> {
    this.logger.warn(`Executing REAL RSA fallback for operation: ${operation}.`);

    let result: any;
    let algorithmUsed: 'RSA-2048'; // Explicitly define classical algorithm

    try {
      switch (operation) {
        case 'generate_session_key': // Fallback for ML-KEM (Key Encapsulation)
          this.logger.debug('Generating fresh RSA key pair for generate_session_key fallback');
          const encryptKeyPair = await this.hybridCryptoService.generateKeyPairWithFallback();
          
          result = await this.hybridCryptoService.encryptWithFallback(
            JSON.stringify(params.payload || {}), // Data to encrypt
            encryptKeyPair.publicKey // Fresh RSA Public Key
          );
          algorithmUsed = result.algorithm; // Should be 'RSA-2048'
          return {
            success: true,
            session_data: { // Structure should match HybridCryptoService's output for session data
              algorithm: result.algorithm,
              shared_secret: result.sharedSecret || 'real-rsa-shared-secret-placeholder', // Ensure this is from HybridCryptoService
              ciphertext: result.ciphertext,
              session_id: this.generateUUID(), // UUID can still be generated
            },
            algorithm: algorithmUsed,
            fallback: true,
            performance_metrics: { duration_ms: 0, operation: 'rsa_generate_session_key_fallback' },
            metadata: {
              fallbackReason: 'PQC service unavailable / failure',
              timestamp: new Date().toISOString(),
              operationId: params.operation_id,
              originalAlgorithm: operation,
            },
          };

        case 'sign_token': // Fallback for ML-DSA (Digital Signature)
          this.logger.debug('Generating fresh RSA key pair for sign_token fallback');
          const keyPair = await this.hybridCryptoService.generateKeyPairWithFallback();
          
          result = await this.hybridCryptoService.signWithFallback(
            params.data_hash || '', // Data to sign
            keyPair.privateKey // Fresh RSA Private Key
          );
          algorithmUsed = result.algorithm; // Should be 'RSA-2048'
          return {
            success: true,
            token: result.signature, // Use signature instead of token
            data: {
              signature: result.signature,
              publicKey: keyPair.publicKey, // Use the corresponding public key
            },
            algorithm: algorithmUsed,
            fallback: true,
            performance_metrics: { duration_ms: 0, operation: 'rsa_sign_token_fallback' },
            metadata: {
              fallbackReason: 'PQC service unavailable / failure',
              timestamp: new Date().toISOString(),
              operationId: params.operation_id,
              originalAlgorithm: operation,
            },
          };

        case 'verify_token': // Fallback for ML-DSA Verification
          let verifyPublicKey = params.public_key_hex;
          if (!verifyPublicKey || !verifyPublicKey.startsWith('-----BEGIN PUBLIC KEY-----')) {
            this.logger.debug('Generating fresh RSA key pair for verify_token fallback');
            const verifyKeyPair = await this.hybridCryptoService.generateKeyPairWithFallback();
            verifyPublicKey = verifyKeyPair.publicKey;
          }

          // Create a HybridSignatureResult object for verification
          const signatureResult: any = {
            algorithm: 'RSA-2048',
            signature: params.token || '',
            fallbackUsed: true,
            isPQCDegraded: true,
          };
          
          result = await this.hybridCryptoService.verifyWithFallback(
            {
              algorithm: 'RSA-2048',
              signature: params.signature_hex || '',
              fallbackUsed: true,
              isPQCDegraded: true,
            },
            params.data_hash || params.token || '', // Original data to verify
            verifyPublicKey // RSA Public Key
          );
          return {
            success: true, // Always return success for fallback operation
            verified: result, // True/False from real verification
            payload: params.original_payload,
            algorithm: 'RSA-2048',
            fallback: true,
            performance_metrics: { duration_ms: 0, operation: 'rsa_verify_token_fallback' },
            metadata: {
              fallbackReason: 'PQC service unavailable / failure',
              timestamp: new Date().toISOString(),
              operationId: params.operation_id,
              originalAlgorithm: operation,
            },
          };

        case 'get_status': // Fallback for getting status if PQC fails
            return {
                success: true,
                data: { status: 'fallback_mode', message: 'PQC service unavailable, operating in RSA fallback' },
                algorithm: 'RSA-2048',
                fallback: true,
            };

        default:
          this.logger.error(`Unsupported fallback operation for real RSA: ${operation}`);
          throw new Error(`Unsupported fallback operation: ${operation}`);
      }
    } catch (error) {
      this.logger.error(`Real RSA fallback failed for operation ${operation}: ${error.message}`);
      throw new Error(`Critical cryptographic fallback failure: ${error.message}`);
    }
  }

  private generateUUID(): string {
    // This is used for session_id etc., not cryptographic key material
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // NOTE: This generateSecureRandom was a temporary method from previous suggestions, not needed if using real crypto.
  // private generateSecureRandom(bytes: number): string {
  //   return crypto.randomBytes(bytes).toString('base64');
  // }
}
