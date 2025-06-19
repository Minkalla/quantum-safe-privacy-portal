/**
 * @file server.ts
 * @description This file is responsible for starting the Quantum-Safe Privacy Portal Backend server.
 * It connects to the MongoDB database and begins listening for incoming HTTP requests.
 * This separation allows the main 'app' object in index.ts to be easily imported for testing
 * without automatically starting the server or connecting to the live database.
 *
 * @module ServerStartup
 * @author Minkalla
 * @license MIT
 */

import app from './index'; // Import the configured Express app
import mongoose from 'mongoose'; // Import mongoose for database connection
import Logger from './utils/logger'; // Import the logger

/**
 * @constant {number} port - The port number for the server to listen on.
 * Fetched from environment variables (process.env.PORT) or defaults to 3000.
 */
const port: number = parseInt(process.env['PORT'] || '3000', 10);

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
    Logger.info('Connected to MongoDB (Atlas)');
  } catch (error) {
    Logger.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process if the database connection fails
  }
};

// Start the server only if this file is executed directly (i.e., `node dist/server.js`)
if (require.main === module) {
  connectDB(); // Connect to the database
  app.listen(port, () => {
    // Start listening for requests
    Logger.info(`Portal Backend listening at http://localhost:${port}`);
  });
}