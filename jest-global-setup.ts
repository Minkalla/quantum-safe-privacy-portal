// jest-global-setup.ts
// This file manages the setup of the test environment before all Jest test suites run.

import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from './src/portal/portal-backend/src/models/User'; // Corrected default import

// Load test environment variables from the specific .env.test file
dotenv.config({ path: './src/portal/portal-backend/.env.test' });

// Global variable to hold the MongoMemoryServer instance.
// Using 'any' cast as a workaround for stubborn TS7017 error in Jest's global hooks context.
let mongoServerInstance: MongoMemoryServer;

async function globalSetup() {
  console.log('\n--- Jest Global Setup ---');

  // Set environment variables for testing. Using bracket notation for TypeScript strictness.
  process.env['NODE_ENV'] = 'test';
  process.env['IS_TESTING'] = 'true'; // Ensures our server.ts guard is active during tests

  try {
    // Create an in-memory MongoDB server instance for testing
    mongoServerInstance = await MongoMemoryServer.create(); // Await the creation process
    const mongoUri = await mongoServerInstance.getUri(); // Await getting the URI, as it's asynchronous

    // Store the MongoDB URI globally so individual test files can access it
    process.env['MONGO_TEST_URI'] = mongoUri;

    // Connect Mongoose to the in-memory MongoDB server
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log(`MongoDB Memory Server started at: ${mongoUri}`);

    // Clear any existing user data from the database before tests run to ensure clean state
    if (mongoose.connection.readyState === 1) { // Check if Mongoose is successfully connected
      await User.deleteMany({}); // Delete all documents from the User collection
      console.log('Cleared existing User data in test database.');
    } else {
      console.warn('Mongoose not connected during global setup cleanup, skipping data clear.');
    }

    // Store the MongoMemoryServer instance on the global object for access in the teardown script.
    // Using 'any' cast as a workaround for TS7017 error.
    (global as any).__MONGO_MEM_SERVER__ = mongoServerInstance;

  } catch (error) {
    console.error('Error during Jest global setup:', error instanceof Error ? error.message : error);
    // Exit the process with a failure code if setup fails, to prevent tests from running
    process.exit(1);
  }
}

export default globalSetup;