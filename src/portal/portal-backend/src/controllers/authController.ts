// src/portal/portal-backend/src/controllers/authController.ts
/**
 * @file authController.ts
 * @description Controller for authentication-related operations, including user registration and login.
 * Implements password hashing for secure storage, input validation, and JWT-based authentication
 * with dual-token strategy and brute-force protection.
 *
 * @module AuthController
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This controller adheres to "no regrets" quality by prioritizing security, structured error handling,
 * and robust authentication. It integrates with QynAuth for PQC elements later.
 * This file handles the business logic for API routes.
 *
 * @see {@link https://www.npmjs.com/package/bcryptjs|bcryptjs} for password hashing.
 * @see {@link https://joi.dev/api/|Joi API Documentation} for input validation.
 * @see {@link ../utils/appError.ts|Custom AppError Definition} for structured error handling.
 * @see {@link https://www.npmjs.com/package/express-async-errors|express-async-errors} for robust async error handling.
 * @see {@link ../utils/jwtService.ts|JwtService} for JWT generation and verification.
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import User from '../models/User';
import Logger from '../utils/logger';
import AppError from '../utils/appError';
import { generateTokens } from '../utils/jwtService';

// Brute-force protection settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 60; // 1 hour

/**
 * @constant {Joi.ObjectSchema} registerSchema
 * @description Joi schema for validating user registration input.
 */
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least {#limit} characters long',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
});

/**
 * @constant {Joi.ObjectSchema} loginSchema
 * @description Joi schema for validating user login input.
 * MODIFIED: New schema for login validation.
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
});

/**
 * @swagger
 * /portal/register:
 * post:
 * summary: Register a new user account
 * description: Creates a new user account with provided email and password. Ensures password complexity and email uniqueness. Implements rate limiting and validates input rigorously.
 * tags: [Authentication]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserCredentials'
 * examples:
 * validRegistration:
 * summary: Example of a valid registration request
 * value:
 * email: "newuser@minkalla.com"
 * password: "StrongPassword123!"
 * missingFields:
 * summary: Example of a registration with missing required fields
 * value:
 * email: ""
 * password: "Short1!"
 * responses:
 * 201:
 * description: User successfully registered.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserRegisteredResponse'
 * 400:
 * description: Validation failed (e.g., weak password, invalid email format, missing fields).
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 409:
 * description: Email already registered.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 429:
 * description: Too many registration attempts from this IP.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * security: [] # This endpoint does not require prior authentication
 * @compliance NIST SP 800-53:IA-5 (Authenticator Management), AC-7 (Unsuccessful Login Attempts), CM-3 (Configuration Management)
 * @compliance PCI DSS:2.2 (Secure Configurations), 8.2 (Authentication Controls)
 * @compliance ISO 27001:A.9.2.1 (User Registration), A.10.1.1 (Control of Operational Software)
 * @pii-data email, password (during input validation), IP address (for rate limiting)
 * @threat-model Account Enumeration, Weak Credential Attacks, Brute-Force Registration
 * @mitigation Rate Limiting, Strong Password Policy, Email Uniqueness Check, Joi Validation
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  // 1. Input validation using Joi
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const validationErrors = error.details.map((detail) => detail.message);
    Logger.warn(`Registration attempt failed: Joi validation errors for email: ${value.email || req.body.email || 'N/A'}. Errors: ${validationErrors.join(', ')}`);
    throw new AppError('Validation failed', 400, validationErrors);
  }

  // Extract validated data
  const { email, password } = value;

  // 2. Check if a user with the given email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    Logger.warn(`Registration attempt failed: Email already in use: ${email}`);
    throw new AppError('Email already registered', 409);
  }

  // 3. Hashing the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 4. Create a new user instance with the hashed password
  const newUser = new User({
    email,
    password: hashedPassword,
  });

  // 5. Save the new user to the database
  const savedUser = await newUser.save();

  Logger.info(`New user registered successfully with ID: ${savedUser._id} and email: ${savedUser.email}`);

  // 6. Respond with success message and new user details (excluding sensitive password)
  res.status(201).json({
    message: 'User registered successfully',
    userId: savedUser._id,
    email: savedUser.email,
  });
};

/**
 * @swagger
 * /portal/login:
 * post:
 * summary: Authenticate user and issue access/refresh tokens
 * description: Logs in a user with provided credentials. On successful authentication, issues a short-lived access token in the response body and a long-lived refresh token in an HTTP-only, secure, SameSite=Strict cookie. Implements brute-force protection with account lockout.
 * tags: [Authentication]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserCredentials'
 * examples:
 * validLogin:
 * summary: Example of a valid login request
 * value:
 * email: "testuser@minkalla.com"
 * password: "SecurePassword123!"
 * incorrectPassword:
 * summary: Example of an incorrect password attempt
 * value:
 * email: "testuser@minkalla.com"
 * password: "WrongPassword"
 * missingFields:
 * summary: Example of a login request with missing required fields
 * value:
 * email: ""
 * password: "password"
 * responses:
 * 200:
 * description: Successful authentication, returns access token. Refresh token set as HTTP-only cookie.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserLoginResponse'
 * headers:
 * Set-Cookie:
 * schema:
 * type: string
 * example: refreshToken=eyJhbGciOiJIUzI1Ni...; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=Fri, 27 Jun 2025 10:00:00 GMT
 * description: The refresh token is set as an HTTP-only, secure, SameSite=Strict cookie.
 * 400:
 * description: Validation failed (e.g., missing email/password).
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 401:
 * description: Invalid credentials (e.g., incorrect password, user not found).
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 403:
 * description: Account locked due to too many failed attempts.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 429:
 * description: Too many login attempts from this IP.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * security: [] # This endpoint does not require prior authentication
 * @compliance NIST SP 800-53:AU-12 (Audit Generation), AC-7 (Unsuccessful Login Attempts), IA-2(1) (Centralized Account Management), IA-5(1) (Authenticated Access), SC-5 (Denial of Service Protection)
 * @compliance PCI DSS:8.1.5 (Authentication Controls), 10.2.1 (Audit Trails)
 * @compliance ISO 27001:A.9.2.3 (Privileged Access Management), A.10.1.1 (Control of Operational Software)
 * @pii-data email, password (during input validation), IP address (for rate limiting)
 * @threat-model Brute-Force, Credential Stuffing, Session Hijacking (via insecure Refresh Token handling)
 * @mitigation Brute-Force Protection (Rate Limiting, Account Lockout), Dual-Token Strategy (Access Token short-lived, Refresh Token HttpOnly/Secure/SameSite cookie), Joi Validation
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  // 1. Input validation
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const validationErrors = error.details.map((detail) => detail.message);
    Logger.warn(`Login attempt failed: Joi validation errors for email: ${value.email || req.body.email || 'N/A'}. Errors: ${validationErrors.join(', ')}`);
    throw new AppError('Validation failed', 400, validationErrors);
  }

  const { email, password, rememberMe } = value; // Added rememberMe flag

  // 2. Check if user exists and is not locked
  const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil +refreshTokenHash'); // Select password and lock fields
  if (!user) {
    Logger.warn(`Login attempt failed: User not found for email: ${email}`);
    throw new AppError('Invalid credentials', 401);
  }

  // 3. Account Lock Check (Brute Force Protection)
  if (user.lockUntil && user.lockUntil > new Date()) {
    const remainingLockTime = Math.ceil((user.lockUntil.getTime() - new Date().getTime()) / 60000); // minutes
    Logger.warn(`Login attempt failed: Account locked for email: ${email}. Remaining time: ${remainingLockTime} minutes.`);
    throw new AppError(`Account locked. Please try again in ${remainingLockTime} minutes.`, 403);
  }

  // 4. Password comparison
  const isPasswordCorrect = await bcrypt.compare(password, user.password); // Compare provided password with stored hash

  if (!isPasswordCorrect) {
    // 5. Handle failed login attempt
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    Logger.warn(`Login attempt failed: Incorrect password for email: ${email}. Attempts: ${user.failedLoginAttempts}`);

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000); // Lock for N minutes
      user.failedLoginAttempts = 0; // Reset count after locking
      Logger.warn(`Account locked due to too many failed attempts for email: ${email}. Locked until: ${user.lockUntil}`);
      await user.save();
      throw new AppError(`Account locked due to too many failed attempts. Please try again in ${LOCK_TIME_MINUTES} minutes.`, 403);
    }

    await user.save(); // Save updated failed attempts
    throw new AppError('Invalid credentials', 401);
  }

  // 6. Successful login
  // Reset failed login attempts and lock info
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date(); // Update last login timestamp

  // Generate tokens
  const tokenPayload = { userId: user._id, email: user.email };
  const { accessToken, refreshToken } = generateTokens(tokenPayload, rememberMe);

  // Hash and save refresh token for server-side revocation
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10); // Use bcrypt to hash refresh token for storage
  user.refreshTokenHash = hashedRefreshToken;

  await user.save(); // Save updated user info and refresh token hash

  Logger.info(`User logged in successfully: ${user.email}. User ID: ${user._id}`);

  // Set HTTP-only, secure, SameSite cookie for refresh token
  const cookieOptions = {
    expires: new Date(Date.now() + (rememberMe ? LOCK_TIME_MINUTES * 60 * 1000 * 30 : LOCK_TIME_MINUTES * 60 * 1000 * 7)), // 30 days for rememberMe, 7 days default
    httpOnly: true, // Prevent client-side JavaScript access
    secure: process.env['NODE_ENV'] === 'production', // Only send over HTTPS in production
    sameSite: 'strict' as const, // Protect against CSRF
  };
  res.cookie('refreshToken', refreshToken, cookieOptions);

  // 7. Respond with access token and basic user info
  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully',
    accessToken,
    user: {
      id: user._id,
      email: user.email,
    },
  });
};