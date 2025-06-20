// src/portal/portal-backend/src/tests/middleware.test.ts

import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import globalErrorHandler from '../middleware/errorHandler';
import { securityConfig } from '../config/security';
import {
  createTestGlobalLimiter,
  createTestLoginLimiter,
  createTestRegisterLimiter,
} from '../middleware/rateLimitMiddleware';

describe('Security Middleware', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Apply security middleware as defined in index.ts for general tests
    app.use(cors(securityConfig.cors));
    app.use(helmet(securityConfig.helmet as any)); // Keep 'as any' for now due to environment's strict type issues
    app.use(hpp());

    // Basic routes for testing middleware
    app.get('/test-cors', (req, res) => res.status(200).send('CORS Test'));
    app.options('/test-cors', (req, res) => res.status(204).send());
    app.get('/', (req, res) => res.status(200).send('Hello'));
    app.post('/portal/register', (req, res) => res.status(200).send('Register OK'));
    app.post('/portal/login', (req, res) => res.status(200).send('Login OK'));
    app.get('/helmet-test', (req, res) => res.status(200).send('Helmet Test')); // Ensure this route is handled by the main app instance

    app.use(globalErrorHandler);
  });

  afterAll(() => {
    // Clean up
  });

  // --- Test: CORS ---
  it('should allow requests from configured origins and methods', async () => {
    const allowedOrigin = (securityConfig.cors.origin as string[])[0] || '*';
    const res = await request(app)
      .options('/test-cors')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toEqual(allowedOrigin);
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-headers']).toBeDefined();
  });

  it('should deny requests from unconfigured origins', async () => {
    const tempApp = express();
    tempApp.use(cors({
        origin: ['http://specific-allowed.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));
    tempApp.get('/test-cors', (req, res) => res.status(200).send('CORS Test'));
    tempApp.use(globalErrorHandler);

    const res = await request(tempApp)
      .get('/test-cors')
      .set('Origin', 'http://unauthorized.com')
      .expect(200);
    
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  // --- Test: Security Headers (Helmet) ---
  it('should include security headers from Helmet', async () => {
    const res = await request(app).get('/helmet-test'); // Use the specific test route to ensure Helmet is active on it

    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toEqual('nosniff');
    // MODIFIED: Expect DENY if CSP's frameAncestors works as intended, otherwise adjust to undefined or relevant value
    expect(res.headers['x-frame-options']).toEqual('DENY'); 
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-xss-protection']).toEqual('0');
    expect(res.headers['referrer-policy']).toEqual('no-referrer');
  });

  // --- Test: HPP (HTTP Parameter Pollution) ---
  it('should prevent HPP by using only the last parameter value', async () => {
    let appHPP = express();
    appHPP.use(express.json());
    appHPP.use(hpp());
    appHPP.post('/test-hpp', (req, res) => {
        const email = req.query.email || req.body.email;
        res.status(200).json({ email: email });
    });
    appHPP.use(globalErrorHandler);

    const res = await request(appHPP)
      .post('/test-hpp?email=first@example.com&email=last@example.com')
      .send({ password: 'Password123!' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.email).toEqual('last@example.com');
  });

  // --- Test: Multi-Layer Rate Limiting ---
  it('should enforce global rate limiting and return 429 after max requests', async () => {
    const testApp = express();
    testApp.use(express.json());
    const testLimiter = createTestGlobalLimiter(1);
    testApp.use(testLimiter);
    testApp.get('/limited-global', (req, res) => res.status(200).send('OK'));
    testApp.use(globalErrorHandler);

    await request(testApp).get('/limited-global').expect(200);
    const res = await request(testApp).get('/limited-global');

    expect(res.statusCode).toEqual(429);
    expect(res.body.message).toContain(securityConfig.rateLimit.global.message);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('should enforce stricter rate limiting for login endpoint and return 429', async () => {
    const testApp = express();
    testApp.use(express.json());
    const testLimiter = createTestLoginLimiter(1);
    testApp.post('/limited-login', testLimiter, (req, res) => res.status(200).send('Login OK'));
    testApp.use(globalErrorHandler);

    await request(testApp).post('/limited-login').send({ email: 'test@test.com', password: 'password' }).expect(200);
    const res = await request(testApp).post('/limited-login').send({ email: 'test@test.com', password: 'password' });

    expect(res.statusCode).toEqual(429);
    expect(res.body.message).toContain(securityConfig.rateLimit.login.message);
  }, (securityConfig.rateLimit.login.windowMs || 0) + 5000);

  it('should enforce stricter rate limiting for register endpoint and return 429', async () => {
    const testApp = express();
    testApp.use(express.json());
    const testLimiter = createTestRegisterLimiter(1);
    testApp.post('/limited-register', testLimiter, (req, res) => res.status(200).send('Register OK'));
    testApp.use(globalErrorHandler);

    await request(testApp).post('/limited-register').send({ email: 'test@test.com', password: 'password' }).expect(200);
    const res = await request(testApp).post('/limited-register').send({ email: 'test@test.com', password: 'password' });

    expect(res.statusCode).toEqual(429);
    expect(res.body.message).toContain(securityConfig.rateLimit.register.message);
  }, (securityConfig.rateLimit.register.windowMs || 0) + 5000);
});