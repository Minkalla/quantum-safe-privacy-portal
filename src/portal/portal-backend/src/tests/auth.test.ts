/**
 * @file auth.test.ts
 * @description Automated tests for the user authentication (registration) endpoint
 * of the Quantum-Safe Privacy Portal Backend.
 *
 * @module AuthTests
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * These tests use Jest and Supertest to simulate HTTP requests and
 * verify the behavior of the /portal/register endpoint, including
 * successful registration, validation failures, and conflict handling.
 * Automated testing is a cornerstone of our "no regrets" quality assurance.
 *
 * @see {@link https://jestjs.io/docs/expect|Jest Matchers}
 * @see {@link https://github.com/visionmedia/supertest|Supertest Documentation}
 */

// Use CommonJS require for supertest to avoid import issues
const request = require('supertest');
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index';
import { default as UserModel, IUser } from '../models/User';

let mongo: MongoMemoryServer; // In-memory MongoDB server instance
let testConnection: mongoose.Connection; // Specific connection for tests
let TestUser: mongoose.Model<IUser>; // User model bound to the test connection

// --- Mock bcryptjs operations to speed up tests ---
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('mockSalt'),
  hash: jest.fn().mockResolvedValue('mockHashedPassword'),
}));

/**
 * @function beforeAllHook
 * @description Connects to an in-memory MongoDB server before all tests in this suite.
 * This ensures tests run quickly and independently without affecting a real database.
 * Uses `mongoose.createConnection` for isolated test connections, preventing conflicts.
 */
beforeAll(async () => {
  // Ensure any existing global Mongoose connection (e.g., from index.ts or a previous test run) is completely closed
  if (mongoose.connection.readyState !== 0) { // 0 = disconnected
    await mongoose.disconnect();
  }

  // Create an in-memory MongoDB instance for testing
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  // Create a *new, isolated* Mongoose connection specifically for this test suite
  testConnection = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    bufferCommands: false,
    dbName: 'jest_test_db',
  });

  // Bind the User model to this specific test connection
  // This is crucial: operations on TestUser will only affect the in-memory DB
  TestUser = testConnection.model<IUser>('User', UserModel.schema);
});

/**
 * @function afterEachHook
 * @description Clears all collections in the database after each test.
 * Ensures tests are isolated and don't affect each other by removing data created during the test.
 * Operates on the test-specific connection.
 */
afterEach(async () => {
  // Delete all documents from all collections in the current test database
  const collections = testConnection.collections; // Use the test-specific connection's collections
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

/**
 * @function afterAllHook
 * @description Disconnects from the in-memory MongoDB server and stops MongoMemoryServer after all tests.
 * This prevents Jest from hanging due to open database connections.
 * Operates on the test-specific connection.
 */
afterAll(async () => {
  // Close the test-specific Mongoose connection
  await testConnection.close();
  // Stop the in-memory MongoDB server
  if (mongo) {
    await mongo.stop();
  }
});

// --- Test Cases for User Registration ---

describe('POST /portal/register', () => {
  it('should register a new user successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/portal/register')
      .send({
        email: 'test@example.com',
        password: 'StrongPassword123!',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.message).toEqual('User registered successfully');
    expect(res.body.userId).toBeDefined();
    expect(res.body.email).toEqual('test@example.com');

    const user = await TestUser.findOne({ email: 'test@example.com' });
    expect(user).toBeDefined();
    expect(user?.email).toEqual('test@example.com');
    expect(user?.password).toEqual('mockHashedPassword');
  });

  it('should return 400 if email is missing', async () => {
    const res = await request(app)
      .post('/portal/register')
      .send({
        password: 'StrongPassword123!',
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual('Validation failed');
    expect(res.body.errors).toContain('"email" is required');
  });

  it('should return 400 if password is too short', async () => {
    const res = await request(app)
      .post('/portal/register')
      .send({
        email: 'shortpass@example.com',
        password: 'short',
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual('Validation failed');
    expect(res.body.errors).toContain(
      'Password must be at least 8 characters long',
    );
  });

  it('should return 400 if email format is invalid', async () => {
    const res = await request(app)
      .post('/portal/register')
      .send({
        email: 'invalid-email',
        password: 'StrongPassword123!',
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual('Validation failed');
    expect(res.body.errors).toContain('Please enter a valid email address');
  });

  it('should return 409 if email is already registered', async () => {
    await TestUser.create({
      email: 'duplicate@example.com',
      password: 'mockHashedPassword',
    });

    const res = await request(app)
      .post('/portal/register')
      .send({
        email: 'duplicate@example.com',
        password: 'AnotherStrongPassword!',
      });

    expect(res.statusCode).toEqual(409);
    expect(res.body.message).toEqual('Email already registered');
      });
});