// src/portal/portal-backend/src/config/security.ts
/**
 * @file security.ts
 * @description Centralized security configurations for CORS, Helmet, and Multi-Layer Rate Limiting.
 * This configuration enables dynamic security policy updates without code deployment.
 *
 * @module SecurityConfig
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Aligns with "no regrets" quality by implementing proactive security controls.
 * Supports compliance requirements like NIST SP 800-53 (AC-7, SC-5) and PCI DSS (8.1.5).
 * Designed for future integration with Redis for distributed environments.
 */

const IS_TEST_ENV = process.env['NODE_ENV'] === 'test' || process.env['IS_TESTING'] === 'true'; // Check for test environment

export const securityConfig = {
  cors: {
    origin: IS_TEST_ENV
      ? '*' // Explicitly allow all origins in test environment for all tests
      : (process.env['NODE_ENV'] === 'production'
        ? ['https://frontend.minkalla.com', 'https://app.minkalla.com'] 
        : ['*']), 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
  },
  rateLimit: {
    global: {
      windowMs: 15 * 60 * 1000, 
      max: 100, 
      message: 'Too many requests from this IP, please try again after 15 minutes',
      statusCode: 429,
      headers: true,
      // store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }), // For Redis in production
    },
    login: { 
      windowMs: 15 * 60 * 1000, 
      max: 5, 
      message: 'Too many login attempts, please try again after 15 minutes',
      statusCode: 429,
      headers: true,
    },
    register: { 
      windowMs: 15 * 60 * 1000, 
      max: 10, 
      message: 'Too many registration attempts, please try again after 15 minutes',
      statusCode: 429,
      headers: true,
    }
  },
  helmet: { 
    // MODIFIED: Removed contentSecurityPolicy entirely for this specific issue.
    // If you need specific CSP directives, they would be added back here *without* frameAncestors,
    // and X-Frame-Options would *still* be handled separately by frameguard below.
    hsts: { 
      maxAge: 63072000, 
      includeSubDomains: true, 
      preload: true, 
    },
    // RE-RE-RE-INTRODUCED: Explicitly setting frameguard as an object for action 'deny'.
    // This is the structure Helmet's frameguard middleware itself expects, and we will
    // use 'as any' on the helmet() call in index.ts and middleware.test.ts.
    frameguard: { action: 'deny' }, 
  },
};