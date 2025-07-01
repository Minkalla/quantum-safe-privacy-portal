export enum AuthenticationMode {
  CLASSICAL = 'classical',
  PQC = 'pqc',
  HYBRID = 'hybrid'
}

export enum PQCAlgorithm {
  ML_KEM_768 = 'ML-KEM-768',
  ML_DSA_65 = 'ML-DSA-65',
  KYBER_768 = 'Kyber-768',
  DILITHIUM_3 = 'Dilithium-3'
}

export interface PQCKeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: PQCAlgorithm;
  keySize: number;
  timestamp: string;
}

export interface PQCSessionData {
  sessionId: string;
  sharedSecret: string;
  ciphertext: string;
  algorithm: PQCAlgorithm;
  createdAt: Date;
  expiresAt: Date;
  publicKeyHash: string;
  metadata?: Record<string, any>;
}

export interface PQCAuthResult {
  success: boolean;
  userId?: string;
  sessionData?: PQCSessionData;
  token?: string;
  algorithm?: PQCAlgorithm;
  errorMessage?: string;
  performanceMetrics?: Record<string, number>;
  fallbackUsed?: boolean;
}

export interface HybridAuthConfig {
  enableClassical: boolean;
  enablePQC: boolean;
  pqcEnabled: boolean;
  classicalFallback: boolean;
  hybridMode: boolean;
  preferredMode: AuthenticationMode;
  fallbackToClassical: boolean;
  pqcThreshold: number;
  supportedAlgorithms: PQCAlgorithm[];
}

export interface AuthenticationRequest {
  email: string;
  password: string;
  authMode?: AuthenticationMode;
  rememberMe?: boolean;
  usePQC?: boolean;
}

export interface AuthenticationResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    usePQC?: boolean;
  };
  authMode?: AuthenticationMode;
  algorithm?: PQCAlgorithm;
  sessionData?: PQCSessionData;
  performanceMetrics?: Record<string, number>;
  errorMessage?: string;
}

export interface PQCTokenPayload {
  userId: string;
  email: string;
  sessionId?: string;
  algorithm?: PQCAlgorithm;
  pqc: boolean;
  keyId?: string;
  iat: number;
  exp: number;
}
