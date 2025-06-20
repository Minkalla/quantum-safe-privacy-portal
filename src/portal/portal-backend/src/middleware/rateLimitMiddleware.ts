// src/portal/portal-backend/src/middleware/rateLimitMiddleware.ts
/**
 * @file rateLimitMiddleware.ts
 * @description Centralized rate limiting middleware for the Quantum-Safe Privacy Portal Backend.
 * Uses express-rate-limit to protect against brute-force, DoS, and resource abuse.
 * Configured via securityConfig for global, login, and registration endpoints.
 * MODIFIED: Provides factory functions for precise control in tests and production.
 *
 * @module RateLimitMiddleware
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Aligns with "no regrets" quality by implementing proactive security controls.
 * Supports compliance requirements like NIST SP 800-53 (AC-7, SC-5) and PCI DSS (8.1.5).
 * Designed for future integration with Redis for distributed environments.
 *
 * @see {@link https://www.npmjs.com/package/express-rate-limit|express-rate-limit}
 * @see {@link ../config/security.ts|securityConfig}
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express'; // Import Request and Response types
import { securityConfig } from '../config/security';

// If using Redis for rate limit store (for production deployment with multiple instances):
// import RedisStore from 'rate-limit-redis';
// import { createClient } from 'redis';
// const redisClient = createClient({ url: process.env['REDIS_URL'] });
// redisClient.connect().catch(console.error); 

// Helper function to create a limiter instance
// MODIFIED: Accepts config and an optional maxOverride. Default store is memory-based.
const createLimiterInstance = (config: any, maxOverride?: number) => {
    return rateLimit({
        windowMs: config.windowMs,
        max: maxOverride !== undefined ? maxOverride : config.max, // Use override if provided, otherwise config's max
        statusCode: config.statusCode,
        headers: config.headers,
        // Explicitly type req and res parameters
        message: (_req: Request, res: Response) => { // Added types for _req and res
            res.setHeader('Content-Type', 'application/json');
            return JSON.stringify({
                statusCode: config.statusCode,
                message: config.message
            });
        },
        // store: redisClient ? new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }) : undefined,
    });
};

/**
 * @constant globalApiLimiter
 * @description Returns the global API rate limiter instance for production use.
 */
export const globalApiLimiter = createLimiterInstance(securityConfig.rateLimit.global);

/**
 * @constant loginApiLimiter
 * @description Returns the login API rate limiter instance for production use.
 */
export const loginApiLimiter = createLimiterInstance(securityConfig.rateLimit.login);

/**
 * @constant registerApiLimiter
 * @description Returns the registration API rate limiter instance for production use.
 */
export const registerApiLimiter = createLimiterInstance(securityConfig.rateLimit.register);

// MODIFIED: Export test-specific factory functions to allow explicit max override for tests
// These are functions that return new limiter instances specifically for use in tests
export const createTestGlobalLimiter = (max: number) => createLimiterInstance(securityConfig.rateLimit.global, max);
export const createTestLoginLimiter = (max: number) => createLimiterInstance(securityConfig.rateLimit.login, max);
export const createTestRegisterLimiter = (max: number) => createLimiterInstance(securityConfig.rateLimit.register, max);