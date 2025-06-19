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

    if (process.env.NODE_ENV === 'test' || process.env.IS_TESTING === 'true') {
      // For testing, use MongoMemoryServer
      mongoServer = await MongoMemoryServer.create();
      dbUri = mongoServer.getUri();
      Logger.info(`Connected to in-memory MongoDB at: ${dbUri}`);
    } else {
      // For development/production, use MONGO_URI from environment variables
      dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/minkalla';
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

    if (mongoServer) {
      await mongoServer.stop();
      Logger.info('MongoMemoryServer stopped.');
    }
  } catch (error) {
    Logger.error(`Error disconnecting MongoDB: ${error instanceof Error ? error.message : error}`);
  }
};

/**
 * Starts the Express server.
 */
export const startServer = (): void => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    Logger.info(`Server running on port ${PORT}`);
  });
};

// Only start the server and connect to DB if not in a testing environment
if (process.env.NODE_ENV !== 'test' && process.env.IS_TESTING !== 'true') {
  connectDB();
  startServer();
}