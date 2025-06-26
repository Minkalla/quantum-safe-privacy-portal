import { Injectable, Logger } from '@nestjs/common';

export interface MetricEvent {
  timestamp: Date;
  userId: string;
  experimentId: string;
  variant: string;
  metricName: string;
  metricValue: number;
}

export interface AggregatedMetrics {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);
  private events: MetricEvent[] = [];
  private aggregatedMetrics: Map<string, AggregatedMetrics> = new Map();

  recordEvent(
    userId: string,
    experimentId: string,
    variant: string,
    metricName: string,
    metricValue: number,
  ): void {
    const event: MetricEvent = {
      timestamp: new Date(),
      userId: this.hashUserId(userId),
      experimentId,
      variant,
      metricName,
      metricValue,
    };

    this.events.push(event);
    this.updateAggregatedMetrics(event);

    this.logger.debug(
      `Recorded metric: ${metricName}=${metricValue} for experiment ${experimentId}, variant ${variant}`,
    );
  }

  getExperimentMetrics(experimentId: string): { control: Record<string, AggregatedMetrics>; treatment: Record<string, AggregatedMetrics> } {
    const controlMetrics: Record<string, AggregatedMetrics> = {};
    const treatmentMetrics: Record<string, AggregatedMetrics> = {};

    for (const [key, metrics] of this.aggregatedMetrics.entries()) {
      if (key.startsWith(`${experimentId}_control_`)) {
        const metricName = key.substring(`${experimentId}_control_`.length);
        controlMetrics[metricName] = metrics;
      } else if (key.startsWith(`${experimentId}_treatment_`)) {
        const metricName = key.substring(`${experimentId}_treatment_`.length);
        treatmentMetrics[metricName] = metrics;
      }
    }

    return {
      control: controlMetrics,
      treatment: treatmentMetrics,
    };
  }

  private updateAggregatedMetrics(event: MetricEvent): void {
    const key = `${event.experimentId}_${event.variant}_${event.metricName}`;

    if (!this.aggregatedMetrics.has(key)) {
      this.aggregatedMetrics.set(key, {
        count: 0,
        sum: 0,
        avg: 0,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
      });
    }

    const metrics = this.aggregatedMetrics.get(key)!;
    metrics.count += 1;
    metrics.sum += event.metricValue;
    metrics.avg = metrics.sum / metrics.count;
    metrics.min = Math.min(metrics.min, event.metricValue);
    metrics.max = Math.max(metrics.max, event.metricValue);
  }

  private hashUserId(userId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
  }

  getRecentEvents(limit: number = 100): MetricEvent[] {
    return this.events.slice(-limit);
  }

  clearOldEvents(retentionDays: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const initialCount = this.events.length;
    this.events = this.events.filter(event => event.timestamp > cutoffDate);

    const removedCount = initialCount - this.events.length;
    if (removedCount > 0) {
      this.logger.log(`Cleared ${removedCount} old metric events (retention: ${retentionDays} days)`);
    }
  }
}
