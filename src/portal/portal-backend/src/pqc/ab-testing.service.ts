import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ExperimentConfig {
  experimentId: string;
  name: string;
  featureFlag: string;
  controlPercentage: number;
  treatmentPercentage: number;
  successMetrics: string[];
  failureThresholds: Record<string, number>;
  status?: ExperimentStatus;
}

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);
  private experiments: Map<string, ExperimentConfig> = new Map();

  constructor() {
    this.loadExperiments();
  }

  private loadExperiments(): void {
    const defaultExperiments: ExperimentConfig[] = [
      {
        experimentId: 'pqc_kyber_rollout_v1',
        name: 'PQC Kyber-768 Gradual Rollout',
        featureFlag: 'pqc_kyber_enabled',
        controlPercentage: 95.0,
        treatmentPercentage: 5.0,
        successMetrics: ['authentication_success_rate', 'response_time_ms'],
        failureThresholds: {
          error_rate: 0.05,
          response_time_ms: 2000,
        },
        status: ExperimentStatus.RUNNING,
      },
      {
        experimentId: 'pqc_dilithium_rollout_v1',
        name: 'PQC Dilithium-3 Signature Rollout',
        featureFlag: 'pqc_dilithium_enabled',
        controlPercentage: 98.0,
        treatmentPercentage: 2.0,
        successMetrics: ['signature_verification_success_rate', 'signature_generation_time_ms'],
        failureThresholds: {
          error_rate: 0.03,
          signature_generation_time_ms: 1500,
        },
        status: ExperimentStatus.RUNNING,
      },
    ];

    defaultExperiments.forEach(exp => {
      this.experiments.set(exp.experimentId, exp);
    });
  }

  assignUserToVariant(userId: string, experimentId: string): string {
    if (!this.experiments.has(experimentId)) {
      return 'control';
    }

    const userHash = createHash('sha256').update(`${userId}_${experimentId}`).digest('hex');
    const hashValue = parseInt(userHash.substring(0, 8), 16) % 100;

    const experiment = this.experiments.get(experimentId)!;
    if (hashValue < experiment.controlPercentage) {
      return 'control';
    } else if (hashValue < experiment.controlPercentage + experiment.treatmentPercentage) {
      return 'treatment';
    } else {
      return 'control';
    }
  }

  shouldUsePQC(userId: string): boolean {
    const pqcExperiments = Array.from(this.experiments.values()).filter(
      exp => exp.featureFlag === 'pqc_enabled' || exp.featureFlag.includes('pqc')
    );

    for (const experiment of pqcExperiments) {
      if (experiment.status === ExperimentStatus.RUNNING) {
        const variant = this.assignUserToVariant(userId, experiment.experimentId);
        if (variant === 'treatment') {
          this.logger.debug(`User ${userId} assigned to PQC treatment in experiment ${experiment.experimentId}`);
          return true;
        }
      }
    }

    return false;
  }

  getExperiment(experimentId: string): ExperimentConfig | undefined {
    return this.experiments.get(experimentId);
  }

  getAllExperiments(): ExperimentConfig[] {
    return Array.from(this.experiments.values());
  }

  updateExperimentStatus(experimentId: string, status: ExperimentStatus): void {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.status = status;
      this.logger.log(`Experiment ${experimentId} status updated to ${status}`);
    }
  }
}
