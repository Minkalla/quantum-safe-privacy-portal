// src/portal/portal-backend/src/middleware/errorHandler.ts
/**
 * @file errorHandler.ts
 * @description Centralized error handling middleware for the Quantum-Safe Privacy Portal Backend.
 * Catches and standardizes all application errors by leveraging the custom AppError class.
 * MODIFIED: Changed to default export to resolve potential circular dependency/loading issues.
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
import Logger from '../utils/logger'; 
// MODIFIED: Removed 'import AppError from '../utils/appError';' to break circular dependency.

interface IAppErrorProperties extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  errors?: string[];
}

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
 * MODIFIED: This function is now the default export.
 */
const globalErrorHandler = ( // MODIFIED: Removed 'export const'
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let error: IAppErrorProperties = err;

  const statusCode = error.statusCode || 500;
  const status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  const message = error.message || 'Something went wrong!';
  const errors = error.errors; 

  Logger.error(`Global Error: ${error.message} Stack: ${error.stack}`); 

  res.status(statusCode).json({
    status,
    message: statusCode === 500 && process.env['NODE_ENV'] !== 'development' ? 'Something went wrong!' : message, 
    ...(errors && { errors }), 
    ...(process.env['NODE_ENV'] === 'development' && {
      error: error, 
      stack: error.stack, 
    }),
  });
};

export default globalErrorHandler; // MODIFIED: Export as default