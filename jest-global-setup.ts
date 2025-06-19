// jest-global-setup.ts
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './src/portal/portal-backend/src/server';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from './src/portal/portal-backend/src/models/User'; // Import your User model for cleanup

dotenv.config({ path: './src/portal/portal-backend/.env.test' }); // Load test environment variables

// Global variable to hold the MongoMemoryServer instance
let mongoServerInstance: MongoMemoryServer;

async function globalSetup() {
  console.log('\n--- Jest Global Setup ---');

  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.IS_TESTING = 'true'; // Ensure our server.ts guard is active

  try {
    // Create an in-memory MongoDB server instance
    mongoServerInstance = await MongoMemoryServer.create();
    const mongoUri = mongoServerInstance.getUri();

    // Store the URI globally so tests can access it
    // This is crucial for mongoose.connect in your test files if not using the exported connectDB
    process.env.MONGO_TEST_URI = mongoUri;

    // Connect mongoose to the in-memory server
    // Using mongoose.connect directly here rather than exported connectDB
    // to control the connection lifecycle precisely for global setup.
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log(`MongoDB Memory Server started at: ${mongoUri}`);

    // Clear any existing data from the database before tests run
    // Ensure you add all models you want to clear here
    if (mongoose.connection.readyState === 1) { // Check if connected
      await User.deleteMany({});
      console.log('Cleared existing User data in test database.');
    } else {
      console.warn('Mongoose not connected during global setup cleanup, skipping data clear.');
    }

    // Store mongoServerInstance on the global object for teardown
    global.__MONGO_MEM_SERVER__ = mongoServerInstance;

  } catch (error) {
    console.error('Error during Jest global setup:', error);
    process.exit(1);
  }
}

export default globalSetup;