// src/portal/portal-backend/src/tests/docs.test.ts
/**
 * @file docs.test.ts
 * @description Integration tests for the API documentation (Swagger UI) endpoint.
 * This test verifies that the Swagger UI is correctly served and accessible.
 *
 * @module DocsTests
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Ensures the documentation endpoint is functional and adheres to accessibility requirements.
 * This contributes to the "no regrets" quality by validating critical developer-facing infrastructure.
 */

import request from 'supertest';
import app from '../index'; // Import the Express app instance

describe('API Documentation Endpoint', () => {
  let originalNodeEnv: string | undefined;
  let originalEnableSwaggerDocs: string | undefined;

  // Store original env vars and set specific ones for this test suite
  beforeAll(() => {
    originalNodeEnv = process.env['NODE_ENV'];
    originalEnableSwaggerDocs = process.env['ENABLE_SWAGGER_DOCS'];
    process.env['NODE_ENV'] = 'test'; // Ensure we're in a test environment
    process.env['ENABLE_SWAGGER_DOCS'] = 'true'; // Explicitly enable docs for this test
  });

  // Restore original env vars after all tests in this suite are done
  afterAll(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
    process.env['ENABLE_SWAGGER_DOCS'] = originalEnableSwaggerDocs;
  });

  // Test to ensure the /api-docs endpoint is accessible and returns HTML
  it('should serve Swagger UI documentation at /api-docs/', async () => {
    // MODIFIED: Request with trailing slash to hit the canonical path directly
    const res = await request(app).get('/api-docs/'); 

    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('<title>Swagger UI</title>'); 
    expect(res.text).toContain('swagger-ui-bundle.js');
    expect(res.headers['content-type']).toContain('text/html'); 
  });
});