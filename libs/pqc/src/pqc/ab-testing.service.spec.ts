import { Test, TestingModule } from '@nestjs/testing';
import { ABTestingService, ExperimentStatus } from './ab-testing.service';

describe('ABTestingService', () => {
  let service: ABTestingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ABTestingService],
    }).compile();

    service = module.get<ABTestingService>(ABTestingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignUserToVariant', () => {
    it('should return control for non-existent experiment', () => {
      const result = service.assignUserToVariant('user123', 'non-existent');
      expect(result).toBe('control');
    });

    it('should consistently assign same user to same variant', () => {
      const userId = 'test-user-123';
      const experimentId = 'pqc_kyber_rollout_v1';

      const assignment1 = service.assignUserToVariant(userId, experimentId);
      const assignment2 = service.assignUserToVariant(userId, experimentId);

      expect(assignment1).toBe(assignment2);
    });

    it('should assign users to control and treatment based on percentages', () => {
      const experimentId = 'pqc_kyber_rollout_v1';
      const assignments = new Map<string, number>();

      for (let i = 0; i < 100; i++) {
        const userId = `user-${i}`;
        const variant = service.assignUserToVariant(userId, experimentId);
        assignments.set(variant, (assignments.get(variant) || 0) + 1);
      }

      const controlCount = assignments.get('control') || 0;
      const treatmentCount = assignments.get('treatment') || 0;

      expect(controlCount).toBeGreaterThan(80);
      expect(treatmentCount).toBeLessThan(20);
      expect(controlCount + treatmentCount).toBe(100);
    });
  });

  describe('shouldUsePQC', () => {
    it('should return false when no PQC experiments are running', () => {
      const experiments = service.getAllExperiments();
      experiments.forEach(exp => {
        service.updateExperimentStatus(exp.experimentId, ExperimentStatus.COMPLETED);
      });

      const result = service.shouldUsePQC('test-user');
      expect(result).toBe(false);
    });

    it('should return true for users in treatment group of PQC experiments', () => {
      let foundTreatmentUser = false;

      for (let i = 0; i < 100; i++) {
        const userId = `user-${i}`;
        if (service.shouldUsePQC(userId)) {
          foundTreatmentUser = true;
          break;
        }
      }

      expect(foundTreatmentUser).toBe(true);
    });
  });

  describe('experiment management', () => {
    it('should get experiment by ID', () => {
      const experiment = service.getExperiment('pqc_kyber_rollout_v1');
      expect(experiment).toBeDefined();
      expect(experiment?.experimentId).toBe('pqc_kyber_rollout_v1');
    });

    it('should return undefined for non-existent experiment', () => {
      const experiment = service.getExperiment('non-existent');
      expect(experiment).toBeUndefined();
    });

    it('should update experiment status', () => {
      const experimentId = 'pqc_kyber_rollout_v1';
      service.updateExperimentStatus(experimentId, ExperimentStatus.COMPLETED);

      const experiment = service.getExperiment(experimentId);
      expect(experiment?.status).toBe(ExperimentStatus.COMPLETED);
    });

    it('should get all experiments', () => {
      const experiments = service.getAllExperiments();
      expect(experiments).toHaveLength(2);
      expect(experiments.map(e => e.experimentId)).toContain('pqc_kyber_rollout_v1');
      expect(experiments.map(e => e.experimentId)).toContain('pqc_dilithium_rollout_v1');
    });
  });
});
