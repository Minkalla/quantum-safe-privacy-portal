// src/portal/portal-backend/src/utils/appError.ts
/**
 * @file appError.ts
 * @description Custom application error class for structured error handling.
 * This class extends the native Error class, allowing for standardized
 * error messages, HTTP status codes, and optional detailed error information
 * (e.g., from validation libraries like Joi). This promotes a "no regrets"
 * approach to error management by making errors predictable and easy to process.
 *
 * @class AppError
 * @author Minkalla
 * @license MIT
 *
 * @property {number} statusCode - The HTTP status code associated with the error.
 * @property {boolean} isOperational - Indicates if the error is operational (expected) or programming (unexpected).
 * @property {string[]} [errors] - Optional array of strings for detailed error messages, e.g., validation errors.
 */
class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: string[]; // Optional property for detailed error messages (e.g., validation)

  constructor(message: string, statusCode: number, errors?: string[]) {
    super(message); // Call the parent Error constructor with the message

    this.statusCode = statusCode;
    this.isOperational = true; // Mark as operational error (expected, handled)

    // Assign the optional errors array if provided
    if (errors) {
      this.errors = errors;
    }

    // Capture the stack trace for better debugging
    // This maintains the correct stack trace for where the error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;