import { Injectable, Logger } from '@nestjs/common';
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
            `Performance anomalies detected: ${anomalyResult.anomalies.join(', ')}`
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
    return Math.random() * 100 + 50;
  }

  private async getCurrentKeyGenTime(): Promise<number> {
    return Math.random() * 10 + 1;
  }

  private async getCurrentErrorRate(): Promise<number> {
    return Math.random() * 0.01;
  }

  private async getCurrentThroughput(): Promise<number> {
    return Math.random() * 200 + 800;
  }
}
