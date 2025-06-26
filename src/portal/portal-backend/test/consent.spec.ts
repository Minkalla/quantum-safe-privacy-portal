/**
 * @file consent.spec.ts
 * @description Jest integration tests for the POST /portal/consent endpoint.
 * Tests cover success cases, error cases, edge cases, security cases, and validation cases
 * as specified in Sub-task 1.5.6b Implementation Plan.
 *
 * @module ConsentTests
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Comprehensive test suite targeting 90% coverage with MongoDB memory server mocking
 * and supertest for HTTP endpoint testing. Ensures GDPR Article 7 and NIST SP 800-53 SA-11 compliance.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsentModule } from '../src/consent/consent.module';
import { ConsentService } from '../src/consent/consent.service';
import { JwtService } from '../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../src/pqc/pqc-monitoring.service';
import { ConsentType } from '../src/consent/dto/create-consent.dto';
import { ConfigModule } from '@nestjs/config';

describe('POST /portal/consent (Integration Tests)', () => {
  let app: INestApplication;
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
        ConsentModule,
      ],
    })
      .overrideProvider(JwtService)
      .useValue({
        verifyToken: jest.fn().mockImplementation((token: string) => {
          if (token === 'valid-jwt-token') {
            return { userId: testUserId, email: 'test@example.com' };
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
    validJwtToken = 'valid-jwt-token';

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
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

  describe('Success Cases', () => {
    it('should create consent successfully with valid payload and return 200 OK', async () => {
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.MARKETING,
        granted: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(createConsentDto)
        .expect(200);

      expect(response.body).toHaveProperty('consentId');
      expect(response.body).toHaveProperty('userId', testUserId);
      expect(response.body).toHaveProperty('consentType', ConsentType.MARKETING);
      expect(response.body).toHaveProperty('granted', true);
    });

    it('should update existing consent when granted status changes', async () => {
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.ANALYTICS,
        granted: true,
      };

      await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(createConsentDto)
        .expect(200);

      const updateConsentDto = {
        userId: testUserId,
        consentType: ConsentType.ANALYTICS,
        granted: false,
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(updateConsentDto)
        .expect(200);

      expect(response.body).toHaveProperty('granted', false);
    });
  });

  describe('Invalid Payload Cases', () => {
    it('should return 400 Bad Request when userId is missing', async () => {
      const invalidDto = {
        consentType: ConsentType.MARKETING,
        granted: true,
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should return 400 Bad Request when consentType is invalid', async () => {
      const invalidDto = {
        userId: testUserId,
        consentType: 'invalid_consent_type',
        granted: true,
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('Consent type must be one of: marketing, analytics, data_processing, cookies, third_party_sharing');
    });

    it('should return 400 Bad Request when granted is not a boolean', async () => {
      const invalidDto = {
        userId: testUserId,
        consentType: ConsentType.MARKETING,
        granted: 'yes',
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('Granted must be a boolean value.');
    });

    it('should return 400 Bad Request when userId has invalid length', async () => {
      const invalidDto = {
        userId: 'short',
        consentType: ConsentType.MARKETING,
        granted: true,
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('User ID must be exactly 24 characters long.');
    });
  });

  describe('Duplicate Consent Cases', () => {
    it('should return 409 Conflict when creating duplicate consent with same granted status', async () => {
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.COOKIES,
        granted: true,
      };

      await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(createConsentDto)
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(createConsentDto)
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('message', 'Consent record already exists with the same granted status');
    });
  });

  describe('Unauthorized Cases', () => {
    it('should return 401 Unauthorized when Authorization header is missing', async () => {
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.MARKETING,
        granted: true,
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .send(createConsentDto)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message', 'Authorization header is missing');
    });

    it('should return 401 Unauthorized when JWT token is invalid', async () => {
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.MARKETING,
        granted: true,
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', 'Bearer invalid-token')
        .send(createConsentDto)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message', 'Invalid or expired JWT token');
    });

    it('should return 401 Unauthorized when Bearer token is malformed', async () => {
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.MARKETING,
        granted: true,
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', 'InvalidFormat token')
        .send(createConsentDto)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message', 'Invalid authorization header format');
    });
  });

  describe('Malformed JSON Cases', () => {
    it('should return 400 Bad Request when request body is malformed JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .set('Content-Type', 'application/json')
        .send('{"userId": "invalid json"')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 Bad Request when Content-Type is not application/json', async () => {
      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('Edge Cases', () => {
    it('should handle optional fields correctly when not provided', async () => {
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.DATA_PROCESSING,
        granted: false,
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(createConsentDto)
        .expect(200);

      expect(response.body).toHaveProperty('consentId');
      expect(response.body).toHaveProperty('granted', false);
    });

    it('should validate IP address format when provided', async () => {
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.THIRD_PARTY_SHARING,
        granted: true,
        ipAddress: 'invalid-ip-format',
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(createConsentDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should handle maximum length userAgent correctly', async () => {
      const longUserAgent = 'a'.repeat(501);
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.MARKETING,
        granted: true,
        userAgent: longUserAgent,
      };

      const response = await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(createConsentDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('User agent must not exceed 500 characters.');
    });
  });

  describe('GET /portal/consent/:userId', () => {
    it('should retrieve consent records successfully', async () => {
      const createConsentDto = {
        userId: testUserId,
        consentType: ConsentType.MARKETING,
        granted: true,
      };

      await request(app.getHttpServer())
        .post('/portal/consent')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(createConsentDto)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('userId', testUserId);
      expect(response.body[0]).toHaveProperty('consentType', ConsentType.MARKETING);
    });

    it('should return 404 when no consent records found', async () => {
      const nonExistentUserId = '60d5ec49f1a23c001c8a4d7e';

      const response = await request(app.getHttpServer())
        .get(`/portal/consent/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message', 'No consent records found for this user');
    });

    it('should return 401 Unauthorized when Authorization header is missing', async () => {
      const response = await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message', 'Authorization header is missing');
    });

    it('should return 401 Unauthorized when JWT token is invalid', async () => {
      const response = await request(app.getHttpServer())
        .get(`/portal/consent/${testUserId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message', 'Invalid or expired JWT token');
    });

    it('should return 400 Bad Request when user_id is malformed', async () => {
      const malformedUserId = 'invalid-user-id';

      const response = await request(app.getHttpServer())
        .get(`/portal/consent/${malformedUserId}`)
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('User ID must be exactly 24 characters long.');
    });

    it('should return 400 Bad Request when user_id contains invalid characters', async () => {
      const invalidUserId = '60d5ec49f1a23c001c8a4d7!';

      const response = await request(app.getHttpServer())
        .get(`/portal/consent/${invalidUserId}`)
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });
});
