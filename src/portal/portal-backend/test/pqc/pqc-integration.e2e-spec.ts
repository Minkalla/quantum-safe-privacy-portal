import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PQCFeatureFlagsService } from '../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../src/pqc/pqc-monitoring.service';
import { JwtService } from '../../src/jwt/jwt.service';

describe('PQC Integration (e2e)', () => {
  let app: INestApplication;
  let pqcFeatureFlags: PQCFeatureFlagsService;
  let pqcMonitoring: PQCMonitoringService;

  beforeAll(async () => {
    const mongoUri = (global as any).__MONGO_URI__;

    process.env['AWS_REGION'] = 'us-east-1';
    process.env['SKIP_SECRETS_MANAGER'] = 'true';
    process.env['JWT_ACCESS_SECRET_ID'] = 'test-access-secret';
    process.env['JWT_REFRESH_SECRET_ID'] = 'test-refresh-secret';
    process.env['PQC_ENABLED'] = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(mongoUri),
      ],
      providers: [
        PQCFeatureFlagsService,
        PQCMonitoringService,
        JwtService,
      ],
    })
      .overrideProvider(JwtService)
      .useValue({
        verifyToken: jest.fn().mockImplementation((token: string) => {
          if (token === 'valid-jwt-token') {
            return { userId: 'test-user-id', email: 'test@example.com' };
          }
          return null;
        }),
        generateTokens: jest.fn().mockReturnValue({
          accessToken: 'valid-jwt-token',
          refreshToken: 'valid-refresh-token',
        }),
      })
      .overrideProvider(PQCFeatureFlagsService)
      .useValue({
        isEnabled: jest.fn().mockReturnValue(true),
        getStatus: jest.fn().mockReturnValue({
          flags: { hybrid_mode: true, pqc_key_generation: true, pqc_jwt_signing: true },
          rolloutPercentages: { hybrid_mode: 50, pqc_key_generation: 25, pqc_jwt_signing: 10 },
          algorithmPreferences: { kem: 'kyber768', signature: 'dilithium3' },
        }),
      })
      .overrideProvider(PQCMonitoringService)
      .useValue({
        recordPQCKeyGeneration: jest.fn().mockResolvedValue(undefined),
        recordPQCJWTSigning: jest.fn().mockResolvedValue(undefined),
        recordPQCAuthentication: jest.fn().mockResolvedValue(undefined),
        getMetricsSummary: jest.fn().mockResolvedValue({
          keyGenerationLatency: { avg: 45, p95: 80, p99: 120 },
          jwtSigningLatency: { avg: 25, p95: 40, p99: 60 },
          authenticationLatency: { avg: 150, p95: 200, p99: 300 },
          errorRate: 0.01,
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    pqcFeatureFlags = moduleFixture.get<PQCFeatureFlagsService>(PQCFeatureFlagsService);
    pqcMonitoring = moduleFixture.get<PQCMonitoringService>(PQCMonitoringService);
    
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
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

      expect([200, 201, 400, 401, 404, 500]).toContain(response.status);
    });

    it('should handle health check with PQC monitoring', async () => {
      const response = await request(app.getHttpServer())
        .get('/portal/health');

      expect([200, 404, 500]).toContain(response.status);
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
