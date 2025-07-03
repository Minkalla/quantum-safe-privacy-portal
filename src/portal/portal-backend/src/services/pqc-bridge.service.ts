import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import { HybridCryptoService } from './hybrid-crypto.service';

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
  private readonly pythonScriptPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'portal',
    'mock-qynauth',
    'src',
    'python_app',
    'pqc_service_bridge.py'
  );
  private readonly pythonExecutable = 'python3';

  constructor(
    private readonly hybridCryptoService: HybridCryptoService,
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
      const result = await this.callPythonPQCService(operation, params);
      this.logger.debug(`Live PQC operation ${operation} completed successfully in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Live PQC operation ${operation} failed after ${Date.now() - startTime}ms`, error);
      
      if (options.fallbackEnabled !== false) {
        this.logger.warn(`PQC operation ${operation} failed, attempting fallback to RSA`, error);
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
    return new Promise((resolve, reject) => {
      const paramsJson = JSON.stringify(params);
      this.logger.debug(`Calling Python script for operation ${operation} with parameters: ${paramsJson}`);
      
      const pythonProcess = spawn(this.pythonExecutable, [this.pythonScriptPath, operation, paramsJson]);

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

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private async performFallbackOperation(
    operation: string,
    params: PQCOperationParams,
  ): Promise<PQCOperationResult> {
    this.logger.warn(`Executing fallback for operation: ${operation}. Delegating to real RSA.`);

    const startTime = Date.now();
    let fallbackResult: any;
    let algorithmUsed = 'RSA-2048';

    try {
      switch (operation) {
        case 'generate_session_key': {
          const keyPair = await this.hybridCryptoService.generateKeyPairWithFallback();
          
          const sessionPayload = JSON.stringify({
            user_id: params.user_id,
            timestamp: Date.now(),
            session_id: this.generateUUID(),
          });
          
          const encryptionResult = await this.hybridCryptoService.encryptWithFallback(
            sessionPayload,
            keyPair.publicKey
          );
          
          algorithmUsed = encryptionResult.algorithm;
          
          return {
            success: true,
            algorithm: algorithmUsed,
            fallback: true,
            session_data: {
              algorithm: algorithmUsed,
              shared_secret: keyPair.privateKey, // Private key acts as shared secret in RSA fallback
              ciphertext: encryptionResult.ciphertext,
              session_id: this.generateUUID(),
            },
            performance_metrics: {
              duration_ms: Date.now() - startTime,
              operation: operation,
              fallback_used: true,
            },
            metadata: {
              fallbackReason: 'PQC service unavailable',
              timestamp: new Date().toISOString(),
              operationId: params.operation_id,
              originalAlgorithm: 'ML-KEM-768',
            },
          };
        }
        
        case 'sign_token': {
          const keyPair = await this.hybridCryptoService.generateKeyPairWithFallback();
          
          const messageToSign = params.data_hash || params.message || JSON.stringify(params.payload || {});
          
          const signatureResult = await this.hybridCryptoService.signWithFallback(
            messageToSign,
            keyPair.privateKey
          );
          
          algorithmUsed = signatureResult.algorithm;
          
          return {
            success: true,
            algorithm: algorithmUsed,
            fallback: true,
            token: signatureResult.signature,
            data: {
              signature: signatureResult.signature,
              publicKey: keyPair.publicKey,
              message: messageToSign,
            },
            performance_metrics: {
              duration_ms: Date.now() - startTime,
              operation: operation,
              fallback_used: true,
            },
            metadata: {
              fallbackReason: 'PQC service unavailable',
              timestamp: new Date().toISOString(),
              operationId: params.operation_id,
              originalAlgorithm: 'ML-DSA-65',
            },
          };
        }
        
        case 'verify_token': {
          const messageToVerify = params.data_hash || params.message || JSON.stringify(params.original_payload || {});
          const publicKey = params.public_key_hex || '';
          const signatureHex = params.signature_hex || params.token || '';
          
          if (!publicKey || !signatureHex) {
            throw new Error('Missing required parameters for signature verification: public_key_hex and signature_hex');
          }
          
          const signatureResult = {
            algorithm: (params.algorithm || 'RSA-2048') as 'ML-DSA-65' | 'RSA-2048',
            signature: signatureHex,
            fallbackUsed: true,
            isPQCDegraded: true,
            metadata: {
              timestamp: new Date().toISOString(),
              fallbackReason: 'PQC service unavailable',
            },
          };
          
          const isValid = await this.hybridCryptoService.verifyWithFallback(
            signatureResult,
            messageToVerify,
            publicKey
          );
          
          return {
            success: true,
            algorithm: algorithmUsed,
            fallback: true,
            verified: isValid,
            payload: params.original_payload || params.payload || params,
            performance_metrics: {
              duration_ms: Date.now() - startTime,
              operation: operation,
              fallback_used: true,
            },
            metadata: {
              fallbackReason: 'PQC service unavailable',
              timestamp: new Date().toISOString(),
              operationId: params.operation_id,
              originalAlgorithm: 'ML-DSA-65',
            },
          };
        }
        
        default: {
          this.logger.error(`Unsupported fallback operation: ${operation}`);
          throw new Error(`Unsupported fallback operation: ${operation}`);
        }
      }
    } catch (error) {
      this.logger.error(`Real RSA fallback failed for operation ${operation}: ${error.message}`);
      throw new Error(`Critical cryptographic fallback failure: ${error.message}`);
    }
  }
}
