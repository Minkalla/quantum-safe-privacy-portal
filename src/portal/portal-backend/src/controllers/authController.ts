/**
 * @file authController.ts
 * @description Controller for authentication-related operations, including user registration.
 * Implements password hashing for secure storage and initial validation logic.
 *
 * @module AuthController
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This controller adheres to "no regrets" quality by prioritizing security (password hashing)
 * and structured error handling. It will integrate with QynAuth for PQC elements later.
 * This file will handle the business logic for API routes.
 *
 * @see {@link https://www.npmjs.com/package/bcryptjs|bcryptjs} for password hashing.
 * @see {@link https://joi.dev/api/|Joi API Documentation} for input validation.
 * @see {@link ../middleware/errorHandler.ts|Centralized Error Handling} for AppError definition.
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import User from '../models/User';
import Logger from '../utils/logger';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler'; // <-- NEW: Import AppError

/**
 * @constant {Joi.ObjectSchema} registerSchema
 * @description Joi schema for validating user registration input.
 * Ensures email is valid, password meets length requirements, and no unknown fields are present.
 * This enhances security and data integrity by validating data at the API entry point.
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
 * @function register
 * @description Handles the user registration process.
 * Performs robust input validation, hashes the user's password, and attempts to save the new user to the database.
 *
 * @route POST /portal/register
 * @param {Request} req - The Express request object, containing user registration data (email, password).
 * @param {Response} res - The Express response object, used to send back API responses.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Input validation using Joi
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const validationErrors = error.details.map((detail) => detail.message);
      Logger.warn(`Registration attempt failed: Joi validation errors for email: ${value.email || req.body.email || 'N/A'}. Errors: ${validationErrors.join(', ')}`);
      // Throw an AppError for validation failures, which will be caught by globalErrorHandler
      throw new AppError('Validation failed', 400);
    }

    // Extract validated data
    const { email, password } = value;

    // 2. Check if a user with the given email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      Logger.warn(`Registration attempt failed: Email already in use: ${email}`);
      // Throw an AppError for conflict, which will be caught by globalErrorHandler
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
  } catch (error) {
    // If it's already an AppError (thrown by us), just pass it to the next error middleware
    if (error instanceof AppError) {
      throw error;
    }

    // Handle specific Mongoose errors that might occur after AppError checks
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      Logger.warn(`Mongoose validation error during registration: ${validationErrors.join(', ')}`);
      // Throw a new AppError for Mongoose validation, consistent with Joi validation
      throw new AppError(`Database validation failed: ${validationErrors.join(', ')}`, 400);
    }

    // Handle duplicate key errors from MongoDB (e.g., unique email constraint)
    if ((error as any).code === 11000) {
      Logger.warn(`Duplicate key error during registration: ${JSON.stringify(error)}`);
      // Throw a new AppError for duplicate email, consistent with our conflict handling
      throw new AppError('Email already registered', 409);
    }

    // For any other unexpected errors, re-throw as a generic AppError (500)
    // This ensures all errors eventually hit our global handler in a controlled way.
    throw new AppError('An unexpected server error occurred during registration', 500);
  }
};