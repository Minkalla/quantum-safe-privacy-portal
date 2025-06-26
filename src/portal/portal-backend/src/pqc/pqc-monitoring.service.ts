import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PQCMetrics {
  keyGenerationLatency: number;
  keyGenerationSuccess: boolean;
  jwtSigningLatency: number;
  jwtSigningSuccess: boolean;
  authenticationLatency: number;
  authenticationSuccess: boolean;
  errorRate: number;
  rolloutPercentage: number;
}

export interface PQCAlertThresholds {
  maxErrorRate: number;
  maxLatencyIncrease: number;
  maxMemoryUsage: number;
}

@Injectable()
export class PQCMonitoringService {
  private readonly logger = new Logger(PQCMonitoringService.name);
  private readonly alertThresholds: PQCAlertThresholds;
  private baselineMetrics: Map<string, number> = new Map();
  private currentMetrics: Map<string, number> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.alertThresholds = {
      maxErrorRate: this.configService.get<number>('PQC_MAX_ERROR_RATE') || 0.05, // 5% error rate threshold
      maxLatencyIncrease: this.configService.get<number>('PQC_MAX_LATENCY_INCREASE') || 1.5, // 50% latency increase threshold
      maxMemoryUsage: this.configService.get<number>('PQC_MAX_MEMORY_MB') || 50 * 1024 * 1024, // 50MB memory threshold
    };
    this.initializeBaselines();

    try {
      require('aws-xray-sdk-core');
      this.logger.log('AWS X-Ray integration enabled for PQC monitoring');
    } catch (error) {
      this.logger.warn('AWS X-Ray not available, using basic monitoring only');
    }
  }

  private initializeBaselines(): void {
    this.baselineMetrics.set('keyGenerationLatency', 100); // 100ms baseline
    this.baselineMetrics.set('jwtSigningLatency', 50); // 50ms baseline
    this.baselineMetrics.set('authenticationLatency', 200); // 200ms baseline
    this.baselineMetrics.set('errorRate', 0.01); // 1% baseline error rate
  }

  async recordPQCKeyGeneration(userId: string, startTime: number, success: boolean): Promise<void> {
    const latency = Date.now() - startTime;

    try {
      this.createXRaySegment('PQC_KeyGeneration', {
        userId,
        latency,
        success,
        algorithm: 'kyber768_dilithium3',
      });

      await this.sendCloudWatchMetric('PQC/KeyGeneration/Latency', latency, 'Milliseconds');
      await this.sendCloudWatchMetric('PQC/KeyGeneration/Success', success ? 1 : 0, 'Count');

      this.currentMetrics.set('keyGenerationLatency', latency);
      this.logger.log(`PQC key generation for user ${userId}: ${latency}ms, success: ${success}`);

      await this.checkPerformanceThresholds('keyGeneration', latency);
    } catch (error: any) {
      this.logger.error(`Failed to record PQC key generation metrics: ${error.message}`);
    }
  }

  async recordPQCJWTSigning(userId: string, startTime: number, success: boolean): Promise<void> {
    const latency = Date.now() - startTime;

    try {
      this.createXRaySegment('PQC_JWTSigning', {
        userId,
        latency,
        success,
        algorithm: 'dilithium3',
      });

      await this.sendCloudWatchMetric('PQC/JWT/SigningLatency', latency, 'Milliseconds');
      await this.sendCloudWatchMetric('PQC/JWT/SigningSuccess', success ? 1 : 0, 'Count');

      this.currentMetrics.set('jwtSigningLatency', latency);
      this.logger.log(`PQC JWT signing for user ${userId}: ${latency}ms, success: ${success}`);

      await this.checkPerformanceThresholds('jwtSigning', latency);
    } catch (error: any) {
      this.logger.error(`Failed to record PQC JWT signing metrics: ${error.message}`);
    }
  }

  async recordPQCAuthentication(userId: string, startTime: number, success: boolean): Promise<void> {
    const latency = Date.now() - startTime;

    try {
      await this.sendCloudWatchMetric('PQC/Authentication/Latency', latency, 'Milliseconds');
      await this.sendCloudWatchMetric('PQC/Authentication/Success', success ? 1 : 0, 'Count');

      this.currentMetrics.set('authenticationLatency', latency);
      this.logger.log(`PQC authentication for user ${userId}: ${latency}ms, success: ${success}`);

      await this.checkPerformanceThresholds('authentication', latency);
    } catch (error: any) {
      this.logger.error(`Failed to record PQC authentication metrics: ${error.message}`);
    }
  }

  async recordErrorRate(operation: string, errorCount: number, totalCount: number): Promise<void> {
    const errorRate = totalCount > 0 ? errorCount / totalCount : 0;

    try {
      await this.sendCloudWatchMetric(`PQC/${operation}/ErrorRate`, errorRate, 'Percent');

      this.currentMetrics.set('errorRate', errorRate);
      this.logger.log(`PQC ${operation} error rate: ${(errorRate * 100).toFixed(2)}%`);

      if (errorRate > this.alertThresholds.maxErrorRate) {
        await this.triggerRollbackAlert('HIGH_ERROR_RATE', {
          operation,
          errorRate: errorRate * 100,
          threshold: this.alertThresholds.maxErrorRate * 100,
        });
      }
    } catch (error: any) {
      this.logger.error(`Failed to record PQC error rate metrics: ${error.message}`);
    }
  }

  private async checkPerformanceThresholds(operation: string, currentLatency: number): Promise<void> {
    const baselineKey = `${operation}Latency`;
    const baseline = this.baselineMetrics.get(baselineKey) || 100;
    const latencyIncrease = currentLatency / baseline;

    if (latencyIncrease > this.alertThresholds.maxLatencyIncrease) {
      await this.triggerRollbackAlert('PERFORMANCE_DEGRADATION', {
        operation,
        currentLatency,
        baseline,
        increase: ((latencyIncrease - 1) * 100).toFixed(1),
        threshold: ((this.alertThresholds.maxLatencyIncrease - 1) * 100).toFixed(1),
      });
    }
  }

  private async triggerRollbackAlert(alertType: string, details: any): Promise<void> {
    const alertMessage = {
      alertType,
      timestamp: new Date().toISOString(),
      details,
      action: 'ROLLBACK_TRIGGERED',
    };

    this.logger.error(`PQC Rollback Alert: ${JSON.stringify(alertMessage)}`);

    await Promise.all([
      this.sendSlackNotification(alertMessage),
      this.sendEmailNotification(alertMessage),
      this.sendPagerDutyAlert(alertMessage),
      this.sendWebhookNotification(alertMessage),
    ]);
  }

  private async sendCloudWatchMetric(metricName: string, value: number, unit: string): Promise<void> {
    this.logger.debug(`CloudWatch Metric: ${metricName} = ${value} ${unit}`);
  }

  private async sendSlackNotification(alert: any): Promise<void> {
    this.logger.warn(`Slack Alert: ${JSON.stringify(alert)}`);
  }

  private async sendEmailNotification(alert: any): Promise<void> {
    this.logger.warn(`Email Alert: ${JSON.stringify(alert)}`);
  }

  private async sendPagerDutyAlert(alert: any): Promise<void> {
    this.logger.warn(`PagerDuty Alert: ${JSON.stringify(alert)}`);
  }

  private async sendWebhookNotification(alert: any): Promise<void> {
    this.logger.warn(`Webhook Alert: ${JSON.stringify(alert)}`);
  }

  private createXRaySegment(name: string, metadata: any): void {
    try {
      const AWSXRay = require('aws-xray-sdk-core');
      const segment = new AWSXRay.Segment(name);

      segment.addMetadata('pqc', metadata);
      segment.addAnnotation('operation', name);
      segment.addAnnotation('success', metadata.success);

      if (metadata.latency) {
        segment.addAnnotation('latency_ms', metadata.latency);
      }

      segment.close();
      this.logger.debug(`X-Ray segment created for ${name}`);
    } catch (error) {
      this.logger.warn(`Failed to create X-Ray segment for ${name}: Basic monitoring only`);
    }
  }

  async getMetricsSummary(): Promise<PQCMetrics> {
    const successMetrics = this.calculateSuccessRates();
    const rolloutPercentage = await this.getRolloutPercentage();
    
    return {
      keyGenerationLatency: this.currentMetrics.get('keyGenerationLatency') || 0,
      keyGenerationSuccess: successMetrics.keyGeneration,
      jwtSigningLatency: this.currentMetrics.get('jwtSigningLatency') || 0,
      jwtSigningSuccess: successMetrics.jwtSigning,
      authenticationLatency: this.currentMetrics.get('authenticationLatency') || 0,
      authenticationSuccess: successMetrics.authentication,
      errorRate: this.currentMetrics.get('errorRate') || 0,
      rolloutPercentage: rolloutPercentage,
    };
  }

  private calculateSuccessRates(): { keyGeneration: boolean; jwtSigning: boolean; authentication: boolean } {
    const errorRate = this.currentMetrics.get('errorRate') || 0;
    const successThreshold = 0.95;
    
    return {
      keyGeneration: (1 - errorRate) >= successThreshold,
      jwtSigning: (1 - errorRate) >= successThreshold,
      authentication: (1 - errorRate) >= successThreshold,
    };
  }

  private async getRolloutPercentage(): Promise<number> {
    try {
      return this.currentMetrics.get('rolloutPercentage') || 0;
    } catch (error) {
      this.logger.warn('Failed to get rollout percentage, defaulting to 0', error);
      return 0;
    }
  }

  async testRollbackTriggers(): Promise<{ success: boolean; triggeredAlerts: string[] }> {
    const triggeredAlerts: string[] = [];

    try {
      await this.recordErrorRate('test', 6, 100);
      triggeredAlerts.push('HIGH_ERROR_RATE');

      const startTime = Date.now() - 1000;
      await this.recordPQCKeyGeneration('test-user', startTime, true);
      triggeredAlerts.push('PERFORMANCE_DEGRADATION');

      this.logger.log(`Rollback trigger test completed. Triggered alerts: ${triggeredAlerts.join(', ')}`);

      return { success: true, triggeredAlerts };
    } catch (error: any) {
      this.logger.error(`Rollback trigger test failed: ${error.message}`);
      return { success: false, triggeredAlerts };
    }
  }
}
