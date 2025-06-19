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

// Explicitly load environment variables from the .env file.
// This ensures that process.env is populated before other modules use it.
// We specify the path to the .env file relative to the compiled JavaScript file's location.
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import express, { Request, Response } from 'express';
// REMOVED: import mongoose from 'mongoose'; // No longer used directly in index.ts
// REMOVED: import Logger from './utils/logger'; // No longer used directly in index.ts
import { register } from './controllers/authController';
import { globalErrorHandler } from './middleware/errorHandler';

// Initialize the Express application
const app = express();

// Middleware (These lines define the app's structure and should always be executed)
/**
 * @middleware express.json()
 * @description Parses incoming requests with JSON payloads.
 * This middleware is required to correctly parse request bodies for POST/PUT requests (e.g., user registration data).
 */
app.use(express.json());

// Routes (These lines define the app's structure and should always be executed)
/**
 * @route GET /
 * @description Provides a simple "Hello World" message to verify the backend is running.
 * @param {Request} _req - The Express request object. Underscore indicates it's intentionally unused to satisfy TS6133.
 * @param {Response} res - The Express response object.
 * @returns {void} Sends a string response.
 */
app.get('/', (_req: Request, res: Response): void => {
  res.send('Hello from Quantum-Safe Privacy Portal Backend!');
});

/**
 * @route POST /portal/register
 * @description API endpoint for user registration.
 * Delegates the registration logic to the authController.register function.
 * @param {Request} req - The Express request object containing user email and password in the body.
 * @param {Response} res - The Express response object.
 * @returns {void} Handled by authController.register.
 */
app.post('/portal/register', register);

// Global Error Handling Middleware (must be after all routes, also always executed)
/**
 * @middleware globalErrorHandler
 * @description This is the last middleware in the chain, designed to catch all errors
 * (both operational and programming errors) and send a standardized error response.
 * It ensures consistent error formatting and prevents sensitive details from leaking.
 */
app.use(globalErrorHandler);

// This line is crucial: it exports the configured Express app instance
export default app;