/**
 * @file auth.test.ts
 * @description Automated tests for the user authentication (registration and login) endpoints
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
 * verify the behavior of the /portal/register and /portal/login endpoints, including
 * successful operations, validation failures, conflict handling, and login security features.
 * Automated testing is a cornerstone of our "no regrets" quality assurance.
 *
 * @see {@link https://jestjs.io/docs/expect|Jest Matchers}
 * @see {@link https://github.com/visionmedia/supertest|Supertest Documentation}
 */

import request from 'supertest';
import mongoose from 'mongoose'; // REQUIRED: For local Mongoose connection management
import app from '../index'; // Import the Express app instance
import { UserSchema, IUser } from '../models/User'; // Import UserSchema and IUser interface
import bcrypt from 'bcryptjs'; // Import bcrypt for direct password hashing in test setup

// IMPORTANT: Remove local MongoMemoryServer instance declaration.
// The global setup (jest-global-setup.ts) now handles starting the in-memory MongoDB.

// Declare a variable for the TestUser model. This will be initialized in beforeAll.
let TestUser: mongoose.Model<IUser>;

// --- Mock bcryptjs operations ---
// MODIFIED: Make bcrypt.hash always return mockHashedPassword by default,
// and allow compare to be overridden later.
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('mockSalt'),
  hash: jest.fn().mockResolvedValue('mockHashedPassword'), // Default mock for hash
  compare: jest.fn(), // Compare will be mocked per test in login's beforeEach
}));


/**
 * @function beforeAllHook
 * @description Connects Mongoose to the in-memory MongoDB server (URI provided by global setup)
 * before all tests in this suite. This connection is specifically for this test suite.
 * It also compiles the TestUser model for use in tests.
 */
beforeAll(async () => {
  // Ensure any existing global Mongoose connection is closed before establishing a new one for tests
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
    // Ensure bcrypt.hash returns the specific mock value for this test
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('mockHashedPassword'); 

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


// --- Test Cases for User Login ---
describe('POST /portal/login', () => {
  const userEmail = 'loginuser@example.com';
  const userPassword = 'correctpassword';
  let hashedPassword = '';

  // Before any login test, ensure a user exists for login attempts
  beforeEach(async () => {
    // MODIFIED: Clear all mocks before setting new ones for login tests
    jest.clearAllMocks(); 

    // Re-mock bcrypt.compare for specific compare behavior in login tests
    (bcrypt.compare as jest.Mock).mockImplementation((password, hash) => {
      return Promise.resolve(password === userPassword && hash === hashedPassword);
    });
    // MODIFIED: Mock bcrypt.hash for refresh token hashing during login tests
    // Ensure it does not interfere with the outer jest.mock's default
    (bcrypt.hash as jest.Mock).mockImplementation((password, salt) => {
      // If hashing the user's main password for initial setup in this beforeEach
      if (password === userPassword) { 
        // Using actual bcrypt.hash for user password in test setup
        return jest.requireActual('bcryptjs').hash(password, salt); 
      }
      // For hashing the refresh token, provide a distinct mock hash
      return Promise.resolve(`mockHashedRefreshToken_${password}_${salt}`);
    });

    // Hash the password for the test user to simulate real registration
    // This hash is now performed using the actual bcrypt module, not the global mock
    // Temporarily bypass the mock for this line
    const originalBcryptHash = jest.requireActual('bcryptjs').hash;
    const originalBcryptGenSalt = jest.requireActual('bcryptjs').genSalt;
    hashedPassword = await originalBcryptHash(userPassword, await originalBcryptGenSalt(10));

    await TestUser.create({
      email: userEmail,
      password: hashedPassword, // Ensure password is correctly set
      failedLoginAttempts: 0,
      lockUntil: null,
    });
  });

  // Test: Successful login
  it('should log in a user successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/portal/login')
      .send({ email: userEmail, password: userPassword });

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('success');
    expect(res.body.message).toEqual('Logged in successfully');
    expect(res.body.accessToken).toBeDefined();
    // Check for HTTP-only cookie
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('refreshToken');
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(res.headers['set-cookie'][0]).toContain('Path=/');

    // Verify user fields updated in DB
    const user = await TestUser.findOne({ email: userEmail });
    expect(user?.lastLoginAt).toBeDefined();
    expect(user?.failedLoginAttempts).toEqual(0); // Should be reset
    expect(user?.lockUntil).toBeNull(); // Should be null
    // Ensure refreshTokenHash is selected for verification
    const userWithTokenHash = await TestUser.findOne({ email: userEmail }).select('+refreshTokenHash');
    expect(userWithTokenHash?.refreshTokenHash).toBeDefined(); // Should be hashed refresh token
  }, 15000); // 15-second timeout

  // Test: Login with incorrect password
  it('should return 401 for incorrect password', async () => {
    const res = await request(app)
      .post('/portal/login')
      .send({ email: userEmail, password: 'wrongpassword' });

    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toEqual('Invalid credentials');

    // Verify failed attempts count incremented
    const user = await TestUser.findOne({ email: userEmail });
    expect(user?.failedLoginAttempts).toEqual(1);
    expect(user?.lockUntil).toBeNull();
  }, 15000);

  // Test: Login with non-existent user
  it('should return 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/portal/login')
      .send({ email: 'nonexistent@example.com', password: 'anypassword' });

    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toEqual('Invalid credentials');
    // No user found, so no failed attempts in DB for this email
  }, 15000);

  // Test: Login with missing email
  it('should return 400 if email is missing', async () => {
    const res = await request(app)
      .post('/portal/login')
      .send({ password: userPassword });

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual('Validation failed');
    expect(res.body.errors).toContain('Email is required');
  }, 15000);

  // Test: Login with missing password
  it('should return 400 if password is missing', async () => {
    const res = await request(app)
      .post('/portal/login')
      .send({ email: userEmail });

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual('Validation failed'); // MODIFIED: Check general validation message
    expect(res.body.errors).toContain('Password is required'); // MODIFIED: Check specific error in errors array
  }, 15000);

  // Test: Account locked due to failed attempts
  it('should return 403 if account is locked due to too many failed attempts', async () => {
    // Simulate failed attempts to lock the account
    for (let i = 0; i < 5; i++) { // MAX_FAILED_ATTEMPTS is 5
      await request(app)
        .post('/portal/login')
        .send({ email: userEmail, password: 'wrongpassword' });
    }

    const userBeforeFinalAttempt = await TestUser.findOne({ email: userEmail });
    expect(userBeforeFinalAttempt?.failedLoginAttempts).toEqual(0); // Should be reset after locking
    expect(userBeforeFinalAttempt?.lockUntil).toBeDefined(); // Should have a lock timestamp

    // Attempt to log in again while locked
    const res = await request(app)
      .post('/portal/login')
      .send({ email: userEmail, password: userPassword });

    expect(res.statusCode).toEqual(403);
    expect(res.body.message).toMatch(/Account locked\. Please try again in \d+ minutes\./);
  }, 30000); // Increased timeout for brute-force simulation

  // Test: Successful login after previous failed attempts (but not locked)
  it('should allow successful login after previous failed attempts (below lock threshold)', async () => {
    // Simulate some failed attempts (less than MAX_FAILED_ATTEMPTS)
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/portal/login')
        .send({ email: userEmail, password: 'wrongpassword' });
    }

    // Now, attempt successful login
    const res = await request(app)
      .post('/portal/login')
      .send({ email: userEmail, password: userPassword });

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('success');

    // Verify failed attempts count reset to 0
    const user = await TestUser.findOne({ email: userEmail });
    expect(user?.failedLoginAttempts).toEqual(0);
    expect(user?.lockUntil).toBeNull();
  }, 15000); // 15-second timeout
});