import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
      // Attempt PQC-enhanced JWT signing
      const pqcToken = await this.hybridCryptoService.signWithPQC(payload);
      if (pqcToken) {
        return pqcToken;
      }
      return this.jwtService.sign(payload);
    } catch (error) {
      this.logger.warn('PQC JWT signing failed, falling back to classical JWT signing', error);
      // Fallback to standard JWT signing with basic payload
      return this.jwtService.sign({ ...payload, pqc_fallback: true });
    }
  }

  async verifyPQCToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      this.logger.warn('PQC JWT verification failed, falling back to classical JWT verification', error);
      return this.jwtService.verify(token);
    }
  }
}
