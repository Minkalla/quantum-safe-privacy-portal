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

// Explicitly load environment variables from the .env file.
// This ensures that process.env is populated before other modules use it.
// We specify the path to the .env file relative to the compiled JavaScript file's location.
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Logger from './utils/logger'; // Import our centralized logger
import { register } from './controllers/authController'; // <-- NEW: Import the register function

// Initialize the Express application
const app = express();

/**
 * @constant {number} port - The port number for the server to listen on.
 * Fetched from environment variables (process.env.PORT) or defaults to 3000.
 * @remarks Using bracket notation for process.env property access to satisfy TypeScript strictness (TS4111),
 * and parseInt to ensure it's treated as a number.
 */
const port: number = parseInt(process.env['PORT'] || '3000', 10); // Explicitly cast to number and strict access

// Middleware
/**
 * @middleware express.json()
 * @description Parses incoming requests with JSON payloads.
 * This middleware is required to correctly parse request bodies for POST/PUT requests (e.g., user registration data).
 */
app.use(express.json()); // <-- NEW: Add middleware to parse JSON request bodies

// MongoDB Connection
/**
 * @function connectDB
 * @description Connects to the MongoDB database using the connection string from environment variables.
 * Handles successful connection and connection errors with logging.
 * @returns {Promise<void>} A promise that resolves when the connection is established or rejects on error.
 */
const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env['MONGODB_URI'];
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env after explicit load attempt.');
    }
    await mongoose.connect(uri);
    Logger.info('Connected to MongoDB');
  } catch (error) {
    Logger.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process if the database connection fails
  }
};

// Call the connectDB function to establish the connection
connectDB();

// Routes
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
app.post('/portal/register', register); // <-- NEW: Define the registration route

// Start the server and listen for incoming requests
/**
 * @method listen
 * @description Starts the Express server on the configured port.
 * @param {number} port - The port number to listen on.
 * @param {Function} callback - A callback function executed once the server starts successfully.
 * @returns {Server} The HTTP server instance.
 */
app.listen(port, (): void => {
  Logger.info(`Portal Backend listening at http://localhost:${port}`);
});