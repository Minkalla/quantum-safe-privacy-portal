import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnhancedAuthService } from '../auth/enhanced-auth.service';
import { PQCDataValidationService } from '../services/pqc-data-validation.service';

export const RequiresPQC = () => SetMetadata('requiresPQC', true);

@Injectable()
export class PQCApiGuard implements CanActivate {
  constructor(
    private readonly enhancedAuthService: EnhancedAuthService,
    private readonly validationService: PQCDataValidationService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requiresPQC = this.reflector.get<boolean>('requiresPQC', context.getHandler());

    if (!requiresPQC) {
      return true;
    }

    const sessionToken = this.extractSessionToken(request);
    if (!sessionToken) {
      throw new UnauthorizedException('PQC session token required');
    }

    try {
      const tokenVerificationResult = await this.enhancedAuthService.verifyPQCToken({
        token: sessionToken,
        userId: 'token_verification',
      });

      if (!tokenVerificationResult.success) {
        throw new UnauthorizedException(`Invalid PQC session: ${tokenVerificationResult.errorMessage}`);
      }

      const tokenPayload = JSON.parse(sessionToken);
      const session = {
        userId: tokenPayload.userId,
        valid: true,
        expiresAt: new Date(tokenPayload.exp * 1000),
      };

      if (!session || !session.valid) {
        throw new UnauthorizedException('Invalid PQC session');
      }

      if (request.body?.signature) {
        const validationResult = await this.validationService.validateDataIntegrity(
          request.body,
          request.body.signature,
        );
        const isValidSignature = validationResult.isValid;

        if (!isValidSignature) {
          throw new UnauthorizedException('Invalid request signature');
        }
      }

      request.pqcSession = session;
      request.user = { id: session.userId };

      return true;
    } catch (error) {
      throw new UnauthorizedException(`PQC authentication failed: ${error.message}`);
    }
  }

  private extractSessionToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}
