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
// MODIFIED: Removed import of securityConfig - no longer needed here for overrides

// IMPORTANT: Remove local MongoMemoryServer instance declaration.
// The global setup (jest-global-setup.ts) now handles starting the in-memory MongoDB.

// Declare a variable for the TestUser model. This will be initialized in beforeAll.
let TestUser: mongoose.Model<IUser>;

// --- Mock bcryptjs operations ---
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('mockSalt'),
  hash: jest.fn().mockImplementation((password, salt) => {
    if (password === 'StrongPassword123!' && salt === 'mockSalt') {
      return Promise.resolve('mockHashedPassword');
    }
    return Promise.resolve(`default_hashed_${password}_${salt}`);
  }),
  compare: jest.fn(),
}));

// MODIFIED: Mock the rate limiting middleware to always allow requests for auth tests
jest.mock('../middleware/rateLimitMiddleware', () => ({
  // Mock the exported instances to be simple pass-through middleware
  globalApiLimiter: (req: any, res: any, next: any) => next(),
  loginApiLimiter: (req: any, res: any, next: any) => next(),
  registerApiLimiter: (req: any, res: any, next: any) => next(),
  // Also mock the test factory functions, though they won't be used by auth.test.ts
  createTestGlobalLimiter: jest.fn(() => (req: any, res: any, next: any) => next()),
  createTestLoginLimiter: jest.fn(() => (req: any, res: any, next: any) => next()),
  createTestRegisterLimiter: jest.fn(() => (req: any, res: any, next: any) => next()),
}));


/**
 * @function beforeAllHook
 * @description Connects Mongoose to the in-memory MongoDB server (URI provided by global setup)
 * before all tests in this suite. This connection is specifically for this test suite.
 * It also compiles the TestUser model for use in tests.
 */
beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  const mongoUri = process.env['MONGO_TEST_URI'];
  if (!mongoUri) {
    throw new Error('MONGO_TEST_URI not set. Jest global setup failed to provide MongoDB URI.');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000, 
    socketTimeoutMS: 60000,     
    connectTimeoutMS: 30000,    
    dbName: 'jest_test_db',
  });

  TestUser = mongoose.model<IUser>('User', UserSchema);

  console.log(`Mongoose connected in auth.test.ts using URI: ${mongoUri}`);
});

/**
 * @function beforeEachHook
 * @description Clears all user data in the database before each test.
 * Ensures tests are isolated and don't affect each other by removing data created during previous tests.
 */
beforeEach(async () => {
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
  await mongoose.disconnect();
  console.log('Mongoose disconnected in auth.test.ts after all tests.');
});


// --- Test Cases for User Registration ---

describe('POST /portal/register', () => {
  it('should register a new user successfully with valid credentials', async () => {
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

    const user = await TestUser.findOne({ email: 'test@example.com' });
    expect(user).toBeDefined();
    expect(user?.email).toEqual('test@example.com');
    expect(user?.password).toEqual('mockHashedPassword'); 
  }, 15000); 

  it('should return 400 if email is missing', async () => {
    const res = await request(app)
      .post('/portal/register')
      .send({
        password: 'StrongPassword123!',
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual('Validation failed');
    expect(res.body.errors).toContain('Email is required');
  }, 15000); 

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
  }, 15000); 

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
  }, 15000); 

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
  }, 15000); 
});


// --- Test Cases for User Login ---
describe('POST /portal/login', () => {
  const userEmail = 'loginuser@example.com';
  const userPassword = 'correctpassword';
  let hashedPassword = '';

  beforeEach(async () => {
    jest.clearAllMocks(); 

    (bcrypt.compare as jest.Mock).mockImplementation((password, hash) => {
      return Promise.resolve(password === userPassword && hash === hashedPassword);
    });
    (bcrypt.hash as jest.Mock).mockImplementation((password, salt) => {
      if (password === userPassword) { 
        return Promise.resolve(jest.requireActual<typeof bcrypt>('bcryptjs').hashSync(password, salt)); 
      }
      return Promise.resolve(`mockHashedRefreshToken_${password}_${salt}`);
    });

    const originalBcryptHash = jest.requireActual<typeof bcrypt>('bcryptjs').hash;
    const originalBcryptGenSalt = jest.requireActual<typeof bcrypt>('bcryptjs').genSalt;
    hashedPassword = await originalBcryptHash(userPassword, await originalBcryptGenSalt(10));

    await TestUser.create({
      email: userEmail,
      password: hashedPassword, 
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
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('refreshToken');
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(res.headers['set-cookie'][0]).toContain('Path=/');

    const user = await TestUser.findOne({ email: userEmail });
    expect(user?.lastLoginAt).toBeDefined();
    expect(user?.failedLoginAttempts).toEqual(0); 
    expect(user?.lockUntil).toBeNull(); 
    const userWithTokenHash = await TestUser.findOne({ email: userEmail }).select('+refreshTokenHash');
    expect(userWithTokenHash?.refreshTokenHash).toBeDefined(); 
  }, 15000); 

  // Test: Login with incorrect password
  it('should return 401 for incorrect password', async () => {
    const res = await request(app)
      .post('/portal/login')
      .send({ email: userEmail, password: 'wrongpassword' });

    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toEqual('Invalid credentials');

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
    expect(res.body.message).toEqual('Validation failed'); 
    expect(res.body.errors).toContain('Password is required'); 
  }, 15000);

  // Test: Account locked due to failed attempts
  it('should return 403 if account is locked due to too many failed attempts', async () => {
    // Simulate failed attempts to lock the account
    for (let i = 0; i < 5; i++) { 
      await request(app)
        .post('/portal/login')
        .send({ email: userEmail, password: 'wrongpassword' });
    }

    const userBeforeFinalAttempt = await TestUser.findOne({ email: userEmail });
    expect(userBeforeFinalAttempt?.failedLoginAttempts).toEqual(0); 
    expect(userBeforeFinalAttempt?.lockUntil).toBeDefined(); 

    // Attempt to log in again while locked
    const res = await request(app)
      .post('/portal/login')
      .send({ email: userEmail, password: userPassword });

    expect(res.statusCode).toEqual(403);
    expect(res.body.message).toMatch(/Account locked\. Please try again in \d+ minutes\./);
  }, 30000); 

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

    const user = await TestUser.findOne({ email: userEmail });
    expect(user?.failedLoginAttempts).toEqual(0);
    expect(user?.lockUntil).toBeNull();
  }, 15000); 
});