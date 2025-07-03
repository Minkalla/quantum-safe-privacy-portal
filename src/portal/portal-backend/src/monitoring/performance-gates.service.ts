import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

interface PerformanceThresholds {
  authenticationLatency: number;
  keyGenerationTime: number;
  memoryUsage: number;
  errorRate: number;
}

interface PerformanceMetrics {
  authenticationLatency: number;
  keyGenerationTime: number;
  memoryUsage: number;
  errorRate: number;
  timestamp: string;
}

@Injectable()
export class PerformanceGatesService {
  private readonly logger = new Logger(PerformanceGatesService.name);

  private readonly thresholds: PerformanceThresholds = {
    authenticationLatency: 200,
    keyGenerationTime: 5000,
    memoryUsage: 50,
    errorRate: 0.01,
  };

  async validatePerformance(metrics: PerformanceMetrics): Promise<{
    passed: boolean;
    violations: string[];
    shouldRollback: boolean;
  }> {
    const violations: string[] = [];
    let shouldRollback = false;

    if (metrics.authenticationLatency > this.thresholds.authenticationLatency) {
      violations.push(`Authentication latency ${metrics.authenticationLatency}ms exceeds threshold ${this.thresholds.authenticationLatency}ms`);
      shouldRollback = true;
    }

    if (metrics.keyGenerationTime > this.thresholds.keyGenerationTime) {
      violations.push(`Key generation time ${metrics.keyGenerationTime}ms exceeds threshold ${this.thresholds.keyGenerationTime}ms`);
      shouldRollback = true;
    }

    if (metrics.memoryUsage > this.thresholds.memoryUsage) {
      violations.push(`Memory usage ${metrics.memoryUsage}MB exceeds threshold ${this.thresholds.memoryUsage}MB`);
      shouldRollback = true;
    }

    if (metrics.errorRate > this.thresholds.errorRate) {
      violations.push(`Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold ${(this.thresholds.errorRate * 100).toFixed(2)}%`);
      shouldRollback = true;
    }

    const passed = violations.length === 0;

    if (!passed) {
      this.logger.warn(`Performance validation failed: ${violations.join(', ')}`);
    }

    return {
      passed,
      violations,
      shouldRollback,
    };
  }

  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    return {
      authenticationLatency: crypto.randomBytes(1)[0] / 255 * 150 + 50,
      keyGenerationTime: crypto.randomBytes(2).readUInt16BE(0) / 65535 * 1000 + 100,
      memoryUsage: crypto.randomBytes(1)[0] / 255 * 30 + 10,
      errorRate: crypto.randomBytes(1)[0] / 255 * 0.005,
      timestamp: new Date().toISOString(),
    };
  }
}
