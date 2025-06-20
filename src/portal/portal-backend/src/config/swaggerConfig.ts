// src/portal/portal-backend/src/config/swaggerConfig.ts
/**
 * @file swaggerConfig.ts
 * @description Centralized OpenAPI (Swagger) configuration for the Quantum-Safe Privacy Portal Backend.
 * This file defines API metadata, security schemes, and reusable schemas, and configures swagger-jsdoc
 * to generate the OpenAPI specification from JSDoc comments in the codebase.
 *
 * @module SwaggerConfig
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Aligns with "no regrets" quality by providing machine-readable API contracts.
 * Supports compliance requirements (NIST SP 800-53, ISO 27001) by standardizing documentation.
 * Enables future API governance and automated testing.
 */

import swaggerJSDoc from 'swagger-jsdoc';
import pkg from '../../package.json'; // Dynamically import package.json for versioning

const swaggerDefinition = {
  openapi: '3.0.0', // Specify the OpenAPI version
  info: {
    title: 'Minkalla Quantum-Safe Privacy Portal API',
    version: pkg.version, // Dynamically pulled from backend's package.json
    description: 'Secure, quantum-resistant backend services enabling compliant user consent and data rights management for the digital economy. This API is designed for unparalleled quality and ethical data monetization.',
    contact: {
      name: 'Minkalla API Team',
      email: 'api-support@minkalla.com',
      url: 'https://minkalla.com/support' 
    },
    license: {
      name: 'MIT License',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    { url: 'http://localhost:8080', description: 'Local Development Server' },
    { url: 'https://api.minkalla.com', description: 'Production API Gateway' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT', 
        description: 'Authentication via short-lived Access Token (JWT).'
      },
      cookieAuth: { 
        type: 'apiKey', 
        in: 'cookie',
        name: 'refreshToken',
        description: 'Authentication via long-lived Refresh Token (HTTP-only cookie).'
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', description: 'HTTP Status Code (e.g., 400, 401, 403, 404, 429, 500)' },
          message: { type: 'string', description: 'A concise, user-friendly error message.' },
          // Optional additional details for development/debugging, excluded from production by default
          // errors: {
          //   type: 'array',
          //   description: 'Array of specific validation errors or other details.',
          //   items: { type: 'object' }
          // }
        },
        required: ['statusCode', 'message'],
        example: { statusCode: 400, message: 'Invalid input data. Please check your request.' }
      },
      UserCredentials: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', description: 'The user\'s email address. Must be a valid email format.' },
          password: { type: 'string', format: 'password', description: 'The user\'s password. Must be at least 8 characters long, contain uppercase, lowercase, numbers, and special characters.' },
        },
        required: ['email', 'password'],
        example: { email: 'testuser@minkalla.com', password: 'StrongPassword123!' }
      },
      UserLoginResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', description: 'Short-lived JWT for subsequent authenticated API requests.' },
          expiresIn: { type: 'number', description: 'Lifetime of the access token in seconds.' },
        },
        required: ['accessToken', 'expiresIn'],
        example: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5c...', expiresIn: 3600 }
      },
      UserRegisteredResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Confirmation message for successful registration.' },
          userId: { type: 'string', description: 'Unique identifier for the newly registered user.' }
        },
        required: ['message', 'userId'],
        example: { message: 'User registered successfully.', userId: '60d5ec49f1a23c001c8a4d7d' }
      }
    },
  },
  tags: [ 
    { name: 'Authentication', description: 'APIs for user registration, login, and session management.' },
    // Add other high-level feature tags here as they are developed:
    // { name: 'Data Rights', description: 'Endpoints for managing user consent and data access requests.' },
    // { name: 'Data Valuation', description: 'APIs for ethical data monetization and valuation insights.' },
  ]
};

const options = {
  swaggerDefinition,
  apis: [
    './src/routes/**/*.ts', 
    './src/controllers/**/*.ts', 
  ],
};

export const swaggerSpec = swaggerJSDoc(options);