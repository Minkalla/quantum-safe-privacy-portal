import { AuditTrailService } from '../monitoring/audit-trail.service';

/**
 * CryptoFallbackError class for signaling when PQC operations fall back to classical cryptography
 * This error class helps with audit logging and incident forensics by tracking PQC → classical transitions
 */
export class CryptoFallbackError extends Error {
  public readonly name = 'CryptoFallbackError';
  public readonly timestamp: Date;
  public readonly fallbackReason: string;
  public readonly pqcAlgorithm: string;
  public readonly classicalAlgorithm: string;

  constructor(
    message: string,
    public readonly originalError: Error,
    public readonly fallbackUsed: boolean = true,
    options: {
      fallbackReason?: string;
      pqcAlgorithm?: string;
      classicalAlgorithm?: string;
    } = {}
  ) {
    super(message);
    this.timestamp = new Date();
    this.fallbackReason = options.fallbackReason || 'PQC operation failed';
    this.pqcAlgorithm = options.pqcAlgorithm || 'ML-DSA-65';
    this.classicalAlgorithm = options.classicalAlgorithm || 'RSA-2048';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CryptoFallbackError);
    }
  }

  /**
   * Log this fallback event to the audit trail for forensic analysis
   */
  async logToAuditTrail(auditService: AuditTrailService, userId?: string, operation?: string): Promise<void> {
    try {
      await auditService.logSecurityEvent(
        'CRYPTO_FALLBACK_TRIGGERED',
        {
          userId: userId || 'system',
          operation: operation || 'unknown',
          fallbackReason: this.fallbackReason,
          pqcAlgorithm: this.pqcAlgorithm,
          classicalAlgorithm: this.classicalAlgorithm,
          originalError: this.originalError.message,
          timestamp: this.timestamp.toISOString(),
          fallbackUsed: this.fallbackUsed,
        },
        'WARNING'
      );
    } catch (auditError) {
      console.error('Failed to log crypto fallback to audit trail:', auditError);
    }
  }

  /**
   * Create a CryptoFallbackError for PQC key generation failures
   */
  static forKeyGeneration(originalError: Error, pqcAlgorithm: string = 'ML-KEM-768'): CryptoFallbackError {
    return new CryptoFallbackError(
      `PQC key generation failed, falling back to classical cryptography: ${originalError.message}`,
      originalError,
      true,
      {
        fallbackReason: 'Key generation failure',
        pqcAlgorithm,
        classicalAlgorithm: 'RSA-2048',
      }
    );
  }

  /**
   * Create a CryptoFallbackError for PQC signature failures
   */
  static forSignature(originalError: Error, pqcAlgorithm: string = 'ML-DSA-65'): CryptoFallbackError {
    return new CryptoFallbackError(
      `PQC signature operation failed, falling back to classical cryptography: ${originalError.message}`,
      originalError,
      true,
      {
        fallbackReason: 'Signature operation failure',
        pqcAlgorithm,
        classicalAlgorithm: 'RSA-2048',
      }
    );
  }

  /**
   * Create a CryptoFallbackError for PQC encryption failures
   */
  static forEncryption(originalError: Error, pqcAlgorithm: string = 'ML-KEM-768'): CryptoFallbackError {
    return new CryptoFallbackError(
      `PQC encryption operation failed, falling back to classical cryptography: ${originalError.message}`,
      originalError,
      true,
      {
        fallbackReason: 'Encryption operation failure',
        pqcAlgorithm,
        classicalAlgorithm: 'RSA-2048',
      }
    );
  }

  /**
   * Create a CryptoFallbackError for PQC service unavailability
   */
  static forServiceUnavailable(originalError: Error): CryptoFallbackError {
    return new CryptoFallbackError(
      `PQC service unavailable, falling back to classical cryptography: ${originalError.message}`,
      originalError,
      true,
      {
        fallbackReason: 'PQC service unavailable',
        pqcAlgorithm: 'ML-DSA-65/ML-KEM-768',
        classicalAlgorithm: 'RSA-2048',
      }
    );
  }

  /**
   * Convert the error to a JSON object for logging and debugging
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      fallbackUsed: this.fallbackUsed,
      fallbackReason: this.fallbackReason,
      pqcAlgorithm: this.pqcAlgorithm,
      classicalAlgorithm: this.classicalAlgorithm,
      originalError: {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      },
      stack: this.stack,
    };
  }
}
