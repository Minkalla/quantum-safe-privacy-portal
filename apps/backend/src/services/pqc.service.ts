import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class PQCService {
  private readonly logger = new Logger(PQCService.name);

  constructor(@Inject(forwardRef(() => AuthService)) private readonly authService: AuthService) {}

  async triggerPQCHandshake(userId: string) {
    const payload = {
      user_id: userId,
      kem_algorithm: 'ML-KEM-768',
      dsa_algorithm: 'ML-DSA-65',
      metadata: { operation: 'post_login_handshake' },
    };

    try {
      const response = await this.authService.callPQCService('handshake', payload);

      this.logger.log(`✅ PQC handshake successful for user ${userId}:`, {
        handshake_id: response.handshake_metadata?.handshake_id,
        algorithms: `${payload.kem_algorithm}/${payload.dsa_algorithm}`,
        fallback_mode: response.handshake_metadata?.fallback_mode || false,
      });

      return response;
    } catch (err: any) {
      const reason = err?.message || 'Unknown error';
      this.logger.error(`❌ PQC handshake failed for user ${userId}:`, reason);

      const now = Date.now();
      return {
        success: false,
        error_message: reason,
        handshake_metadata: {
          handshake_id: `fallback_${now}`,
          user_id: userId,
          timestamp: now / 1000,
          fallback_mode: true,
        },
      };
    }
  }
}
