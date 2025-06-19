// jest-global-teardown.ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// This file will access the MongoMemoryServer instance that was stored globally
// by globalSetup. It's stored as a property on the global object.
// Ensure the type definition is consistent with globalSetup
declare global {
  namespace NodeJS {
    interface Global {
      __MONGO_MEM_SERVER__: MongoMemoryServer;
    }
  }
}

async function globalTeardown() {
  console.log('\n--- Jest Global Teardown ---');
  try {
    await mongoose.disconnect();
    console.log('MongoDB connection closed in teardown.');

    // Stop the MongoMemoryServer instance
    if (global.__MONGO_MEM_SERVER__) {
      await global.__MONGO_MEM_SERVER__.stop();
      console.log('MongoMemoryServer stopped in teardown.');
    }
  } catch (error) {
    console.error('Error during Jest global teardown:', error);
    process.exit(1);
  }
}

export default globalTeardown;