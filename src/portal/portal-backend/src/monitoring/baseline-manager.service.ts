import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface PerformanceBaseline {
  timestamp: string;
  metrics: {
    authenticationLatency: number;
    keyGenerationTime: number;
    memoryUsage: number;
    errorRate: number;
    throughput: number;
  };
  environment: string;
  version: string;
}

interface AnomalyThresholds {
  latencyIncrease: number;
  memoryIncrease: number;
  errorRateIncrease: number;
  throughputDecrease: number;
}

@Injectable()
export class BaselineManagerService {
  private readonly logger = new Logger(BaselineManagerService.name);
  private readonly baselineDir = join(process.cwd(), 'monitoring', 'baselines');
  private readonly auditDir = join(process.cwd(), 'monitoring', 'audit');

  private readonly anomalyThresholds: AnomalyThresholds = {
    latencyIncrease: 0.30,
    memoryIncrease: 0.50,
    errorRateIncrease: 0.05,
    throughputDecrease: 0.20,
  };

  constructor() {
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    [this.baselineDir, this.auditDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        this.logger.log(`Created monitoring directory: ${dir}`);
      }
    });
  }

  async collectBaseline(): Promise<PerformanceBaseline> {
    const baseline: PerformanceBaseline = {
      timestamp: new Date().toISOString(),
      metrics: {
        authenticationLatency: await this.measureAuthenticationLatency(),
        keyGenerationTime: await this.measureKeyGenerationTime(),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        errorRate: 0,
        throughput: await this.measureThroughput(),
      },
      environment: process.env['NODE_ENV'] || 'development',
      version: process.env['npm_package_version'] || '0.2.0',
    };

    this.saveBaseline(baseline);
    this.auditEvent('baseline_collected', baseline);

    return baseline;
  }

  private async measureAuthenticationLatency(): Promise<number> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1));
    return Date.now() - start;
  }

  private async measureKeyGenerationTime(): Promise<number> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 0.1));
    return Date.now() - start;
  }

  private async measureThroughput(): Promise<number> {
    return 1000;
  }

  private saveBaseline(baseline: PerformanceBaseline): void {
    const filename = join(this.baselineDir, `baseline-${Date.now()}.json`);
    writeFileSync(filename, JSON.stringify(baseline, null, 2));

    const latestFilename = join(this.baselineDir, 'latest-baseline.json');
    writeFileSync(latestFilename, JSON.stringify(baseline, null, 2));

    this.logger.log(`Baseline saved: ${filename}`);
  }

  getLatestBaseline(): PerformanceBaseline | null {
    const latestFile = join(this.baselineDir, 'latest-baseline.json');

    if (!existsSync(latestFile)) {
      this.logger.warn('No baseline found, collecting initial baseline');
      return null;
    }

    try {
      const data = readFileSync(latestFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Failed to read baseline file', error);
      return null;
    }
  }

  detectAnomalies(currentMetrics: PerformanceBaseline['metrics']): {
    hasAnomalies: boolean;
    anomalies: string[];
    shouldRollback: boolean;
  } {
    const baseline = this.getLatestBaseline();
    if (!baseline) {
      return { hasAnomalies: false, anomalies: [], shouldRollback: false };
    }

    const anomalies: string[] = [];
    let shouldRollback = false;

    const latencyIncrease = (currentMetrics.authenticationLatency - baseline.metrics.authenticationLatency) / baseline.metrics.authenticationLatency;
    if (latencyIncrease > this.anomalyThresholds.latencyIncrease) {
      anomalies.push(`Authentication latency increased by ${(latencyIncrease * 100).toFixed(1)}%`);
      shouldRollback = true;
    }

    const memoryIncrease = (currentMetrics.memoryUsage - baseline.metrics.memoryUsage) / baseline.metrics.memoryUsage;
    if (memoryIncrease > this.anomalyThresholds.memoryIncrease) {
      anomalies.push(`Memory usage increased by ${(memoryIncrease * 100).toFixed(1)}%`);
      shouldRollback = true;
    }

    if (currentMetrics.errorRate > this.anomalyThresholds.errorRateIncrease) {
      anomalies.push(`Error rate increased to ${(currentMetrics.errorRate * 100).toFixed(1)}%`);
      shouldRollback = true;
    }

    const throughputDecrease = (baseline.metrics.throughput - currentMetrics.throughput) / baseline.metrics.throughput;
    if (throughputDecrease > this.anomalyThresholds.throughputDecrease) {
      anomalies.push(`Throughput decreased by ${(throughputDecrease * 100).toFixed(1)}%`);
      shouldRollback = true;
    }

    if (anomalies.length > 0) {
      this.auditEvent('anomaly_detected', { currentMetrics, baseline: baseline.metrics, anomalies });
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
      shouldRollback,
    };
  }

  private auditEvent(eventType: string, data: any): void {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      data,
      environment: process.env['NODE_ENV'] || 'development',
    };

    const auditFile = join(this.auditDir, `audit-${new Date().toISOString().split('T')[0]}.jsonl`);
    const auditLine = JSON.stringify(auditEntry) + '\n';

    try {
      writeFileSync(auditFile, auditLine, { flag: 'a' });
    } catch (error) {
      this.logger.error('Failed to write audit entry', error);
    }
  }

  async triggerRollback(reason: string): Promise<void> {
    this.logger.error(`ROLLBACK TRIGGERED: ${reason}`);

    this.auditEvent('rollback_triggered', { reason, timestamp: new Date().toISOString() });

    this.logger.error('Automated rollback would be executed here in production environment');
  }
}
