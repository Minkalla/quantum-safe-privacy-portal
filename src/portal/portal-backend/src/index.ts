// src/portal/portal-backend/src/index.ts
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
 * consent management, and Valyze for data value insights and fulfillment.
 *
 * @see {@link https://github.com/Minkalla/quantum-safe-privacy-portal|Minkalla GitHub Repo}
 */

import 'express-async-errors';

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// --- Environment Variable Validation (CRITICAL for startup robustness) ---
// As Lead Engineer & Architect, this proactive validation ensures essential configurations
// are present from the outset, preventing obscure runtime errors and adhering to the "no regrets" approach.
// @ts-ignore: envalid does not have published @types/envalid, so we ignore TypeScript complaints for this import.
import { cleanEnv, str, bool, num, url } from 'envalid';

const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    devDefault: 'development',
    desc: 'The environment the application is running in (development, production, test).'
  }),
  PORT: num({
    default: 8080,
    desc: 'The port number on which the Express server will listen.'
  }),
  MONGO_URI: str({
    desc: 'The connection string for your MongoDB database.'
  }),
  JWT_ACCESS_SECRET: str({
    desc: 'Critical: Secret key for signing JWT Access Tokens. MUST be strong and securely managed.'
  }),
  JWT_REFRESH_SECRET: str({
    desc: 'Critical: Secret key for signing JWT Refresh Tokens. MUST be strong and securely managed.'
  }),
  ENABLE_SWAGGER_DOCS: bool({
    default: false,
    desc: 'Controls whether the Swagger UI documentation is served (true/false). Critical for production security.'
  }),
  FRONTEND_URL: url({
    default: 'http://localhost:3000',
    desc: 'The URL of the frontend application. Used for CORS configuration.'
  })
});

// --- End Environment Variable Validation ---

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import { securityConfig } from './config/security';
import { globalApiLimiter, loginApiLimiter, registerApiLimiter } from './middleware/rateLimitMiddleware';
import { register, login } from './controllers/authController';
import globalErrorHandler from './middleware/errorHandler';
import docsRouter from './routes/docsRouter';

const app = express();

// Middleware (These lines define the app's structure and should always be executed)
app.use(express.json());

app.use(cookieParser());

// Define a placeholder route for Helmet's X-Frame-Options test to hit
app.get('/helmet-test', (_req: Request, res: Response) => {
  res.send('Helmet Test');
});

// MODIFIED: Cast securityConfig.helmet to 'any' to bypass persistent TypeScript type error
app.use(helmet(securityConfig.helmet as any));

app.use(hpp());

app.use(cors(securityConfig.cors));

// --- Rate Limiting ---
app.use('/portal/', globalApiLimiter);

// Conditional API documentation exposure:
// Using 'env.ENABLE_SWAGGER_DOCS' directly from envalid validation
if (env.ENABLE_SWAGGER_DOCS || env.NODE_ENV === 'test') { // Added test environment check explicitly here as well
  app.use('/api-docs', docsRouter);
  console.log('API documentation available at /api-docs');
}

// Routes (These lines define the app's structure and should always be executed)
app.get('/', (_req: Request, res: Response): void => {
  res.send('Hello from Quantum-Safe Privacy Portal Backend!');
});

app.post('/portal/register', registerApiLimiter, register);
app.post('/portal/login', loginApiLimiter, login);

// Global Error Handling Middleware (must be after all routes, also always executed)
app.use(globalErrorHandler);

export default app;