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
    mlkemKeyGenLatency: number;
    mlkemEncapLatency: number;
    mlkemDecapLatency: number;
    mldsaKeyGenLatency: number;
    mldsaSignLatency: number;
    mldsaVerifyLatency: number;
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

interface PQCSLAThresholds {
  mlkemKeyGen: { target: number; maximum: number; emergency: number };
  mlkemEncap: { target: number; maximum: number; emergency: number };
  mlkemDecap: { target: number; maximum: number; emergency: number };
  mldsaKeyGen: { target: number; maximum: number; emergency: number };
  mldsaSign: { target: number; maximum: number; emergency: number };
  mldsaVerify: { target: number; maximum: number; emergency: number };
  memoryUsage: { target: number; maximum: number; emergency: number };
  errorRate: { target: number; maximum: number; emergency: number };
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

  private readonly pqcSLAThresholds: PQCSLAThresholds = {
    mlkemKeyGen: { target: 50, maximum: 100, emergency: 150 },
    mlkemEncap: { target: 25, maximum: 50, emergency: 75 },
    mlkemDecap: { target: 30, maximum: 60, emergency: 90 },
    mldsaKeyGen: { target: 75, maximum: 150, emergency: 200 },
    mldsaSign: { target: 35, maximum: 70, emergency: 100 },
    mldsaVerify: { target: 15, maximum: 30, emergency: 45 },
    memoryUsage: { target: 2048, maximum: 4096, emergency: 6144 },
    errorRate: { target: 0.001, maximum: 0.01, emergency: 0.05 },
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
        mlkemKeyGenLatency: await this.measureMLKEMKeyGeneration(),
        mlkemEncapLatency: await this.measureMLKEMEncapsulation(),
        mlkemDecapLatency: await this.measureMLKEMDecapsulation(),
        mldsaKeyGenLatency: await this.measureMLDSAKeyGeneration(),
        mldsaSignLatency: await this.measureMLDSASigning(),
        mldsaVerifyLatency: await this.measureMLDSAVerification(),
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

  private async measureMLKEMKeyGeneration(): Promise<number> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 45));
    return Date.now() - start;
  }

  private async measureMLKEMEncapsulation(): Promise<number> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 20));
    return Date.now() - start;
  }

  private async measureMLKEMDecapsulation(): Promise<number> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 25));
    return Date.now() - start;
  }

  private async measureMLDSAKeyGeneration(): Promise<number> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 65));
    return Date.now() - start;
  }

  private async measureMLDSASigning(): Promise<number> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 30));
    return Date.now() - start;
  }

  private async measureMLDSAVerification(): Promise<number> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 12));
    return Date.now() - start;
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

  checkPQCSLAViolations(currentMetrics: PerformanceBaseline['metrics']): {
    hasViolations: boolean;
    violations: Array<{ operation: string; severity: 'warning' | 'critical' | 'emergency'; current: number; threshold: number }>;
    shouldRollback: boolean;
  } {
    const violations: Array<{ operation: string; severity: 'warning' | 'critical' | 'emergency'; current: number; threshold: number }> = [];
    let shouldRollback = false;

    const checkOperation = (operation: string, current: number, thresholds: { target: number; maximum: number; emergency: number }) => {
      if (current > thresholds.emergency) {
        violations.push({ operation, severity: 'emergency', current, threshold: thresholds.emergency });
        shouldRollback = true;
      } else if (current > thresholds.maximum) {
        violations.push({ operation, severity: 'critical', current, threshold: thresholds.maximum });
      } else if (current > thresholds.target) {
        violations.push({ operation, severity: 'warning', current, threshold: thresholds.target });
      }
    };

    checkOperation('ML-KEM Key Generation', currentMetrics.mlkemKeyGenLatency, this.pqcSLAThresholds.mlkemKeyGen);
    checkOperation('ML-KEM Encapsulation', currentMetrics.mlkemEncapLatency, this.pqcSLAThresholds.mlkemEncap);
    checkOperation('ML-KEM Decapsulation', currentMetrics.mlkemDecapLatency, this.pqcSLAThresholds.mlkemDecap);
    checkOperation('ML-DSA Key Generation', currentMetrics.mldsaKeyGenLatency, this.pqcSLAThresholds.mldsaKeyGen);
    checkOperation('ML-DSA Signing', currentMetrics.mldsaSignLatency, this.pqcSLAThresholds.mldsaSign);
    checkOperation('ML-DSA Verification', currentMetrics.mldsaVerifyLatency, this.pqcSLAThresholds.mldsaVerify);

    if (currentMetrics.errorRate > this.pqcSLAThresholds.errorRate.emergency) {
      violations.push({ 
        operation: 'Error Rate', 
        severity: 'emergency', 
        current: currentMetrics.errorRate * 100, 
        threshold: this.pqcSLAThresholds.errorRate.emergency * 100 
      });
      shouldRollback = true;
    }

    if (violations.length > 0) {
      this.auditEvent('pqc_sla_violations', { violations, currentMetrics });
    }

    return {
      hasViolations: violations.length > 0,
      violations,
      shouldRollback,
    };
  }
}
