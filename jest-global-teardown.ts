// jest-global-teardown.ts
// This file manages the stopping of the in-memory MongoDB server only.
// Mongoose connection and disconnection are handled per test suite in auth.test.ts.

// @ts-ignore: TS6133 - MongoMemoryServer is used via global.__MONGO_MEM_SERVER__
import { MongoMemoryServer } from 'mongodb-memory-server'; 
// Removed mongoose import and related logic.

// Using 'any' cast as a workaround for stubborn TS7017 error in Jest's global hooks context.
// NOTE: The 'declare global' block is not needed here as we are using 'any' cast.

async function globalTeardown() {
  console.log('\n--- Jest Global Teardown ---');
  try {
    // Stop the MongoMemoryServer instance that was started in global setup.
    // Using 'any' cast as a workaround for TS7017 error.
    if ((global as any).__MONGO_MEM_SERVER__) {
      await (global as any).__MONGO_MEM_SERVER__.stop();
      console.log('MongoMemoryServer stopped in teardown.');
    } else {
      console.warn('MongoMemoryServer instance not found in global teardown.');
    }
  } catch (error) {
    console.error('Error during Jest global teardown:', error instanceof Error ? error.message : error);
    // Exit the process with a failure code if teardown fails
    process.exit(1);
  }
}

export default globalTeardown;