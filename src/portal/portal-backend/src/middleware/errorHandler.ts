// src/portal/portal-backend/src/middleware/errorHandler.ts
/**
 * @file errorHandler.ts
 * @description Centralized error handling middleware for the Quantum-Safe Privacy Portal Backend.
 * Catches and standardizes all application errors by leveraging the custom AppError class.
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
import AppError from '../utils/appError'; // MODIFIED: Import AppError from its dedicated file

/**
 * @function globalErrorHandler
 * @description Global error handling middleware.
 * Catches all errors, formats them consistently, and sends appropriate HTTP responses.
 * Prevents sensitive error details from leaking in production environments.
 *
 * @param {Error} err - The error object caught by Express.
 * @param {Request} _req - The Express request object. Prefixed with _ as it's not directly used in this implementation.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} _next - The Express next middleware function. Prefixed with _ as it's not directly used in this implementation.
 * @returns {void} Sends an error response.
 */
export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // MODIFIED: Type assert err as AppError to access its properties, assuming it's an AppError instance
  let error = err as AppError;

  // Set default status code and message for unhandled errors
  const statusCode = error.statusCode || 500;
  const status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  const message = error.message || 'Something went wrong!';
  const errors = error.errors; // MODIFIED: Get the 'errors' array if present

  Logger.error(`Global Error: ${error.message} Stack: ${error.stack}`); // Log full error details internally

  // Send error response
  res.status(statusCode).json({
    status,
    message: statusCode === 500 && process.env['NODE_ENV'] !== 'development' ? 'Something went wrong!' : message, // Hide generic 500 details in production
    ...(errors && { errors }), // MODIFIED: Conditionally include the 'errors' array
    // In development, send full error details for debugging
    ...(process.env['NODE_ENV'] === 'development' && {
      error: error, // Use the asserted 'error' variable
      stack: error.stack, // Use the asserted 'error' variable
    }),
  });
};

// MODIFIED: Removed the AppError class definition from here, as it's now in utils/appError.ts