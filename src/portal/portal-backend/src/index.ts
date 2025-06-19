import mongoose from 'mongoose';
import Logger from './utils/logger';

// Ensure environment variables are loaded from .env file FIRST.
// This must be the very first import to ensure process.env is populated before other modules use it.
import 'dotenv/config';

import express, { Request, Response } from 'express';

// Initialize the Express application
const app = express();

/**
 * @constant {number} port - The port number for the server to listen on.
 * Fetched from environment variables (process.env.PORT) or defaults to 3000.
 * @remarks Using bracket notation for process.env property access to satisfy TypeScript strictness (TS4111),
 * and parseInt to ensure it's treated as a number.
 */
const port: number = parseInt(process.env['PORT'] || '3000', 10); // Explicitly cast to number and strict access

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
      throw new Error('MONGODB_URI is not defined in .env');
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
  Logger.info(`Portal Backend listening at http://localhost:${port}`); // Use the logger instead of console.log
});