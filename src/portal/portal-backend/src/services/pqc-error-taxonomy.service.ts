import { Injectable, Logger } from '@nestjs/common';

export interface PQCError {
  code: string;
  category: 'MEMORY' | 'CRYPTO' | 'NETWORK' | 'VALIDATION' | 'SYSTEM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class PQCErrorTaxonomyService {
  private readonly logger = new Logger(PQCErrorTaxonomyService.name);

  classifyError(error: Error, context?: Record<string, any>): PQCError {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('segfault') || errorMessage.includes('munmap_chunk')) {
      return {
        code: 'PQC_MEMORY_001',
        category: 'MEMORY',
        severity: 'CRITICAL',
        message: 'Memory management error in PQC FFI',
        context: { ...context, originalError: error.message },
        timestamp: new Date(),
      };
    }

    if (errorMessage.includes('invalid pointer') || errorMessage.includes('double free')) {
      return {
        code: 'PQC_MEMORY_002',
        category: 'MEMORY',
        severity: 'HIGH',
        message: 'Pointer management error in FFI layer',
        context: { ...context, originalError: error.message },
        timestamp: new Date(),
      };
    }

    if (errorMessage.includes('key generation') || errorMessage.includes('signature')) {
      return {
        code: 'PQC_CRYPTO_001',
        category: 'CRYPTO',
        severity: 'HIGH',
        message: 'Cryptographic operation failure',
        context: { ...context, originalError: error.message },
        timestamp: new Date(),
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        code: 'PQC_NETWORK_001',
        category: 'NETWORK',
        severity: 'MEDIUM',
        message: 'Network communication error',
        context: { ...context, originalError: error.message },
        timestamp: new Date(),
      };
    }

    return {
      code: 'PQC_SYSTEM_001',
      category: 'SYSTEM',
      severity: 'MEDIUM',
      message: 'Unclassified PQC system error',
      context: { ...context, originalError: error.message },
      timestamp: new Date(),
    };
  }

  logError(pqcError: PQCError): void {
    const logMessage = `[${pqcError.code}] ${pqcError.message}`;

    switch (pqcError.severity) {
    case 'CRITICAL':
      this.logger.error(logMessage, pqcError.context);
      break;
    case 'HIGH':
      this.logger.error(logMessage, pqcError.context);
      break;
    case 'MEDIUM':
      this.logger.warn(logMessage, pqcError.context);
      break;
    case 'LOW':
      this.logger.log(logMessage, pqcError.context);
      break;
    }
  }

  getErrorMetrics(): Record<string, number> {
    return {
      memoryErrors: 0,
      cryptoErrors: 0,
      networkErrors: 0,
      validationErrors: 0,
      systemErrors: 0,
    };
  }
}
