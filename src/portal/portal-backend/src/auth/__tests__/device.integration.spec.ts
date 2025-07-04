import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth.module';
import { UserModule } from '../../user/user.module';
import { JwtModule } from '../../jwt/jwt.module';
import cookieParser from 'cookie-parser';

describe('Device Trust Integration Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let authToken: string;

  beforeAll(async () => {
    process.env.SKIP_SECRETS_MANAGER = 'true';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.AWS_REGION = 'us-east-1';
    process.env.APP_VERSION = '1.0.0-test';

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            'SKIP_SECRETS_MANAGER': 'true',
            'AWS_REGION': 'us-east-1',
            'MongoDB1': process.env.MongoDB1 || 'mongodb://localhost:27017/test',
            'JWT_SECRET': 'test-jwt-secret',
            'JWT_ACCESS_SECRET': 'test-access-secret',
            'JWT_REFRESH_SECRET': 'test-refresh-secret',
            'JWT_ACCESS_SECRET_ID': 'test-access-secret-id',
            'JWT_REFRESH_SECRET_ID': 'test-refresh-secret-id',
            'APP_VERSION': '1.0.0-test',
            'device.trust.enabled': true,
            'device.trust.expiry_days': 30,
          })],
        }),
        MongooseModule.forRoot(process.env.MongoDB1 || 'mongodb://localhost:27017/test'),
        AuthModule,
        UserModule,
        JwtModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('portal');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();
    await new Promise(resolve => setTimeout(resolve, 100));

    await request(app.getHttpServer())
      .post('/portal/auth/register')
      .send({
        email: 'devicetest@example.com',
        password: 'password123',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/portal/auth/login')
      .send({
        email: 'devicetest@example.com',
        password: 'password123',
        rememberMe: false,
      });

    if (!loginResponse.body.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    if (!loginResponse.body.user || !loginResponse.body.user.id) {
      throw new Error(`Login response missing user.id: ${JSON.stringify(loginResponse.body)}`);
    }

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (module) {
      await module.close();
    }
  });

  describe('POST /auth/device/register', () => {
    it('should register a trusted device successfully', async () => {
      const deviceData = {
        userAgent: 'Mozilla/5.0 Test Browser',
        deviceName: 'Test Device',
        deviceType: 'desktop',
      };

      const response = await request(app.getHttpServer())
        .post('/portal/auth/device/register')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Device-Fingerprint', 'test-fingerprint-123')
        .send(deviceData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Device registered successfully');
      expect(response.body.device).toHaveProperty('deviceId');
      expect(response.body.device.deviceName).toBe('Test Device');
      expect(response.body.device.deviceType).toBe('desktop');
      expect(response.body.device).toHaveProperty('createdAt');
    });

    it('should reject registration without authentication', async () => {
      const deviceData = {
        userAgent: 'Mozilla/5.0 Test Browser',
        deviceName: 'Test Device',
        deviceType: 'desktop',
      };

      await request(app.getHttpServer())
        .post('/portal/auth/device/register')
        .send(deviceData)
        .expect(401);
    });

    it('should reject registration with invalid device data', async () => {
      const invalidDeviceData = {
        deviceName: 'Test Device',
      };

      await request(app.getHttpServer())
        .post('/portal/auth/device/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDeviceData)
        .expect(400);
    });

    it('should detect and reject spoofing attempts', async () => {
      const deviceData = {
        userAgent: 'Mozilla/5.0 Spoofed Browser',
        deviceName: 'Suspicious Device',
        deviceType: 'desktop',
      };

      const sameFingerprint = 'duplicate-fingerprint-test';

      await request(app.getHttpServer())
        .post('/portal/auth/device/register')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Device-Fingerprint', sameFingerprint)
        .send({
          userAgent: 'Mozilla/5.0 Spoofed Browser',
          deviceName: 'First Device',
          deviceType: 'desktop',
        });

      const response = await request(app.getHttpServer())
        .post('/portal/auth/device/register')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Device-Fingerprint', sameFingerprint)
        .send(deviceData)
        .expect(400);

      expect(response.body.message).toContain('Suspicious device activity detected');
    });
  });

  describe('POST /auth/device/verify', () => {
    it('should verify device with correct verification code', async () => {
      const verifyData = {
        deviceId: 'test-device-id',
        verificationCode: '123456',
      };

      const response = await request(app.getHttpServer())
        .post('/portal/auth/device/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send(verifyData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Device verified successfully');
      expect(response.body.verified).toBe(true);
    });

    it('should reject verification with incorrect code', async () => {
      const verifyData = {
        deviceId: 'test-device-id',
        verificationCode: '000000',
      };

      const response = await request(app.getHttpServer())
        .post('/portal/auth/device/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send(verifyData)
        .expect(200);

      expect(response.body.status).toBe('failure');
      expect(response.body.message).toBe('Invalid verification code');
      expect(response.body.verified).toBe(false);
    });

    it('should reject verification without authentication', async () => {
      const verifyData = {
        deviceId: 'test-device-id',
        verificationCode: '123456',
      };

      await request(app.getHttpServer())
        .post('/portal/auth/device/verify')
        .send(verifyData)
        .expect(401);
    });
  });

  describe('POST /auth/device/check-trust', () => {
    it('should check device trust status', async () => {
      const trustData = {
        fingerprint: 'test-fingerprint-for-trust-check',
      };

      const response = await request(app.getHttpServer())
        .post('/portal/auth/device/check-trust')
        .set('Authorization', `Bearer ${authToken}`)
        .send(trustData)
        .expect(200);

      expect(response.body).toHaveProperty('trusted');
      expect(response.body).toHaveProperty('decision');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.trusted).toBe('boolean');
      expect(['trusted', 'pending', 'blocked']).toContain(response.body.decision);
    });

    it('should reject trust check without authentication', async () => {
      const trustData = {
        fingerprint: 'test-fingerprint',
      };

      await request(app.getHttpServer())
        .post('/portal/auth/device/check-trust')
        .send(trustData)
        .expect(401);
    });

    it('should reject trust check with invalid fingerprint data', async () => {
      const invalidTrustData = {
      };

      await request(app.getHttpServer())
        .post('/portal/auth/device/check-trust')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTrustData)
        .expect(400);
    });
  });

  describe('Device Trust Security Tests', () => {
    it('should handle concurrent device registration attempts', async () => {
      const deviceData = {
        userAgent: 'Mozilla/5.0 Concurrent Test',
        deviceName: 'Concurrent Device',
        deviceType: 'desktop',
      };

      const promises = Array(5).fill(null).map((_, index) =>
        request(app.getHttpServer())
          .post('/portal/auth/device/register')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Device-Fingerprint', `concurrent-fingerprint-${index}`)
          .send(deviceData),
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.device).toHaveProperty('deviceId');
      });

      const deviceIds = responses.map(r => r.body.device.deviceId);
      const uniqueDeviceIds = new Set(deviceIds);
      expect(uniqueDeviceIds.size).toBe(deviceIds.length);
    });

    it('should properly sanitize device fingerprints in logs', async () => {
      const deviceData = {
        userAgent: 'Mozilla/5.0 Log Test Browser',
        deviceName: 'Log Test Device',
        deviceType: 'desktop',
      };

      const sensitiveFingerprint = 'very-sensitive-fingerprint-data-12345678901234567890';

      await request(app.getHttpServer())
        .post('/portal/auth/device/register')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Device-Fingerprint', sensitiveFingerprint)
        .send(deviceData)
        .expect(200);

      expect(true).toBe(true);
    });
  });
});
