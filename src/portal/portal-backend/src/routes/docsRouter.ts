// src/portal/portal-backend/src/routes/docsRouter.ts
/**
 * @file docsRouter.ts
 * @description Express router for serving the interactive Swagger UI API documentation.
 * This route makes the OpenAPI specification accessible via a web interface.
 *
 * @module DocsRouter
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Aligns with "no regrets" quality by providing discoverable and usable API documentation.
 * The endpoint should be conditionally exposed in production environments for security.
 */

import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swaggerConfig'; // Import the generated spec

const docsRouter = Router();

// Route to serve the Swagger UI assets
docsRouter.use('/', swaggerUi.serve);

// Route to setup and display the Swagger UI
// MODIFIED: Use 'as any' to bypass stubborn TypeScript type checking for swaggerUi.setup options.
docsRouter.get('/', swaggerUi.setup(swaggerSpec, {
  explorer: true, // Enable the search bar in Swagger UI
  customCssUrl: '/swagger-ui.css', // Future: custom CSS for branding
  customJsUrl: '/swagger-ui-bundle.js', // Future: custom JS for enhancements
  swaggerOptions: {
    persistAuthorization: true, // Keep API Key/Bearer Token across browser sessions
    // displayRequestDuration: true, // Show execution time for requests
    // filter: true, // Enable filtering of operations
  },
} as any)); // <--- Added 'as any' here

export default docsRouter;