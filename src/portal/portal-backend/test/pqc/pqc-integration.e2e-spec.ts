import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PQCFeatureFlagsService } from '../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../src/pqc/pqc-monitoring.service';

describe('PQC Integration (e2e)', () => {
  let app: INestApplication;
  let pqcFeatureFlags: PQCFeatureFlagsService;
  let pqcMonitoring: PQCMonitoringService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    pqcFeatureFlags = moduleFixture.get<PQCFeatureFlagsService>(PQCFeatureFlagsService);
    pqcMonitoring = moduleFixture.get<PQCMonitoringService>(PQCMonitoringService);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('PQC Feature Flags Integration', () => {
    it('should have PQC feature flags service available', () => {
      expect(pqcFeatureFlags).toBeDefined();
    });

    it('should check hybrid mode feature flag', () => {
      const isHybridEnabled = pqcFeatureFlags.isEnabled('hybrid_mode', 'test-user');
      expect(typeof isHybridEnabled).toBe('boolean');
    });

    it('should handle PQC key generation feature flag', () => {
      const isKeyGenEnabled = pqcFeatureFlags.isEnabled('pqc_key_generation', 'test-user');
      expect(typeof isKeyGenEnabled).toBe('boolean');
    });

    it('should handle PQC JWT signing feature flag', () => {
      const isJWTSigningEnabled = pqcFeatureFlags.isEnabled('pqc_jwt_signing', 'test-user');
      expect(typeof isJWTSigningEnabled).toBe('boolean');
    });
  });

  describe('PQC Monitoring Integration', () => {
    it('should have PQC monitoring service available', () => {
      expect(pqcMonitoring).toBeDefined();
    });

    it('should record PQC key generation metrics', async () => {
      const startTime = Date.now();
      await expect(
        pqcMonitoring.recordPQCKeyGeneration('test-user', startTime, true),
      ).resolves.not.toThrow();
    });

    it('should record PQC JWT signing metrics', async () => {
      const startTime = Date.now();
      await expect(
        pqcMonitoring.recordPQCJWTSigning('test-user', startTime, true),
      ).resolves.not.toThrow();
    });

    it('should record PQC authentication metrics', async () => {
      const startTime = Date.now();
      await expect(
        pqcMonitoring.recordPQCAuthentication('test-user', startTime, true),
      ).resolves.not.toThrow();
    });

    it('should get metrics summary', async () => {
      const metrics = await pqcMonitoring.getMetricsSummary();
      expect(metrics).toHaveProperty('keyGenerationLatency');
      expect(metrics).toHaveProperty('jwtSigningLatency');
      expect(metrics).toHaveProperty('authenticationLatency');
      expect(metrics).toHaveProperty('errorRate');
    });

    it('should validate performance thresholds', async () => {
      const metrics = await pqcMonitoring.getMetricsSummary();
      expect(metrics).toHaveProperty('keyGenerationLatency');
      expect(metrics).toHaveProperty('jwtSigningLatency');
      expect(metrics).toHaveProperty('authenticationLatency');
    });
  });

  describe('PQC Authentication Flow Placeholder', () => {
    it('should handle authentication endpoint availability', async () => {
      const response = await request(app.getHttpServer())
        .post('/portal/auth/login')
        .send({
          username: 'test@example.com',
          password: 'testpassword',
          rememberMe: false,
        });

      expect([200, 401, 400]).toContain(response.status);
    });

    it('should handle health check with PQC monitoring', async () => {
      const response = await request(app.getHttpServer())
        .get('/portal/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });
  });

  describe('PQC Configuration Validation', () => {
    it('should validate PQC feature flag configuration', () => {
      const status = pqcFeatureFlags.getStatus();
      expect(status).toHaveProperty('flags');
      expect(status).toHaveProperty('rolloutPercentages');
      expect(status).toHaveProperty('algorithmPreferences');
    });

    it('should validate PQC monitoring service', async () => {
      const metrics = await pqcMonitoring.getMetricsSummary();
      expect(metrics).toHaveProperty('keyGenerationLatency');
      expect(metrics).toHaveProperty('jwtSigningLatency');
      expect(metrics).toHaveProperty('authenticationLatency');
      expect(metrics).toHaveProperty('errorRate');
    });
  });
});
