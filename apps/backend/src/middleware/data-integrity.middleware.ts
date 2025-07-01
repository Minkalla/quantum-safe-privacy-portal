import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PQCDataValidationService } from '../services/pqc-data-validation.service';

@Injectable()
export class DataIntegrityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DataIntegrityMiddleware.name);

  constructor(private readonly validationService: PQCDataValidationService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (this.shouldValidateIntegrity(req)) {
      try {
        await this.validateRequestIntegrity(req);
      } catch (error) {
        this.logger.error(`Data integrity validation failed: ${error.message}`);
        return res.status(400).json({
          error: 'Data integrity validation failed',
          message: error.message,
        });
      }
    }
    next();
  }

  private shouldValidateIntegrity(req: Request): boolean {
    const sensitiveRoutes = ['/consent', '/user/profile', '/auth/pqc'];
    return sensitiveRoutes.some(route => req.path.includes(route)) &&
           ['POST', 'PUT', 'PATCH'].includes(req.method);
  }

  private async validateRequestIntegrity(req: Request): Promise<void> {
    if (req.body.dataIntegrity) {
      const validationResult = await this.validationService.validateDataIntegrity(
        req.body.data || req.body,
        req.body.dataIntegrity,
      );

      if (!validationResult.isValid) {
        throw new Error(`Integrity validation failed: ${validationResult.errors.join(', ')}`);
      }
    }
  }
}
