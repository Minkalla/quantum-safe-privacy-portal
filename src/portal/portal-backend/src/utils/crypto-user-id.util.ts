import * as crypto from 'crypto';

export interface CryptoUserIdOptions {
  algorithm: string;
  operation: string;
  timestamp?: number;
}

export function generateCryptoUserId(baseUserId: string, options: CryptoUserIdOptions): string {
  const normalizedUserId = baseUserId.toLowerCase().trim();
  const normalizedAlgorithm = options.algorithm.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedOperation = options.operation.toLowerCase().replace(/[^a-z0-9]/g, '');

  const hashInput = `${normalizedUserId}:${normalizedAlgorithm}:${normalizedOperation}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  return `crypto_${hash.substring(0, 16)}`;
}

export function validateCryptoUserId(cryptoUserId: string): boolean {
  const pattern = /^crypto_[a-f0-9]{16}$/;
  return pattern.test(cryptoUserId);
}

export function extractBaseUserId(cryptoUserId: string, baseUserId: string, options: CryptoUserIdOptions): boolean {
  const expectedCryptoUserId = generateCryptoUserId(baseUserId, options);
  return cryptoUserId === expectedCryptoUserId;
}
