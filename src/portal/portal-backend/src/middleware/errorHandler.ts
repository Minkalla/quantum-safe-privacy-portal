/**
 * @file errorHandler.ts
 * @description Centralized error handling middleware for the Quantum-Safe Privacy Portal Backend.
 * Defines custom error classes and a middleware to catch and standardize all application errors.
 *
 * @module ErrorHandling
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This module aligns with "no regrets" quality by providing consistent error responses,
 * improved debuggability, and a clear separation of concerns for error management.
 * It ensures sensitive error details are not exposed in production and handles different
 * types of errors gracefully (e.g., operational vs. programming errors).
 */

import { Request, Response, NextFunction } from 'express';
import Logger from '../utils/logger'; // Import our centralized logger

/**
 * @class AppError
 * @description Custom error class for operational errors.
 * These are errors that are predictable and can be handled gracefully (e.g., invalid input, resource not found).
 * Distinguishes from programming errors (e.g., bugs) which should ideally not occur.
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message); // Call the parent Error constructor
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as an operational error

    Error.captureStackTrace(this, this.constructor); // Capture stack trace
  }
}

/**
 * @function globalErrorHandler
 * @description Global error handling middleware.
 * Catches all errors, formats them consistently, and sends appropriate HTTP responses.
 * Prevents sensitive error details from leaking in production environments.
 *
 * @param {Error} err - The error object caught by Express.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The Express next middleware function.
 * @returns {void} Sends an error response.
 */
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction, // next is required for Express error middleware signature
): void => {
  // Set default status code and message for unhandled errors
  const statusCode = (err as AppError).statusCode || 500;
  const status = (err as AppError).status || 'error';
  const message = err.message || 'Something went wrong!';

  Logger.error(`Global Error: ${err.message} Stack: ${err.stack}`); // Log full error details internally

  // Send error response
  res.status(statusCode).json({
    status,
    message: statusCode === 500 && process.env['NODE_ENV'] !== 'development' ? 'Something went wrong!' : message, // Hide generic 500 details in production
    // In development, send full error details for debugging
    ...(process.env['NODE_ENV'] === 'development' && {
      error: err,
      stack: err.stack,
    }),
  });
};