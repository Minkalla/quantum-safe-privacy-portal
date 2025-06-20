// src/portal/portal-backend/src/config/security.ts
// Centralized security configurations for CORS, Helmet, and Multi-Layer Rate Limiting.
// This configuration enables dynamic security policy updates without code deployment.

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
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted-script-source.com"], 
        styleSrc: ["'self'", "'unsafe-inline'", "https://trusted-style-source.com"], 
        imgSrc: ["'self'", "data:", "https://trusted-image-source.com"], 
        connectSrc: ["'self'", "https://trusted-api.minkalla.com", "ws://localhost:3000"], 
        frameAncestors: ["'none'"], // Still good to have for general CSP compliance
      },
    },
    hsts: { 
      maxAge: 63072000, 
      includeSubDomains: true, 
      preload: true, 
    },
    // Explicitly set frameguard action to DENY to ensure the header is present and correct.
    // This overrides any potential default or interaction with CSP's frameAncestors.
    frameguard: { action: 'deny' }, 
  },
};