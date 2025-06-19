// jest-global-teardown.ts
// This file manages the teardown of the test environment after all Jest test suites have run.

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server'; // Consistent import for type reference

// Declare global properties for TypeScript.
// NOTE: The 'declare global' block is removed from here and setup,
// and 'any' casts are used as a workaround for persistent TS7017 errors in Jest's global hooks.

async function globalTeardown() {
  console.log('\n--- Jest Global Teardown ---');
  try {
    // Disconnect Mongoose from the database
    await mongoose.disconnect();
    console.log('MongoDB connection closed in teardown.');

    // Stop the MongoMemoryServer instance that was started in global setup.
    // Using 'any' cast as a workaround for TS7017 error.
    if ((global as any).__MONGO_MEM_SERVER__) {
      await (global as any).__MONGO_MEM_SERVER__.stop();
      console.log('MongoMemoryServer stopped in teardown.');
    }
  } catch (error) {
    console.error('Error during Jest global teardown:', error instanceof Error ? error.message : error);
    // Exit the process with a failure code if teardown fails
    process.exit(1);
  }
}

export default globalTeardown;