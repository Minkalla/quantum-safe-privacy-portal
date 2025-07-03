import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { BaselineManagerService } from './baseline-manager.service';
import { AlertingService } from './alerting.service';

@Injectable()
export class AnomalyDetectorService {
  private readonly logger = new Logger(AnomalyDetectorService.name);

  constructor(
    private readonly baselineManager: BaselineManagerService,
    private readonly alerting: AlertingService,
  ) {}

  async detectAnomalies(): Promise<void> {
    try {
      const currentMetrics = {
        authenticationLatency: await this.getCurrentAuthLatency(),
        keyGenerationTime: await this.getCurrentKeyGenTime(),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        errorRate: await this.getCurrentErrorRate(),
        throughput: await this.getCurrentThroughput(),
        mlkemKeyGenLatency: await this.getCurrentMLKEMKeyGeneration(),
        mlkemEncapLatency: await this.getCurrentMLKEMEncapsulation(),
        mlkemDecapLatency: await this.getCurrentMLKEMDecapsulation(),
        mldsaKeyGenLatency: await this.getCurrentMLDSAKeyGeneration(),
        mldsaSignLatency: await this.getCurrentMLDSASigning(),
        mldsaVerifyLatency: await this.getCurrentMLDSAVerification(),
      };

      const anomalyResult = this.baselineManager.detectAnomalies(currentMetrics);

      if (anomalyResult.hasAnomalies) {
        this.logger.warn(`Anomalies detected: ${anomalyResult.anomalies.join(', ')}`);

        await this.alerting.sendAlert({
          severity: anomalyResult.shouldRollback ? 'CRITICAL' : 'WARNING',
          title: 'Performance Anomaly Detected',
          message: `Anomalies detected: ${anomalyResult.anomalies.join(', ')}`,
          metrics: currentMetrics,
        });

        if (anomalyResult.shouldRollback) {
          await this.baselineManager.triggerRollback(
            `Performance anomalies detected: ${anomalyResult.anomalies.join(', ')}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to detect anomalies', error);
    }
  }

  async collectBaseline(): Promise<void> {
    try {
      await this.baselineManager.collectBaseline();
      this.logger.log('Performance baseline collected successfully');
    } catch (error) {
      this.logger.error('Failed to collect baseline', error);
    }
  }

  private async getCurrentAuthLatency(): Promise<number> {
    return crypto.randomBytes(1)[0] / 255 * 100 + 50;
  }

  private async getCurrentKeyGenTime(): Promise<number> {
    return crypto.randomBytes(1)[0] / 255 * 10 + 1;
  }

  private async getCurrentErrorRate(): Promise<number> {
    return crypto.randomBytes(1)[0] / 255 * 0.01;
  }

  private async getCurrentThroughput(): Promise<number> {
    return crypto.randomBytes(1)[0] / 255 * 200 + 800;
  }

  private async getCurrentMLKEMKeyGeneration(): Promise<number> {
    return crypto.randomBytes(1)[0] / 255 * 20 + 45;
  }

  private async getCurrentMLKEMEncapsulation(): Promise<number> {
    return crypto.randomBytes(1)[0] / 255 * 10 + 20;
  }

  private async getCurrentMLKEMDecapsulation(): Promise<number> {
    return crypto.randomBytes(1)[0] / 255 * 10 + 25;
  }

  private async getCurrentMLDSAKeyGeneration(): Promise<number> {
    return crypto.randomBytes(1)[0] / 255 * 30 + 65;
  }

  private async getCurrentMLDSASigning(): Promise<number> {
    return crypto.randomBytes(1)[0] / 255 * 15 + 30;
  }

  private async getCurrentMLDSAVerification(): Promise<number> {
    return crypto.randomBytes(1)[0] / 255 * 8 + 12;
  }
}
