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
import { register, login } from './controllers/authController'; 
import globalErrorHandler from './middleware/errorHandler'; // MODIFIED: Import as default

const app = express();

app.use(express.json());

app.use(cookieParser());

app.get('/', (_req: Request, res: Response): void => {
  res.send('Hello from Quantum-Safe Privacy Portal Backend!');
});

app.post('/portal/register', register);

app.post('/portal/login', login);

app.use(globalErrorHandler);

export default app;