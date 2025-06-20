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
const isTestEnv = process.env['NODE_ENV'] === 'test' || process.env['IS_TESTING'] === 'true';
const enableSwaggerDocs = process.env['ENABLE_SWAGGER_DOCS'] === 'true';

if (isTestEnv || enableSwaggerDocs) {
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