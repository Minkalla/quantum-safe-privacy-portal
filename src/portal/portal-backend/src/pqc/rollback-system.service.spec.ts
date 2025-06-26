import { Test, TestingModule } from '@nestjs/testing';
import { RollbackSystemService } from './rollback-system.service';
import { ABTestingService, ExperimentStatus } from './ab-testing.service';
import { MetricsCollectorService } from './metrics-collector.service';

describe('RollbackSystemService', () => {
  let service: RollbackSystemService;
  let abTestingService: ABTestingService;
  let metricsCollector: MetricsCollectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RollbackSystemService, ABTestingService, MetricsCollectorService],
    }).compile();

    service = module.get<RollbackSystemService>(RollbackSystemService);
    abTestingService = module.get<ABTestingService>(ABTestingService);
    metricsCollector = module.get<MetricsCollectorService>(MetricsCollectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('monitorExperiments', () => {
    it('should monitor running experiments', async () => {
      const spy = jest.spyOn(service as any, 'checkRollbackConditions').mockResolvedValue(undefined);
      
      await service.monitorExperiments();
      
      expect(spy).toHaveBeenCalled();
    });

    it('should not monitor completed experiments', async () => {
      const experiments = abTestingService.getAllExperiments();
      experiments.forEach(exp => {
        abTestingService.updateExperimentStatus(exp.experimentId, ExperimentStatus.COMPLETED);
      });
      
      const spy = jest.spyOn(service as any, 'checkRollbackConditions').mockResolvedValue(undefined);
      
      await service.monitorExperiments();
      
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('rollback triggers', () => {
    it('should trigger rollback when error rate exceeds threshold', async () => {
      const experimentId = 'pqc_kyber_rollout_v1';
      
      for (let i = 0; i < 100; i++) {
        metricsCollector.recordEvent(`user${i}`, experimentId, 'treatment', 'error_rate', 0.1);
      }
      
      
      await service.monitorExperiments();
      
      const experiment = abTestingService.getExperiment(experimentId);
      expect(experiment?.status).toBe(ExperimentStatus.FAILED);
    });

    it('should trigger rollback when response time exceeds threshold', async () => {
      const experimentId = 'pqc_kyber_rollout_v1';
      
      for (let i = 0; i < 60; i++) {
        metricsCollector.recordEvent(`user${i}`, experimentId, 'treatment', 'response_time_ms', 3000);
      }
      
      await service.monitorExperiments();
      
      const experiment = abTestingService.getExperiment(experimentId);
      expect(experiment?.status).toBe(ExperimentStatus.FAILED);
    });

    it('should not trigger rollback with insufficient sample size', async () => {
      const experimentId = 'pqc_kyber_rollout_v1';
      
      for (let i = 0; i < 10; i++) {
        metricsCollector.recordEvent(`user${i}`, experimentId, 'treatment', 'error_rate', 0.1);
      }
      
      await service.monitorExperiments();
      
      const experiment = abTestingService.getExperiment(experimentId);
      expect(experiment?.status).toBe(ExperimentStatus.RUNNING);
    });

    it('should not trigger rollback when metrics are within thresholds', async () => {
      const experimentId = 'pqc_kyber_rollout_v1';
      
      for (let i = 0; i < 100; i++) {
        metricsCollector.recordEvent(`user${i}`, experimentId, 'treatment', 'error_rate', 0.01);
        metricsCollector.recordEvent(`user${i}`, experimentId, 'treatment', 'response_time_ms', 500);
      }
      
      await service.monitorExperiments();
      
      const experiment = abTestingService.getExperiment(experimentId);
      expect(experiment?.status).toBe(ExperimentStatus.RUNNING);
    });
  });

  describe('rollback execution', () => {
    it('should update experiment status to failed on rollback', async () => {
      const experimentId = 'pqc_kyber_rollout_v1';
      const trigger = {
        metricName: 'error_rate',
        thresholdValue: 0.05,
        comparisonOperator: 'gt' as const,
        minSampleSize: 100,
      };
      
      await (service as any).executeRollback(experimentId, trigger);
      
      const experiment = abTestingService.getExperiment(experimentId);
      expect(experiment?.status).toBe(ExperimentStatus.FAILED);
    });
  });

  describe('custom triggers', () => {
    it('should allow adding custom rollback triggers', () => {
      const customTrigger = {
        metricName: 'custom_metric',
        thresholdValue: 100,
        comparisonOperator: 'gt' as const,
        minSampleSize: 50,
      };
      
      service.addCustomTrigger(customTrigger);
      
      const triggers = service.getRollbackTriggers();
      expect(triggers).toContainEqual(customTrigger);
    });

    it('should return all rollback triggers', () => {
      const triggers = service.getRollbackTriggers();
      expect(triggers.length).toBeGreaterThan(0);
      expect(triggers).toContainEqual(expect.objectContaining({
        metricName: 'error_rate',
        thresholdValue: 0.05,
      }));
    });
  });
});
