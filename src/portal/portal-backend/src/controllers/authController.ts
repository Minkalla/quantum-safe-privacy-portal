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
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi'; // <-- NEW: Import Joi for validation
import User from '../models/User';
import Logger from '../utils/logger';

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
  // Future: Add other registration fields here with their validation rules
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
    // Input validation using Joi
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false }); // Validate all errors
    if (error) {
      const validationErrors = error.details.map((detail) => detail.message);
      Logger.warn(`Registration attempt failed: Input validation errors for email: ${req.body.email}. Errors: ${validationErrors.join(', ')}`);
      res.status(400).json({ message: 'Validation failed', errors: validationErrors });
      return;
    }

    const { email, password } = value; // Use validated value

    // Check if a user with the given email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      Logger.warn(`Registration attempt failed: Email already in use: ${email}`);
      res.status(409).json({ message: 'Email already registered' }); // 409 Conflict
      return;
    }

    // Hashing the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user instance with the hashed password
    const newUser = new User({
      email,
      password: hashedPassword,
    });

    // Save the new user to the database
    const savedUser = await newUser.save();

    Logger.info(`New user registered successfully with ID: ${savedUser._id} and email: ${savedUser.email}`);

    // Respond with success message and new user details (excluding sensitive password)
    res.status(201).json({
      message: 'User registered successfully',
      userId: savedUser._id,
      email: savedUser.email,
    });
  } catch (error) {
    // Catch any unexpected errors during the process (e.g., database issues, bcrypt errors)
    Logger.error('Error during user registration:', error);
    res.status(500).json({ message: 'Server error during registration', error: (error as Error).message });
  }
};