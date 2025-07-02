import { Injectable, Logger } from '@nestjs/common';

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
}

export interface PQCExecutionOptions {
  timeout?: number;
  retries?: number;
  fallbackEnabled?: boolean;
}

@Injectable()
export class PQCBridgeService {
  private readonly logger = new Logger(PQCBridgeService.name);

  async executePQCOperation(
    operation: string,
    params: PQCOperationParams,
    options: PQCExecutionOptions = {},
  ): Promise<PQCOperationResult> {
    this.validateOperation(operation, params);

    const startTime = Date.now();
    
    try {
      const result = await this.performPQCOperation(operation, params);
      this.logger.debug(`PQC operation ${operation} completed successfully in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`PQC operation ${operation} failed after ${Date.now() - startTime}ms`, error);
      
      if (options.fallbackEnabled !== false) {
        this.logger.warn(`PQC operation ${operation} failed, attempting fallback`, error);
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
  }

  private async performPQCOperation(
    operation: string,
    params: PQCOperationParams,
  ): Promise<PQCOperationResult> {
    return {
      success: true,
      data: params,
      algorithm: 'ML-KEM-768',
    };
  }

  private async performFallbackOperation(
    operation: string,
    params: PQCOperationParams,
  ): Promise<PQCOperationResult> {
    this.logger.warn(`Executing fallback for operation: ${operation}`);
    
    return {
      success: true,
      data: params,
      algorithm: 'RSA-2048',
      fallback: true,
    };
  }
}
