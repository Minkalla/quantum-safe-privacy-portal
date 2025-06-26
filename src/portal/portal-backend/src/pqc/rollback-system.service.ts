import { Injectable, Logger } from '@nestjs/common';
import { ABTestingService, ExperimentStatus } from './ab-testing.service';
import { MetricsCollectorService } from './metrics-collector.service';

export interface RollbackTrigger {
  metricName: string;
  thresholdValue: number;
  comparisonOperator: 'gt' | 'lt' | 'gte' | 'lte';
  minSampleSize: number;
}

@Injectable()
export class RollbackSystemService {
  private readonly logger = new Logger(RollbackSystemService.name);
  private rollbackTriggers: RollbackTrigger[] = [
    {
      metricName: 'error_rate',
      thresholdValue: 0.05,
      comparisonOperator: 'gt',
      minSampleSize: 100,
    },
    {
      metricName: 'response_time_ms',
      thresholdValue: 2000,
      comparisonOperator: 'gt',
      minSampleSize: 50,
    },
    {
      metricName: 'authentication_failure_rate',
      thresholdValue: 0.02,
      comparisonOperator: 'gt',
      minSampleSize: 20,
    },
  ];

  constructor(
    private readonly abTestingService: ABTestingService,
    private readonly metricsCollector: MetricsCollectorService,
  ) {
    this.validateRollbackTriggers();
  }

  private validateRollbackTriggers(): void {
    for (const trigger of this.rollbackTriggers) {
      if (!this.isValidRollbackTrigger(trigger)) {
        throw new Error(`Invalid rollback trigger configuration: ${JSON.stringify(trigger)}`);
      }
    }
  }

  private isValidRollbackTrigger(trigger: RollbackTrigger): boolean {
    if (!trigger.metricName || typeof trigger.metricName !== 'string') {
      this.logger.error('Invalid metric name in rollback trigger');
      return false;
    }

    if (typeof trigger.thresholdValue !== 'number' || trigger.thresholdValue < 0) {
      this.logger.error('Invalid threshold value in rollback trigger');
      return false;
    }

    if (!['gt', 'lt', 'gte', 'lte'].includes(trigger.comparisonOperator)) {
      this.logger.error('Invalid comparison operator in rollback trigger');
      return false;
    }

    if (typeof trigger.minSampleSize !== 'number' || trigger.minSampleSize < 1) {
      this.logger.error('Invalid minimum sample size in rollback trigger');
      return false;
    }

    return true;
  }

  async monitorExperiments(): Promise<void> {
    try {
      const experiments = this.abTestingService.getAllExperiments();
      
      for (const experiment of experiments) {
        if (experiment.status === ExperimentStatus.RUNNING) {
          await this.checkRollbackConditions(experiment.experimentId);
        }
      }
    } catch (error) {
      this.logger.error(`Error in experiment monitoring: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }

  private async checkRollbackConditions(experimentId: string): Promise<void> {
    try {
      const metrics = this.metricsCollector.getExperimentMetrics(experimentId);
      const treatmentMetrics = metrics.treatment;

      this.logger.debug(`Checking rollback conditions for ${experimentId}. Treatment metrics:`, JSON.stringify(treatmentMetrics));

      for (const trigger of this.rollbackTriggers) {
        this.logger.debug(`Checking trigger: ${trigger.metricName} with threshold ${trigger.thresholdValue}`);
        
        if (treatmentMetrics[trigger.metricName]) {
          const metricData = treatmentMetrics[trigger.metricName];
          this.logger.debug(`Metric data for ${trigger.metricName}:`, JSON.stringify(metricData));

          if (metricData.count >= trigger.minSampleSize) {
            const currentValue = metricData.avg;
            this.logger.debug(`Current value: ${currentValue}, threshold: ${trigger.thresholdValue}, should trigger: ${this.shouldTriggerRollback(currentValue, trigger)}`);

            if (this.shouldTriggerRollback(currentValue, trigger)) {
              await this.executeRollback(experimentId, trigger);
              return;
            }
          } else {
            this.logger.debug(`Insufficient sample size: ${metricData.count} < ${trigger.minSampleSize}`);
          }
        } else {
          this.logger.debug(`No metric data found for ${trigger.metricName}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error checking rollback conditions for ${experimentId}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }

  private shouldTriggerRollback(currentValue: number, trigger: RollbackTrigger): boolean {
    switch (trigger.comparisonOperator) {
      case 'gt':
        return currentValue > trigger.thresholdValue;
      case 'lt':
        return currentValue < trigger.thresholdValue;
      case 'gte':
        return currentValue >= trigger.thresholdValue;
      case 'lte':
        return currentValue <= trigger.thresholdValue;
      default:
        return false;
    }
  }

  private async executeRollback(experimentId: string, trigger: RollbackTrigger): Promise<void> {
    this.logger.error(`ROLLBACK TRIGGERED for experiment ${experimentId}`);
    this.logger.error(`Trigger: ${trigger.metricName} exceeded ${trigger.thresholdValue}`);

    try {
      this.abTestingService.updateExperimentStatus(experimentId, ExperimentStatus.FAILED);

      await this.sendRollbackNotifications(experimentId, trigger);
      this.logRollbackEvent(experimentId, trigger);

    } catch (error) {
      this.logger.error(`Error executing rollback for ${experimentId}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }

  private async sendRollbackNotifications(experimentId: string, trigger: RollbackTrigger): Promise<void> {
    const notificationData = {
      experimentId,
      triggerMetric: trigger.metricName,
      thresholdValue: trigger.thresholdValue,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
    };

    this.logger.error(`ROLLBACK NOTIFICATION: ${JSON.stringify(notificationData)}`);
  }

  private logRollbackEvent(experimentId: string, trigger: RollbackTrigger): void {
    const rollbackEvent = {
      eventType: 'experiment_rollback',
      experimentId,
      triggerMetric: trigger.metricName,
      thresholdValue: trigger.thresholdValue,
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(`ROLLBACK EVENT: ${JSON.stringify(rollbackEvent)}`);
  }

  addCustomTrigger(trigger: RollbackTrigger): void {
    this.rollbackTriggers.push(trigger);
    this.logger.log(`Added custom rollback trigger: ${trigger.metricName} ${trigger.comparisonOperator} ${trigger.thresholdValue}`);
  }

  getRollbackTriggers(): RollbackTrigger[] {
    return [...this.rollbackTriggers];
  }
}
