/**
 * @file index.ts
 * @description The primary entry point for the Quantum-Safe Privacy Portal Backend.
 * This file initializes the Express application, sets up global middleware,
 * and defines the main routes for the portal's API. It serves as the
 * foundational server for managing user data rights, consent, and authentication.
 *
 * @module PortalBackend
 * @author Minkalla
 * @version 1.0.0
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

// Ensure environment variables are loaded from .env file FIRST.
// This must be the very first import to ensure process.env is populated before other modules use it.
import 'dotenv/config';

import express, { Request, Response } from 'express'; // Explicitly import Request and Response types

// Initialize the Express application
const app = express();

/**
 * @constant {number} port - The port number for the server to listen on.
 * Fetched from environment variables (process.env.PORT) or defaults to 3000.
 * @remarks Using bracket notation for process.env property access to satisfy TypeScript strictness (TS4111),
 * and parseInt to ensure it's treated as a number.
 */
const port: number = parseInt(process.env['PORT'] || '3000', 10); // Explicitly cast to number and strict access

// Define a basic root route for health checks or initial access
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

// Start the server and listen for incoming requests
/**
 * @method listen
 * @description Starts the Express server on the configured port.
 * @param {number} port - The port number to listen on.
 * @param {Function} callback - A callback function executed once the server starts successfully.
 * @returns {Server} The HTTP server instance.
 */
app.listen(port, (): void => {
  console.log(`Portal Backend listening at http://localhost:${port}`);
});