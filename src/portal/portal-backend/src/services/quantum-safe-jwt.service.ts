import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '../jwt/jwt.service';
import { HybridCryptoService } from './hybrid-crypto.service';

@Injectable()
export class QuantumSafeJWTService {
  private readonly logger = new Logger(QuantumSafeJWTService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly hybridCryptoService: HybridCryptoService,
  ) {}

  async signPQCToken(payload: any): Promise<string> {
    try {
      const keyPair = await this.hybridCryptoService.generateKeyPairWithFallback();

      // Attempt PQC-enhanced JWT signing using HybridCryptoService
      const message = JSON.stringify(payload);
      const pqcResult = await this.hybridCryptoService.signWithFallback(message, keyPair.privateKey);

      if (pqcResult && pqcResult.signature) {
        const header = { alg: pqcResult.algorithm === 'ML-DSA-65' ? 'ML-DSA-65' : 'RS256', typ: 'JWT' };
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = Buffer.from(pqcResult.signature).toString('base64url');

        return `${encodedHeader}.${encodedPayload}.${signature}`;
      }

      // Fallback to standard JWT
      const tokens = this.jwtService.generateTokens(payload);
      return tokens.accessToken;
    } catch (error) {
      this.logger.warn('PQC JWT signing failed, falling back to classical JWT signing', error);
      // Fallback to standard JWT signing with basic payload
      const tokens = this.jwtService.generateTokens({ ...payload, pqc_fallback: true });
      return tokens.accessToken;
    }
  }

  async verifyPQCToken(token: string): Promise<any> {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

        if (header.alg === 'ML-DSA-65' || header.alg === 'RS256') {
          const signature = Buffer.from(parts[2], 'base64url').toString();
          const message = `${parts[0]}.${parts[1]}`;

          const hybridSignature = {
            algorithm: header.alg as 'ML-DSA-65' | 'RSA-2048',
            signature: signature,
            fallbackUsed: header.alg === 'RS256',
            isPQCDegraded: header.alg === 'RS256',
          };

          const keyPair = await this.hybridCryptoService.generateKeyPairWithFallback();
          const isValid = await this.hybridCryptoService.verifyWithFallback(hybridSignature, message, keyPair.publicKey);

          if (isValid) {
            return payload;
          } else {
            throw new Error('PQC signature verification failed');
          }
        }
      }

      // Fallback to standard JWT verification
      return this.jwtService.verifyToken(token, 'access');
    } catch (error) {
      this.logger.warn('PQC JWT verification failed, falling back to classical JWT verification', error);
      return this.jwtService.verifyToken(token, 'access');
    }
  }
}
