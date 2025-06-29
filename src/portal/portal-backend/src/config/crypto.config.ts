export interface CryptoConfig {
  pqc: {
    enabled: boolean;
    fallbackEnabled: boolean;
    algorithms: string[];
    keyRotationInterval: number;
    performanceThreshold: number;
  };
  classical: {
    rsa: {
      keySize: number;
      padding: string;
      hash: string;
    };
    aes: {
      keySize: number;
      mode: string;
      ivLength: number;
    };
  };
  migration: {
    batchSize: number;
    enabled: boolean;
    retryAttempts: number;
    delayBetweenBatches: number;
  };
  monitoring: {
    fallbackAlertThreshold: number;
    performanceAlertThreshold: number;
    healthCheckInterval: number;
  };
  security: {
    keyExpirationDays: number;
    auditLogEnabled: boolean;
    encryptionAtRest: boolean;
  };
}

export const CryptoConfig: CryptoConfig = {
  pqc: {
    enabled: process.env.PQC_ENABLED === 'true',
    fallbackEnabled: process.env.PQC_FALLBACK_ENABLED !== 'false',
    algorithms: ['ML-KEM-768', 'ML-DSA-65'],
    keyRotationInterval: parseInt(process.env.PQC_KEY_ROTATION_HOURS || '168') * 60 * 60 * 1000, // 7 days default
    performanceThreshold: parseInt(process.env.PQC_PERFORMANCE_THRESHOLD_MS || '1000'), // 1 second default
  },
  classical: {
    rsa: {
      keySize: parseInt(process.env.RSA_KEY_SIZE || '2048'),
      padding: process.env.RSA_PADDING || 'OAEP',
      hash: process.env.RSA_HASH || 'SHA-256',
    },
    aes: {
      keySize: parseInt(process.env.AES_KEY_SIZE || '256'),
      mode: process.env.AES_MODE || 'GCM',
      ivLength: parseInt(process.env.AES_IV_LENGTH || '16'),
    },
  },
  migration: {
    batchSize: parseInt(process.env.MIGRATION_BATCH_SIZE || '100'),
    enabled: process.env.MIGRATION_ENABLED === 'true',
    retryAttempts: parseInt(process.env.MIGRATION_RETRY_ATTEMPTS || '3'),
    delayBetweenBatches: parseInt(process.env.MIGRATION_DELAY_MS || '1000'),
  },
  monitoring: {
    fallbackAlertThreshold: parseFloat(process.env.FALLBACK_ALERT_THRESHOLD || '0.1'), // 10% fallback usage
    performanceAlertThreshold: parseInt(process.env.PERFORMANCE_ALERT_THRESHOLD_MS || '2000'),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '30000'), // 30 seconds
  },
  security: {
    keyExpirationDays: parseInt(process.env.KEY_EXPIRATION_DAYS || '90'),
    auditLogEnabled: process.env.AUDIT_LOG_ENABLED === 'true',
    encryptionAtRest: process.env.ENCRYPTION_AT_REST_ENABLED !== 'false',
  },
};

export const getCryptoConfig = (): CryptoConfig => {
  return CryptoConfig;
};

export const validateCryptoConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (CryptoConfig.classical.rsa.keySize < 2048) {
    errors.push('RSA key size must be at least 2048 bits for security');
  }
  
  if (CryptoConfig.classical.aes.keySize !== 256) {
    errors.push('AES key size must be 256 bits for quantum-safe security');
  }
  
  if (CryptoConfig.migration.batchSize > 1000) {
    errors.push('Migration batch size should not exceed 1000 for performance reasons');
  }
  
  if (CryptoConfig.pqc.performanceThreshold > 5000) {
    errors.push('PQC performance threshold should not exceed 5000ms for user experience');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

export const getEnvironmentSpecificConfig = (): Partial<CryptoConfig> => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        pqc: {
          enabled: true,
          fallbackEnabled: true,
          algorithms: ['ML-KEM-768', 'ML-DSA-65'],
          keyRotationInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
          performanceThreshold: 500, // Stricter in production
        },
        migration: {
          batchSize: 50, // Smaller batches in production
          enabled: true,
          retryAttempts: 5,
          delayBetweenBatches: 2000, // Longer delays in production
        },
        security: {
          keyExpirationDays: 30, // Shorter expiration in production
          auditLogEnabled: true,
          encryptionAtRest: true,
        },
      };
    
    case 'staging':
      return {
        pqc: {
          enabled: true,
          fallbackEnabled: true,
          algorithms: ['ML-KEM-768', 'ML-DSA-65'],
          keyRotationInterval: 24 * 60 * 60 * 1000, // 1 day for testing
          performanceThreshold: 1000,
        },
        migration: {
          batchSize: 100,
          enabled: true,
          retryAttempts: 3,
          delayBetweenBatches: 1000,
        },
      };
    
    case 'development':
    default:
      return {
        pqc: {
          enabled: process.env.PQC_ENABLED === 'true',
          fallbackEnabled: true,
          algorithms: ['ML-KEM-768', 'ML-DSA-65'],
          keyRotationInterval: 60 * 60 * 1000, // 1 hour for development
          performanceThreshold: 2000, // More lenient in development
        },
        migration: {
          batchSize: 10, // Small batches for development testing
          enabled: process.env.MIGRATION_ENABLED === 'true',
          retryAttempts: 1,
          delayBetweenBatches: 500,
        },
        security: {
          keyExpirationDays: 7, // Short expiration for development
          auditLogEnabled: false,
          encryptionAtRest: false,
        },
      };
  }
};
