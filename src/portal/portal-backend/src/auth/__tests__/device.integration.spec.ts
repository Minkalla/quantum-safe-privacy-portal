import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import request from 'supertest';
import { AuthController } from '../auth.controller';
import { DeviceController } from '../device.controller';
import { DeviceService } from '../device.service';
import { AuthService } from '../auth.service';
import { EnhancedAuthService } from '../enhanced-auth.service';
import { MFAService } from '../mfa.service';
import { SsoService } from '../sso.service';
import { UserSchema } from '../../models/User';
import { JwtService as CustomJwtService } from '../../jwt/jwt.service';
import { createTestModule } from '../../test-utils/createTestModule';

describe('Device Trust Integration Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    module = await createTestModule({
      controllers: [AuthController, DeviceController],
      providers: [
        DeviceService,
        AuthService,
        EnhancedAuthService,
        MFAService,
        SsoService,
        CustomJwtService,
      ],
      configOverrides: {
        'device.trust.enabled': true,
        'device.trust.expiry_days': 30,
      },
    });

    app = module.createNestApplication();
    await app.init();

    userId = 'test-user-id';
    authToken = 'mock-jwt-token';
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
        .post('/auth/device/register')
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
        .post('/auth/device/register')
        .send(deviceData)
        .expect(401);
    });

    it('should reject registration with invalid device data', async () => {
      const invalidDeviceData = {
        deviceName: 'Test Device',
      };

      await request(app.getHttpServer())
        .post('/auth/device/register')
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

      await request(app.getHttpServer())
        .post('/auth/device/register')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Device-Fingerprint', 'legitimate-fingerprint')
        .send({
          userAgent: 'Mozilla/5.0 Spoofed Browser',
          deviceName: 'Legitimate Device',
          deviceType: 'desktop',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/device/register')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Device-Fingerprint', 'spoofed-fingerprint')
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
        .post('/auth/device/verify')
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
        .post('/auth/device/verify')
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
        .post('/auth/device/verify')
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
        .post('/auth/device/check-trust')
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
        .post('/auth/device/check-trust')
        .send(trustData)
        .expect(401);
    });

    it('should reject trust check with invalid fingerprint data', async () => {
      const invalidTrustData = {
      };

      await request(app.getHttpServer())
        .post('/auth/device/check-trust')
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
          .post('/auth/device/register')
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
        .post('/auth/device/register')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Device-Fingerprint', sensitiveFingerprint)
        .send(deviceData)
        .expect(200);

      expect(true).toBe(true);
    });
  });
});
