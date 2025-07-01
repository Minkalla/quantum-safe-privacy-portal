import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '../../src/jwt/jwt.service';
import { AuthModule } from '../../src/auth/auth.module';
import { PQCDataModule } from '../../src/pqc-data/pqc-data.module';

describe('PQC API Endpoints', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let validJwtToken: string;
  let testUserId: string;

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
        AuthModule,
        PQCDataModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    testUserId = 'test-user-' + Date.now();

    const tokens = jwtService.generateTokens({ userId: testUserId, email: 'test@example.com' });
    validJwtToken = tokens.accessToken;
  });

  describe('PQC Consent API', () => {
    let createdConsentId: string;

    it('should create PQC-protected consent', async () => {
      const consentData = {
        userId: testUserId,
        consentData: {
          consentType: 'marketing',
          status: 'granted',
          data: { marketing: true, analytics: false },
        },
        pqcEnabled: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/pqc/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(consentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.algorithm).toBe('ML-KEM-768');
      expect(response.body.signed).toBe(true);
      expect(response.body.consentId).toBeDefined();

      createdConsentId = response.body.consentId;
    });

    it('should retrieve PQC-protected consent', async () => {
      if (!createdConsentId) {
        const consentData = {
          userId: testUserId,
          consentData: {
            consentType: 'marketing',
            status: 'granted',
            data: { marketing: true, analytics: false },
          },
          pqcEnabled: true,
        };

        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/pqc/consent')
          .set('Authorization', `Bearer ${validJwtToken}`)
          .send(consentData)
          .expect(201);

        createdConsentId = createResponse.body.consentId;
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/pqc/consent/${createdConsentId}`)
        .query({ userId: testUserId })
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.consent).toBeDefined();
      expect(response.body.integrity).toBeDefined();
      expect(response.body.integrity.algorithm).toMatch(/ML-DSA-65|ML-KEM-768|RSA-2048|None/);
    });

    it('should update PQC-protected consent', async () => {
      if (!createdConsentId) {
        throw new Error('No consent created in previous test');
      }

      const updateData = {
        consentType: 'analytics',
        status: 'granted',
        data: { analytics: true, marketing: false },
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/pqc/consent/${createdConsentId}`)
        .query({ userId: testUserId })
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.algorithm).toBe('ML-KEM-768');
      expect(response.body.signed).toBe(true);
    });

    it('should handle invalid consent ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/pqc/consent/invalid-id')
        .query({ userId: testUserId })
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Consent not found');
    });
  });

  describe('PQC User API', () => {
    it('should enable PQC for user', async () => {
      const pqcOptions = {
        algorithms: ['ML-KEM-768', 'ML-DSA-65'],
        hybridMode: true,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/pqc/user/${testUserId}/enable-pqc`)
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(pqcOptions)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.pqcEnabled).toBe(true);
      expect(response.body.algorithms).toEqual(expect.arrayContaining(['ML-KEM-768', 'ML-DSA-65']));
      expect(response.body.hybridMode).toBe(true);
    });

    it('should get user PQC status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/pqc/user/${testUserId}/pqc-status`)
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe(testUserId);
      expect(response.body.algorithms).toBeDefined();
      expect(Array.isArray(response.body.algorithms)).toBe(true);
    });

    it('should update PQC settings', async () => {
      const newSettings = {
        algorithms: ['ML-KEM-768'],
        hybridMode: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/pqc/user/${testUserId}/pqc-settings`)
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(newSettings)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.algorithms).toEqual(['ML-KEM-768']);
      expect(response.body.hybridMode).toBe(false);
    });

    it('should disable PQC for user', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/pqc/user/${testUserId}/disable-pqc`)
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.pqcEnabled).toBe(false);
      expect(response.body.disabledAt).toBeDefined();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without JWT token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/pqc/user/${testUserId}/pqc-status`)
        .expect(401);
    });

    it('should reject requests with invalid JWT token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/pqc/user/${testUserId}/pqc-status`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should validate consent creation input', async () => {
      const invalidData = {
        consentData: 'invalid-object-type',
      };

      await request(app.getHttpServer())
        .post('/api/v1/pqc/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should validate user options input', async () => {
      const invalidOptions = {
        algorithms: 'not-an-array',
        hybridMode: 'not-a-boolean',
      };

      await request(app.getHttpServer())
        .post(`/api/v1/pqc/user/${testUserId}/enable-pqc`)
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(invalidOptions)
        .expect(400);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
