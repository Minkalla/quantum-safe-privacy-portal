export interface PQCEncryptedField {
  encryptedData: string;
  algorithm: string;
  keyId: string;
  nonce: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PQCSignature {
  signature: string;
  algorithm: string;
  publicKeyHash: string;
  timestamp: Date;
  signedDataHash: string;
  metadata?: Record<string, any>;
}

export interface PQCDataIntegrity {
  hash: string;
  algorithm: string;
  signature?: PQCSignature;
  timestamp: Date;
  validationStatus: 'valid' | 'invalid' | 'pending';
  lastValidated?: Date;
}

export interface PQCKeyPairMetadata {
  keyId: string;
  algorithm: string;
  keySize: number;
  generatedAt: Date;
  expiresAt?: Date;
  usage: 'encryption' | 'signing' | 'both';
  status: 'active' | 'revoked' | 'expired';
}

export interface PQCProtectionMetadata {
  protectionMode: 'classical' | 'pqc' | 'hybrid';
  encryptionAlgorithm?: string;
  signingAlgorithm?: string;
  keyRotationSchedule?: string;
  complianceLevel: 'basic' | 'enhanced' | 'maximum';
}

export enum PQCAlgorithmType {
  KYBER_768 = 'Kyber-768',
  DILITHIUM_3 = 'Dilithium-3',
  ML_KEM_768 = 'ML-KEM-768',
  ML_DSA_65 = 'ML-DSA-65',
  AES_256_GCM = 'AES-256-GCM',
  RSA_2048 = 'RSA-2048',
  HYBRID = 'Hybrid'
}

export interface PQCValidationResult {
  isValid: boolean;
  algorithm: string;
  timestamp: Date;
  errors: string[];
  warnings: string[];
  performanceMetrics?: {
    validationTime: number;
    memoryUsage: number;
  };
}
