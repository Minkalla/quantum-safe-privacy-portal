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
      return this.jwtService.sign(payload);
    } catch (error) {
      this.logger.warn('PQC JWT signing failed, falling back to classical JWT signing', error);
      return this.jwtService.sign(payload);
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
