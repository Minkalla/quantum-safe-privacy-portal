import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PQCDataEncryptionService } from '../services/pqc-data-encryption.service';
import { PQCDataValidationService } from '../services/pqc-data-validation.service';

@Injectable()
export class PQCApiMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PQCApiMiddleware.name);

  constructor(
    private readonly encryptionService: PQCDataEncryptionService,
    private readonly validationService: PQCDataValidationService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (this.isPQCRequest(req)) {
      try {
        await this.processPQCRequest(req);
        await this.setupPQCResponse(res);

        this.logger.log(`PQC middleware processed request: ${req.method} ${req.path}`);
      } catch (error) {
        this.logger.error(`PQC middleware error: ${error.message}`);
        return res.status(400).json({
          error: 'PQC processing failed',
          message: error.message,
        });
      }
    }

    next();
  }

  private isPQCRequest(req: Request): boolean {
    return (
      req.path.includes('/pqc/') ||
      req.headers['x-pqc-enabled'] === 'true' ||
      req.body?.pqcEnabled === true
    );
  }

  private async processPQCRequest(req: Request): Promise<void> {
    if (req.body?.encryptedData) {
      try {
        const decryptionResult = await this.encryptionService.decryptData(
          req.body.encryptedData,
          (req as any).user?.id || 'anonymous',
        );

        req.body = {
          ...req.body,
          ...decryptionResult.decryptedData,
          pqcDecrypted: true,
        };

        this.logger.log('Request data decrypted successfully');
      } catch (error) {
        this.logger.error(`Request decryption failed: ${error.message}`);
        throw new Error('Failed to decrypt request data');
      }
    }

    if (req.body?.dataIntegrity) {
      try {
        const validationResult = await this.validationService.validateDataIntegrity(
          req.body,
          req.body.dataIntegrity,
        );

        if (!validationResult.isValid) {
          throw new Error(
            `Request integrity validation failed: ${validationResult.errors?.join(', ')}`,
          );
        }

        req.body.integrityValidated = true;
        this.logger.log('Request integrity validated successfully');
      } catch (error) {
        this.logger.error(`Request integrity validation failed: ${error.message}`);
        throw error;
      }
    }

    req.headers['x-pqc-processed'] = 'true';
  }

  private async setupPQCResponse(res: Response): Promise<void> {
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      if (data && typeof data === 'object') {
        if (data.pqcEnabled || data.isPQCProtected) {
          data.pqcProcessed = true;
          data.processedAt = new Date().toISOString();
        }

        if (data.success && data.algorithm) {
          data.pqcMetadata = {
            algorithm: data.algorithm,
            processedBy: 'PQC-API-Middleware',
            timestamp: new Date().toISOString(),
          };
        }
      }

      return originalJson(data);
    };
  }
}
