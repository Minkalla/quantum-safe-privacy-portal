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
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs'; // Import bcryptjs for password hashing
import User from '../models/User'; // Import the User model
import Logger from '../utils/logger'; // Import our centralized logger

/**
 * @function register
 * @description Handles the user registration process.
 * Performs basic validation, hashes the user's password, and attempts to save the new user to the database.
 *
 * @route POST /portal/register
 * @param {Request} req - The Express request object, containing user registration data (email, password).
 * @param {Response} res - The Express response object, used to send back API responses.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body; // Extract email and password from request body

    // Basic validation: Check if email and password are provided
    if (!email || !password) {
      Logger.warn('Registration attempt failed: Missing email or password.');
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Hashing the password
    // Generate a salt with a cost factor (e.g., 10). A higher cost factor is more secure but slower.
    const salt = await bcrypt.genSalt(10);
    // Hash the password using the generated salt
    const hashedPassword = await bcrypt.hash(password, salt);

    Logger.info(`Registration request received for email: ${email}. Password hashed successfully.`);

    // For now, we're just logging the hashed password and sending a dummy success.
    // The actual user creation and saving to MongoDB will be implemented in the next sub-step.
    res.status(200).json({
      message: 'User registration processing (password hashed). Database saving to follow.',
      hashedPassword,
    });
  } catch (error) {
    Logger.error('Error during user registration:', error);
    res.status(500).json({ message: 'Server error during registration', error: (error as Error).message });
  }
};