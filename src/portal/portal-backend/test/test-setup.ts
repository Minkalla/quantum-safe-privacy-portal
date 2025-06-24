import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer: MongoMemoryServer;
let mongoConnection: MongoClient;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  mongoConnection = new MongoClient(mongoUri);
  await mongoConnection.connect();
  
  (global as any).__MONGO_URI__ = mongoUri;
  (global as any).__MONGO_CONNECTION__ = mongoConnection;
});

afterAll(async () => {
  if (mongoConnection) {
    await mongoConnection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
