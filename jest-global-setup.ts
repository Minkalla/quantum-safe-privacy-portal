// jest-global-setup.ts
// This file manages the starting of the in-memory MongoDB server only.
// The URI is then exposed to the test environment via a global variable.
// Mongoose connection itself is handled per test suite in auth.test.ts.

async function globalSetup() {
  console.log('\n--- Jest Global Setup ---');
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (mongoUri) {
      process.env['MONGO_TEST_URI'] = mongoUri;
      console.log(`Using MongoDB Atlas connection for tests`);
    } else {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      
      // Check if a MongoMemoryServer is already running to prevent conflicts
      if (global.__MONGO_MEM_SERVER__) {
        console.warn('MongoMemoryServer instance already found during global setup. Stopping existing one.');
        await global.__MONGO_MEM_SERVER__.stop();
        global.__MONGO_MEM_SERVER__ = undefined;
      }

      // Create a new MongoMemoryServer instance
      const mongoServer = await MongoMemoryServer.create();
      global.__MONGO_MEM_SERVER__ = mongoServer; // Store instance globally for teardown

      // Get the URI and set it as an environment variable for tests to use
      const localMongoUri = mongoServer.getUri();
      process.env['MONGO_TEST_URI'] = localMongoUri; // Set for process.env access in tests

      console.log(`MongoMemoryServer started at: ${localMongoUri}`);
    }

    console.log(`MONGO_TEST_URI set in environment.`);

  } catch (error) {
    console.error('Error during Jest global setup:', error instanceof Error ? error.message : error);
    // Exit the process with a failure code if setup fails
    process.exit(1);
  }
}

// Declare a global variable to hold the MongoMemoryServer instance.
// Using 'any' cast as a workaround for stubborn TS7017 error in Jest's global hooks context.
declare global {
  var __MONGO_MEM_SERVER__: any | undefined;
  var __MONGO_TEST_URI__: string | undefined;
}

export default globalSetup;
