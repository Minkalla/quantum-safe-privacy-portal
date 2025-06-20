/**
 * @file index.ts
 * @description The primary entry point for the Quantum-Safe Privacy Portal Backend.
 * This file initializes the Express application, sets up global middleware,
 * and defines the main routes for the portal's API.
 * It exports the Express `app` instance, allowing it to be easily imported for testing
 * or for server startup logic in a separate file (e.g., server.ts).
 *
 * @module PortalBackend
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This backend is designed with a "no regrets" approach, prioritizing quantum-safe security,
 * regulatory compliance (GDPR, CCPA, HIPAA, etc.), and ethical data practices.
 * Future development will integrate QynAuth for PQC authentication, ZynConsent for granular
 * consent management, and Valyze for data value insights and rights fulfillment.
 *
 * @see {@link https://github.com/Minkalla/quantum-safe-privacy-portal|Minkalla GitHub Repo}
 */

import 'express-async-errors'; 

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser'; 
import cors from 'cors'; 
import helmet from 'helmet'; 
import hpp from 'hpp'; 
import { securityConfig } from './config/security'; 
// MODIFIED: Import specific limiter instances (not factories anymore)
import { globalApiLimiter, loginApiLimiter, registerApiLimiter } from './middleware/rateLimitMiddleware'; 
import { register, login } from './controllers/authController'; 
import globalErrorHandler from './middleware/errorHandler'; 

const app = express();

// Middleware (These lines define the app's structure and should always be executed)
app.use(express.json());

app.use(cookieParser());

app.use(helmet(securityConfig.helmet));

app.use(hpp());

app.use(cors(securityConfig.cors));

// --- Rate Limiting ---
// MODIFIED: Always apply production global rate limit. Tests will mock/override as needed.
app.use('/portal/', globalApiLimiter); 

// Routes (These lines define the app's structure and should always be executed)
app.get('/', (_req: Request, res: Response): void => {
  res.send('Hello from Quantum-Safe Privacy Portal Backend!');
});

// MODIFIED: Always apply production specific rate limiters to routes. Tests will mock/override.
app.post('/portal/register', registerApiLimiter, register);
app.post('/portal/login', loginApiLimiter, login);

// Global Error Handling Middleware (must be after all routes, also always executed)
app.use(globalErrorHandler);

// This line is crucial: it exports the configured Express app instance
export default app;