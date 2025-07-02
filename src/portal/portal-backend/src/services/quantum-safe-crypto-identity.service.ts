import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class QuantumSafeCryptoIdentityService {
  private readonly logger = new Logger(QuantumSafeCryptoIdentityService.name);

  generateStandardizedCryptoUserId(
    baseUserId: string,
    algorithm: string,
    operation: string,
  ): string {
    const normalizedUserId = baseUserId.toLowerCase().trim();
    const normalizedAlgorithm = algorithm.toUpperCase();
    const normalizedOperation = operation.toLowerCase();
    
    const cryptoSeed = `${normalizedUserId}:${normalizedAlgorithm}:${normalizedOperation}:crypto-ops`;
    
    return crypto
      .createHash('sha256')
      .update(cryptoSeed)
      .digest('hex')
      .substring(0, 16);
  }

  validateCryptoUserId(cryptoUserId: string): boolean {
    return /^[a-f0-9]{16}$/.test(cryptoUserId);
  }

  generateConsistentUserHash(userId: string, salt: string = 'quantum-safe-portal'): string {
    return crypto
      .createHash('sha256')
      .update(`${userId}:${salt}`)
      .digest('hex');
  }
}
