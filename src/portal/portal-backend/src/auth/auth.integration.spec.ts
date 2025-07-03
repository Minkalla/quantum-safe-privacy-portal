/**
 * @file auth.integration.spec.ts
 * @description Integration tests for protected routes using Supertest.
 * Tests the complete authentication flow including middleware protection.
 *
 * @module AuthIntegrationSpec
 * @author Minkalla
 * @license MIT
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth.module';
import { UserModule } from '../user/user.module';
import { JwtModule } from '../jwt/jwt.module';
import { ConfigModule } from '@nestjs/config';
import { createTestModule } from '../test-utils/createTestModule';

describe('Auth Integration (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await createTestModule({
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
          })],
        }),
        MongooseModule.forRoot(process.env.MongoDB1 || 'mongodb://localhost:27017/test'),
        AuthModule,
        UserModule,
      ],
      configOverrides: {
        'SKIP_SECRETS_MANAGER': 'true',
        'AWS_REGION': 'us-east-1',
        'MongoDB1': process.env.MongoDB1 || 'mongodb://localhost:27017/test',
        'JWT_SECRET': 'test-jwt-secret',
        'JWT_ACCESS_SECRET': 'test-access-secret',
        'JWT_REFRESH_SECRET': 'test-refresh-secret',
      },
    });

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('portal');
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

  describe('Protected Routes', () => {
    it('should return 401 for /portal/user/profile without token', () => {
      return request(app.getHttpServer())
        .get('/portal/user/profile')
        .expect(401)
        .expect((res) => {
          expect(res.body).toMatchObject({
            statusCode: 401,
            message: 'Authorization header is missing',
            error: 'Unauthorized',
          });
        });
    });

    it('should return 401 for invalid token format', () => {
      return request(app.getHttpServer())
        .get('/portal/user/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401)
        .expect((res) => {
          expect(res.body).toMatchObject({
            statusCode: 401,
            message: 'Invalid authorization header format',
            error: 'Unauthorized',
          });
        });
    });

    it('should return 401 for malformed JWT token', () => {
      return request(app.getHttpServer())
        .get('/portal/user/profile')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401)
        .expect((res) => {
          expect(res.body).toMatchObject({
            statusCode: 401,
            message: 'Invalid or expired JWT token',
            error: 'Unauthorized',
          });
        });
    });

    it('should allow access with valid JWT token', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/portal/auth/register')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
        });

      if (registerResponse.status === 201) {
        authToken = registerResponse.body.accessToken;
      } else {
        const loginResponse = await request(app.getHttpServer())
          .post('/portal/auth/login')
          .send({
            email: 'test@example.com',
            password: 'TestPassword123!',
          });

        authToken = loginResponse.body.accessToken;
      }

      return request(app.getHttpServer())
        .get('/portal/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            status: 'success',
            message: 'User profile retrieved successfully',
          });
          expect(res.body.data).toBeDefined();
        });
    });
  });

  describe('Token Refresh Integration', () => {
    it('should refresh token with valid refresh token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/portal/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

      const setCookieHeader = loginResponse.headers['set-cookie'];
      const refreshTokenCookie = Array.isArray(setCookieHeader)
        ? setCookieHeader.find((cookie: string) => cookie.startsWith('refreshToken='))
        : setCookieHeader;

      expect(refreshTokenCookie).toBeDefined();

      const refreshToken = refreshTokenCookie?.split('=')[1]?.split(';')[0];

      return request(app.getHttpServer())
        .post('/portal/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            status: 'success',
            message: 'Token refreshed successfully',
          });
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user).toBeDefined();
        });
    });

    it('should return 401 for missing refresh token', () => {
      return request(app.getHttpServer())
        .post('/portal/auth/refresh')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Refresh token not provided');
        });
    });

    it('should return 401 for invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/portal/auth/refresh')
        .set('Cookie', 'refreshToken=invalid.token.here')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid or expired refresh token');
        });
    });
  });
});
