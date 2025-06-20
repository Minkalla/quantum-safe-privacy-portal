// src/portal/portal-backend/src/server.ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from './index'; // Import the Express app instance
import Logger from './utils/logger'; // Assuming you have a logger utility

// Global variable to hold the MongoMemoryServer instance
let mongoServer: MongoMemoryServer;

/**
 * Connects to the database.
 * Uses MongoMemoryServer for testing environments or a local/Atlas connection otherwise.
 */
export const connectDB = async (): Promise<void> => {
  try {
    let dbUri: string;
    let dbOptions: mongoose.ConnectOptions = {};

    // IMPORTANT: MongoMemoryServer should only be created here if this server.ts is the main entry point
    // for a test run *that doesn't use Jest's global setup*.
    // For Jest tests using global setup, MONGO_TEST_URI will be set globally.
    if (process.env['NODE_ENV'] === 'test' && !process.env['MONGO_TEST_URI']) { // MODIFIED: Bracket notation
      // This path is for non-Jest-global-setup based tests that might directly run this server for testing
      mongoServer = await MongoMemoryServer.create();
      dbUri = mongoServer.getUri();
      Logger.info(`Connected to in-memory MongoDB (server.ts initiated) at: ${dbUri}`);
    } else {
      // For development/production, use MONGO_URI from environment variables
      // or if MONGO_TEST_URI is provided by Jest's global setup for the main app.
      dbUri = process.env['MONGO_TEST_URI'] || process.env['MONGO_URI'] || 'mongodb://localhost:27017/minkalla'; // MODIFIED: Bracket notation
      Logger.info(`Attempting to connect to MongoDB at: ${dbUri}`);
    }

    await mongoose.connect(dbUri, dbOptions);
    Logger.info('MongoDB connected successfully');
  } catch (error) {
    Logger.error(`MongoDB connection error: ${error instanceof Error ? error.message : error}`);
    process.exit(1); // Exit process with failure
  }
};

/**
 * Disconnects from the database.
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    Logger.info('MongoDB disconnected.');

    // Only stop mongoServer if it was created by this connectDB function
    if (mongoServer) {
      await mongoServer.stop();
      Logger.info('MongoMemoryServer stopped by server.ts.');
    }
  } catch (error) {
    Logger.error(`Error disconnecting MongoDB: ${error instanceof Error ? error.message : error}`);
  }
};

/**
 * Starts the Express server.
 */
export const startServer = (): void => {
  const PORT = process.env['PORT'] || 3000; // MODIFIED: Bracket notation
  app.listen(PORT, () => {
    Logger.info(`Server running on port ${PORT}`);
  });
};

// MODIFIED: Ensure connectDB and startServer are ONLY called when server.ts is run directly
// This prevents them from running when server.ts is merely imported (e.g., during tests)
if (require.main === module) { // This condition is true only when the file is executed directly
  connectDB();
  startServer();
}