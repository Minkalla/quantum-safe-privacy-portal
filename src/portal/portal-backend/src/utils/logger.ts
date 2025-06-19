/**
 * @file logger.ts
 * @description Centralized logging utility for the Quantum-Safe Privacy Portal Backend.
 * Implements Winston for flexible, structured, and compliant logging.
 *
 * @module Logger
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Adheres to "no regrets" quality by providing structured logging crucial for
 * debugging, monitoring, and meeting regulatory requirements (e.g., NIST SP 800-53, HIPAA, SOC 2).
 * Supports different log levels (error, warn, info, debug) and outputs to console in development.
 * Can be extended for file transport, cloud logging (e.g., CloudWatch, LogDNA), etc., in production.
 *
 * @see {@link https://github.com/winstonjs/winston|Winston GitHub}
 */

import winston from 'winston';

/**
 * Define custom log levels and their associated colors.
 * This provides a clear visual distinction in console logs.
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Determines the active log level based on the NODE_ENV environment variable.
 * In development, 'debug' level is used for verbose output.
 * In production or other environments, 'warn' is used to reduce verbosity.
 * This allows granular control over log output for different deployment contexts.
 * @returns {string} The active log level.
 */
const level = (): string => {
  const env = process.env['NODE_ENV'] || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

/**
 * Defines the format for console logs.
 * Combines timestamp, log level (with color), and the log message.
 * Provides clear, readable output for development and debugging.
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  // Add a timestamp to each log entry.
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // Customize log message based on environment.
  // Explicitly define the structure of the 'info' object for TypeScript strictness.
  winston.format.printf(
    (info: { timestamp: string; level: string; message: string }) =>
      `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

/**
 * Defines the transports (where logs are sent).
 * Currently configured for console output, which is suitable for Codespaces development.
 * In a production environment, this would typically include file transports,
 * external logging services (e.g., AWS CloudWatch, LogDNA, Splunk), etc.
 */
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }), // Apply colors to the entire log line
      format, // Use the defined format for the console output
    ),
  }),
  // Example of a file transport (uncomment and configure for production file logging)
  // new winston.transports.File({
  //   filename: 'logs/error.log',
  //   level: 'error',
  //   format: winston.format.combine(winston.format.uncolorize(), format),
  // }),
  // new winston.transports.File({
  //   filename: 'logs/combined.log',
  //   format: winston.format.combine(winston.format.uncolorize(), format),
  // }),
];

/**
 * Initializes the Winston logger instance.
 * Exports this instance for use throughout the application.
 *
 * @type {winston.Logger}
 */
const Logger = winston.createLogger({
  level: level(), // Set the active log level
  levels, // Register custom levels
  format, // Apply the default format
  transports, // Configure log destinations
});

export default Logger;