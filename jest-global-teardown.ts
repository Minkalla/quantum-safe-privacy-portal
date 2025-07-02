// jest-global-teardown.ts
// This file manages the stopping of the in-memory MongoDB server and cleanup of mongoose connections.

import mongoose from 'mongoose';

async function globalTeardown() {
  console.log('\n--- Jest Global Teardown ---');
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Mongoose connections closed in teardown.');
    }

    // Stop the MongoMemoryServer instance that was started in global setup (if using local memory server).
    // Using 'any' cast as a workaround for TS7017 error.
    if ((global as any).__MONGO_MEM_SERVER__) {
      await (global as any).__MONGO_MEM_SERVER__.stop();
      console.log('MongoMemoryServer stopped in teardown.');
    } else {
      console.log('No MongoMemoryServer instance found (likely using Atlas connection).');
    }
  } catch (error) {
    console.error('Error during Jest global teardown:', error instanceof Error ? error.message : error);
    // Exit the process with a failure code if teardown fails
    process.exit(1);
  }
}

export default globalTeardown;
