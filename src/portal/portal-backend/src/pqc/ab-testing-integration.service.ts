import { Injectable, Logger } from '@nestjs/common';
import { ABTestingService } from './ab-testing.service';
import { MetricsCollectorService } from './metrics-collector.service';
import { PQCFeatureFlagsService, PQCFeatureFlagsConfig } from './pqc-feature-flags.service';

@Injectable()
export class ABTestingIntegrationService {
  private readonly logger = new Logger(ABTestingIntegrationService.name);

  constructor(
    private readonly abTestingService: ABTestingService,
    private readonly metricsCollector: MetricsCollectorService,
    private readonly pqcFeatureFlags: PQCFeatureFlagsService,
  ) {}

  shouldUsePQCForUser(userId: string, operation: string): boolean {
    const abTestResult = this.abTestingService.shouldUsePQC(userId);
    
    if (abTestResult) {
      this.recordABTestingEvent(userId, 'pqc_assignment', 'treatment', 1);
      
      const flagName = this.getFeatureFlagForOperation(operation);
      if (flagName) {
        return this.pqcFeatureFlags.isEnabled(flagName, userId);
      }
      
      return true;
    } else {
      this.recordABTestingEvent(userId, 'pqc_assignment', 'control', 0);
      return false;
    }
  }

  recordOperationMetric(userId: string, operation: string, metricName: string, value: number): void {
    const variant = this.abTestingService.shouldUsePQC(userId) ? 'treatment' : 'control';
    const experimentId = this.getExperimentIdForOperation(operation);
    
    if (experimentId) {
      this.metricsCollector.recordEvent(userId, experimentId, variant, metricName, value);
      this.logger.debug(`Recorded ${metricName}=${value} for ${operation} (${variant})`);
    }
  }

  recordAuthenticationMetrics(userId: string, success: boolean, responseTimeMs: number): void {
    const variant = this.abTestingService.shouldUsePQC(userId) ? 'treatment' : 'control';
    const experimentId = 'pqc_kyber_rollout_v1';
    
    this.metricsCollector.recordEvent(
      userId,
      experimentId,
      variant,
      'authentication_success_rate',
      success ? 1 : 0,
    );
    
    this.metricsCollector.recordEvent(
      userId,
      experimentId,
      variant,
      'response_time_ms',
      responseTimeMs,
    );
    
    if (!success) {
      this.metricsCollector.recordEvent(
        userId,
        experimentId,
        variant,
        'error_rate',
        1,
      );
    }
  }

  recordSignatureMetrics(userId: string, success: boolean, generationTimeMs: number): void {
    const variant = this.abTestingService.shouldUsePQC(userId) ? 'treatment' : 'control';
    const experimentId = 'pqc_dilithium_rollout_v1';
    
    this.metricsCollector.recordEvent(
      userId,
      experimentId,
      variant,
      'signature_verification_success_rate',
      success ? 1 : 0,
    );
    
    this.metricsCollector.recordEvent(
      userId,
      experimentId,
      variant,
      'signature_generation_time_ms',
      generationTimeMs,
    );
  }

  private recordABTestingEvent(userId: string, operation: string, variant: string, value: number): void {
    const experimentId = this.getExperimentIdForOperation(operation);
    if (experimentId) {
      this.metricsCollector.recordEvent(userId, experimentId, variant, operation, value);
    }
  }

  private getFeatureFlagForOperation(operation: string): keyof PQCFeatureFlagsConfig | null {
    const flagMapping: Record<string, keyof PQCFeatureFlagsConfig> = {
      key_generation: 'pqc_key_generation',
      user_registration: 'pqc_user_registration',
      authentication: 'pqc_authentication',
      jwt_signing: 'pqc_jwt_signing',
    };
    
    return flagMapping[operation] || null;
  }

  private getExperimentIdForOperation(operation: string): string | null {
    const experimentMapping: Record<string, string> = {
      pqc_assignment: 'pqc_kyber_rollout_v1',
      authentication: 'pqc_kyber_rollout_v1',
      key_generation: 'pqc_kyber_rollout_v1',
      jwt_signing: 'pqc_dilithium_rollout_v1',
      signature: 'pqc_dilithium_rollout_v1',
    };
    
    return experimentMapping[operation] || null;
  }

  getExperimentStatus(): any {
    const experiments = this.abTestingService.getAllExperiments();
    return experiments.map(exp => ({
      experimentId: exp.experimentId,
      name: exp.name,
      status: exp.status,
      controlPercentage: exp.controlPercentage,
      treatmentPercentage: exp.treatmentPercentage,
      metrics: this.metricsCollector.getExperimentMetrics(exp.experimentId),
    }));
  }
}
