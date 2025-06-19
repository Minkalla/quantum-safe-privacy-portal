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

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server'; // For in-memory MongoDB for tests
import User from '../models/User';
import app from '../index'; // Assuming index.ts exports the Express app 'app'

let mongo: MongoMemoryServer; // In-memory MongoDB server instance

/**
 * @function connect
 * @description Connects to an in-memory MongoDB server before all tests.
 * This ensures tests run quickly and independently without affecting a real database.
 */
beforeAll(async () => {
  // Connect to in-memory MongoDB
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
});

/**
 * @function clearDatabase
 * @description Clears all collections in the database after each test.
 * Ensures tests are isolated and don't affect each other.
 */
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

/**
 * @function disconnect
 * @description Disconnects from the in-memory MongoDB server after all tests.
 */
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
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

    const user = await User.findOne({ email: 'test@example.com' });
    expect(user).toBeDefined();
    expect(user?.email).toEqual('test@example.com');
    expect(user?.password).not.toEqual('StrongPassword123!'); // Password should be hashed
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
    // Register the first user
    await request(app).post('/portal/register').send({
      email: 'duplicate@example.com',
      password: 'StrongPassword123!',
    });

    // Try to register with the same email again
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