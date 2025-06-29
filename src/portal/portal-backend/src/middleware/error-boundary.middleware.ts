import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { HybridCryptoService } from '../services/hybrid-crypto.service';

@Injectable()
export class ErrorBoundaryMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorBoundaryMiddleware.name);

  constructor(private readonly hybridCrypto?: HybridCryptoService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    res.send = (body: any) => {
      if (res.statusCode >= 500 && this.hybridCrypto) {
        const circuitBreakerStatus = this.hybridCrypto.getCircuitBreakerStatus();
        if (circuitBreakerStatus.state === 'OPEN') {
          this.logger.warn('PQC service degraded, circuit breaker is OPEN');

          if (typeof body === 'string') {
            try {
              const errorObj = JSON.parse(body);
              errorObj.pqcStatus = 'degraded';
              errorObj.fallbackActive = true;
              body = JSON.stringify(errorObj);
            } catch (e) {
              body = JSON.stringify({
                error: body,
                pqcStatus: 'degraded',
                fallbackActive: true,
              });
            }
          } else if (typeof body === 'object') {
            body.pqcStatus = 'degraded';
            body.fallbackActive = true;
          }
        }
      }

      return originalSend(body);
    };

    res.json = (obj: any) => {
      if (res.statusCode >= 500 && this.hybridCrypto) {
        const circuitBreakerStatus = this.hybridCrypto.getCircuitBreakerStatus();
        if (circuitBreakerStatus.state === 'OPEN') {
          this.logger.warn('PQC service degraded, adding fallback indicators to response');
          obj.pqcStatus = 'degraded';
          obj.fallbackActive = true;
        }
      }

      return originalJson(obj);
    };

    next();
  }
}
