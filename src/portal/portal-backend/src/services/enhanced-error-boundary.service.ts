import { Injectable, Logger } from '@nestjs/common';

export enum PQCErrorCategory {
  CRYPTO_OPERATION = 'CRYPTO_OPERATION',
  MEMORY_MANAGEMENT = 'MEMORY_MANAGEMENT',
  FFI_BRIDGE = 'FFI_BRIDGE',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  CONFIGURATION = 'CONFIGURATION'
}

export interface ErrorBoundaryOptions {
  category?: PQCErrorCategory;
  retryCount?: number;
  fallbackEnabled?: boolean;
  logLevel?: 'error' | 'warn' | 'debug';
}

@Injectable()
export class EnhancedErrorBoundaryService {
  private readonly logger = new Logger(EnhancedErrorBoundaryService.name);

  async executeWithErrorBoundary<T>(
    operation: () => Promise<T>,
    options: ErrorBoundaryOptions = {}
  ): Promise<T> {
    const {
      category = PQCErrorCategory.CRYPTO_OPERATION,
      retryCount = 0,
      fallbackEnabled = false,
      logLevel = 'error'
    } = options;

    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        this.logger[logLevel](`Error in ${category} operation (attempt ${attempt + 1}/${retryCount + 1}): ${error.message}`);
        
        if (attempt < retryCount) {
          await this.delay(Math.pow(2, attempt) * 100);
        }
      }
    }

    if (fallbackEnabled) {
      this.logger.warn(`All retries exhausted for ${category}, attempting fallback`);
    }

    if (!lastError) {
      throw new Error(`Operation failed without specific error details`);
    }
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  logCryptoError(error: Error, context: string): void {
    this.logger.error(`Crypto operation failed in ${context}: ${error.message}`, error.stack);
  }

  logMemoryError(error: Error, operation: string): void {
    this.logger.error(`Memory management error in ${operation}: ${error.message}`, error.stack);
  }

  logFFIError(error: Error, functionName: string): void {
    this.logger.error(`FFI bridge error in ${functionName}: ${error.message}`, error.stack);
  }
}
