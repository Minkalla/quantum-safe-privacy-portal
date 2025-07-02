import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsentModule } from '../../src/consent/consent.module';
import { AuthModule } from '../../src/auth/auth.module';
import { JwtModule } from '../../src/jwt/jwt.module';
import { PQCFeatureFlagsService } from '../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../src/pqc/pqc-monitoring.service';
import { ConsentType } from '../../src/consent/dto/create-consent.dto';
import { JwtService } from '../../src/jwt/jwt.service';
import { AuthService } from '../../src/auth/auth.service';

describe('E2E Consent Flow Tests', () => {
  let app: INestApplication;
  let testUserId: string;
  let validAccessToken: string;

  beforeAll(async () => {
    const mongoUri = (global as any).__MONGO_URI__;

    process.env['AWS_REGION'] = 'us-east-1';
    process.env['SKIP_SECRETS_MANAGER'] = 'true';
    process.env['JWT_ACCESS_SECRET_ID'] = 'test-access-secret';
    process.env['JWT_REFRESH_SECRET_ID'] = 'test-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(mongoUri),
        ConsentModule,
        AuthModule,
        JwtModule,
      ],
    })
      .overrideProvider(JwtService)
      .useValue({
        verifyToken: jest.fn().mockImplementation((token: string) => {
          if (token === validAccessToken) {
            return { userId: testUserId, email: 'e2e-test@example.com' };
          }
          return null;
        }),
        generateTokens: jest.fn().mockReturnValue({
          accessToken: 'e2e-access-token',
          refreshToken: 'e2e-refresh-token',
        }),
      })
      .overrideProvider(PQCFeatureFlagsService)
      .useValue({
        isEnabled: jest.fn().mockReturnValue(false),
      })
      .overrideProvider(PQCMonitoringService)
      .useValue({
        recordPQCKeyGeneration: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('portal');
    app.useGlobalPipes(new ValidationPipe());

    testUserId = '60d5ec49f1a23c001c8a4d7d';
    validAccessToken = 'e2e-access-token';

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  afterEach(async () => {
    const connection = (global as any).__MONGO_CONNECTION__;
    if (connection) {
      const db = connection.db();
      const collections = await db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }
  });

  describe('Full E2E Consent Workflow', () => {
    it('should complete full consent workflow: login simulation → consent creation → consent retrieval', async () => {
      const authHeaders = { Authorization: `Bearer ${validAccessToken}` };

      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.MARKETING,
        granted: true,
        ipAddress: '192.168.1.100',
        userAgent: 'E2E Test Browser/1.0',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/portal/consent')
        .set(authHeaders)
        .send(createConsentDto)
        .expect(200);

      expect(createResponse.body).toHaveProperty('consentId');
      expect(createResponse.body).toHaveProperty('userId', testUserId);
      expect(createResponse.body).toHaveProperty('consentType', ConsentType.MARKETING);
      expect(createResponse.body).toHaveProperty('granted', true);

      const retrieveResponse = await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .set(authHeaders)
        .expect(200);

      expect(Array.isArray(retrieveResponse.body)).toBe(true);
      expect(retrieveResponse.body.length).toBe(1);
      expect(retrieveResponse.body[0]).toHaveProperty('userId', testUserId);
      expect(retrieveResponse.body[0]).toHaveProperty('consentType', ConsentType.MARKETING);
      expect(retrieveResponse.body[0]).toHaveProperty('granted', true);
      expect(retrieveResponse.body[0]).toHaveProperty('consentId', createResponse.body.consentId);
    });

    it('should handle multiple consent types in full workflow', async () => {
      const authHeaders = { Authorization: `Bearer ${validAccessToken}` };

      const consentTypes = [
        ConsentType.MARKETING,
        ConsentType.ANALYTICS,
        ConsentType.DATA_PROCESSING,
      ];

      for (const consentType of consentTypes) {
        const createConsentDto = {
          userId: testUserId,
          consentType,
          granted: true,
        };

        await request(app.getHttpServer())
          .post('/portal/consent')
          .set(authHeaders)
          .send(createConsentDto)
          .expect(200);
      }

      const retrieveResponse = await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .set(authHeaders)
        .expect(200);

      expect(retrieveResponse.body.length).toBe(3);

      const retrievedTypes = retrieveResponse.body.map(c => c.consentType);
      expect(retrievedTypes).toContain(ConsentType.MARKETING);
      expect(retrievedTypes).toContain(ConsentType.ANALYTICS);
      expect(retrievedTypes).toContain(ConsentType.DATA_PROCESSING);
    });

    it('should handle consent workflow with authentication failure', async () => {
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.COOKIES,
        granted: true,
      };

      await request(app.getHttpServer())
        .post('/portal/consent')
        .send(createConsentDto)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .expect(401);

      const authHeaders = { Authorization: `Bearer ${validAccessToken}` };
      await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .set(authHeaders)
        .expect(404);
    });

    it('should handle consent update workflow', async () => {
      const authHeaders = { Authorization: `Bearer ${validAccessToken}` };

      const initialConsentDto = {
        userId: testUserId,
        consentType: ConsentType.THIRD_PARTY_SHARING,
        granted: true,
      };

      await request(app.getHttpServer())
        .post('/portal/consent')
        .set(authHeaders)
        .send(initialConsentDto)
        .expect(200);

      const updateConsentDto = {
        userId: testUserId,
        consentType: ConsentType.THIRD_PARTY_SHARING,
        granted: false,
      };

      const updateResponse = await request(app.getHttpServer())
        .post('/portal/consent')
        .set(authHeaders)
        .send(updateConsentDto)
        .expect(200);

      expect(updateResponse.body).toHaveProperty('granted', false);

      const retrieveResponse = await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .set(authHeaders)
        .expect(200);

      expect(retrieveResponse.body.length).toBe(1);
      expect(retrieveResponse.body[0]).toHaveProperty('granted', false);
    });

    it('should handle edge cases in E2E workflow', async () => {
      const authHeaders = { Authorization: `Bearer ${validAccessToken}` };

      const edgeCaseDto = {
        userId: testUserId,
        consentType: ConsentType.DATA_PROCESSING,
        granted: false,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/portal/consent')
        .set(authHeaders)
        .send(edgeCaseDto)
        .expect(200);

      expect(createResponse.body).toHaveProperty('granted', false);

      const retrieveResponse = await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .set(authHeaders)
        .expect(200);

      expect(retrieveResponse.body.length).toBe(1);
      expect(retrieveResponse.body[0]).toHaveProperty('granted', false);
    });

    it('should handle invalid user ID in E2E workflow', async () => {
      const authHeaders = { Authorization: `Bearer ${validAccessToken}` };
      const invalidUserId = 'invalid-user-id';

      const createConsentDto = {
        userId: invalidUserId,
        consentType: ConsentType.MARKETING,
        granted: true,
      };

      await request(app.getHttpServer())
        .post('/portal/consent')
        .set(authHeaders)
        .send(createConsentDto)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/portal/consent/${invalidUserId}`)
        .set(authHeaders)
        .expect(400);
    });

    it('should handle duplicate consent prevention in E2E workflow', async () => {
      const authHeaders = { Authorization: `Bearer ${validAccessToken}` };

      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.COOKIES,
        granted: true,
      };

      await request(app.getHttpServer())
        .post('/portal/consent')
        .set(authHeaders)
        .send(createConsentDto)
        .expect(200);

      await request(app.getHttpServer())
        .post('/portal/consent')
        .set(authHeaders)
        .send(createConsentDto)
        .expect(409);

      const retrieveResponse = await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .set(authHeaders)
        .expect(200);

      expect(retrieveResponse.body.length).toBe(1);
    });

    it('should handle complete workflow with IP address and user agent tracking', async () => {
      const authHeaders = { Authorization: `Bearer ${validAccessToken}` };

      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.ANALYTICS,
        granted: true,
        ipAddress: '203.0.113.42',
        userAgent: 'Mozilla/5.0 (E2E Test) AppleWebKit/537.36',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/portal/consent')
        .set(authHeaders)
        .send(createConsentDto)
        .expect(200);

      expect(createResponse.body).toHaveProperty('ipAddress', '203.0.113.42');
      expect(createResponse.body).toHaveProperty('userAgent', 'Mozilla/5.0 (E2E Test) AppleWebKit/537.36');

      const retrieveResponse = await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .set(authHeaders)
        .expect(200);

      expect(retrieveResponse.body[0]).toHaveProperty('ipAddress', '203.0.113.42');
      expect(retrieveResponse.body[0]).toHaveProperty('userAgent', 'Mozilla/5.0 (E2E Test) AppleWebKit/537.36');
    });
  });
});
