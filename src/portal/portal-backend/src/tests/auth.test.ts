/**
 * @file auth.test.ts
 * @description Automated tests for the user authentication (registration) endpoint
 * of the Quantum-Safe Privacy Portal Backend. These tests now fully manage their
 * Mongoose connection to the in-memory MongoDB server provided by Jest's global setup.
 * This ensures precise control over the database state for each test suite.
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

import request from 'supertest';
import mongoose from 'mongoose'; // REQUIRED: For local Mongoose connection management
import app from '../index'; // Import the Express app instance
import { UserSchema, IUser } from '../models/User'; // Import UserSchema and IUser interface


// IMPORTANT: Remove local MongoMemoryServer instance declaration.
// The global setup (jest-global-setup.ts) now handles starting the in-memory MongoDB.

// Declare a variable for the TestUser model. This will be initialized in beforeAll.
let TestUser: mongoose.Model<IUser>;

// --- Mock bcryptjs operations to speed up tests ---
// Ensure this mock is correctly applied and visible to all relevant code.
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('mockSalt'),
  hash: jest.fn().mockResolvedValue('mockHashedPassword'),
}));

/**
 * @function beforeAllHook
 * @description Connects Mongoose to the in-memory MongoDB server (URI provided by global setup)
 * before all tests in this suite. This connection is specifically for this test suite.
 * It also compiles the TestUser model for use in tests.
 */
beforeAll(async () => {
  // Ensure any existing global Mongoose connection is closed before establishing a new one for tests
  // This helps prevent Mongoose from using an old connection or buffering operations incorrectly.
  if (mongoose.connection.readyState !== 0) { // 0 = disconnected
    await mongoose.disconnect();
  }

  // Get the URI for the in-memory MongoDB server from the environment variable set by global setup
  const mongoUri = process.env['MONGO_TEST_URI'];
  if (!mongoUri) {
    throw new Error('MONGO_TEST_URI not set. Jest global setup failed to provide MongoDB URI.');
  }

  // Connect Mongoose to the in-memory server specifically for this test suite
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
    socketTimeoutMS: 60000,     // Increased to 60 seconds
    connectTimeoutMS: 30000,    // Increased to 30 seconds
    dbName: 'jest_test_db',
  });

  // Compile the User model against this newly established connection
  TestUser = mongoose.model<IUser>('User', UserSchema);

  console.log(`Mongoose connected in auth.test.ts using URI: ${mongoUri}`);
});

/**
 * @function beforeEachHook
 * @description Clears all user data in the database before each test.
 * Ensures tests are isolated and don't affect each other by removing data created during previous tests.
 */
beforeEach(async () => {
  // Clear all user data using the TestUser model bound to this test suite's connection
  await TestUser.deleteMany({});
  console.log('Cleared user data before test.');
});

/**
 * @function afterAllHook
 * @description Disconnects Mongoose after all tests in this suite.
 * This ensures the connection is properly closed and doesn't keep Jest hanging.
 * The MongoMemoryServer itself is stopped by jest-global-teardown.ts.
 */
afterAll(async () => {
  // Close the Mongoose connection opened specifically for this test suite
  await mongoose.disconnect();
  console.log('Mongoose disconnected in auth.test.ts after all tests.');
});


// --- Test Cases for User Registration ---

describe('POST /portal/register', () => {
  // Test: Successful user registration
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

    // Verify the user was saved to the database using the TestUser model
    const user = await TestUser.findOne({ email: 'test@example.com' });
    expect(user).toBeDefined();
    expect(user?.email).toEqual('test@example.com');
    expect(user?.password).toEqual('mockHashedPassword'); // Expect hashed password from mock
  });

  // Test: Missing email validation
  it('should return 400 if email is missing', async () => {
    const res = await request(app)
      .post('/portal/register')
      .send({
        password: 'StrongPassword123!',
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual('Validation failed');
    expect(res.body.errors).toContain('Email is required');
  }, 15000); // MODIFIED: Added 15-second timeout

  // Test: Password too short validation
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
  }, 15000); // MODIFIED: Added 15-second timeout

  // Test: Invalid email format validation
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
  }, 15000); // MODIFIED: Added 15-second timeout

  // Test: Duplicate email registration conflict
  it('should return 409 if email is already registered', async () => {
    // Pre-register a user directly via the TestUser model
    await TestUser.create({
      email: 'duplicate@example.com',
      password: 'mockHashedPassword',
    });

    // Attempt to register again with the same email
    const res = await request(app)
      .post('/portal/register')
      .send({
        email: 'duplicate@example.com',
        password: 'AnotherStrongPassword!',
      });

    expect(res.statusCode).toEqual(409);
    expect(res.body.message).toEqual('Email already registered');
  }, 15000); // MODIFIED: Added 15-second timeout
});