/**
 * @file jest.config.js
 * @description Centralized Jest configuration file for the entire Minkalla monorepo.
 * Configures Jest to work with TypeScript using ts-jest, sets up test environments,
 * and defines patterns for test file discovery across multiple packages.
 *
 * @module JestConfig
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This centralized configuration ensures consistent testing across all monorepo packages.
 * By placing it at the root, Jest's module resolution is simplified, preventing "preset not found" errors.
 * It uses a `projects` array or `testMatch` patterns to target specific packages.
 * Automated testing is crucial for preventing regressions and maintaining code integrity in a complex project.
 *
 * Updates in June 2025:
 * - Integrated `globalSetup` and `globalTeardown` scripts for robust test environment lifecycle management,
 * especially for `mongodb-memory-server` and Express app isolation.
 * - Increased `testTimeout` to accommodate potential database interaction delays.
 * - Refined `collectCoverageFrom` paths to exclude non-core-logic files from coverage reporting.
 * - Maintained explicit `ts-jest` transform configuration and `moduleNameMapper` for `bcryptjs`
 * as previously established "CRITICAL FIXES" and best practices.
 *
 * @see {@link https://jestjs.io/docs/configuration|Jest Configuration Docs}
 * @see {@link https://kulshekhar.github.io/ts-jest/docs/getting-started#using-typescript}
 * @see {@link https://jestjs.io/docs/configuration#projects-arraystring--projectconfig|Jest Projects}
 */

// Import path module to resolve absolute paths
const path = require('path');

module.exports = {
  // The test environment that will be used for testing. 'node' environment is suitable for backend tests.
  testEnvironment: 'node',

  // Define roots relative to the monorepo root. This helps Jest locate source files.
  roots: [
    '<rootDir>/src/portal/portal-backend/src', // Look for backend tests
    // Add other package roots here as they are developed, e.g., '<rootDir>/src/portal/portal-frontend/src'
  ],

  // Patterns to match test files. These patterns are inclusive.
  testMatch: [
    '**/__tests__/**/*.ts', // Standard Jest convention for tests in __tests__ folders
    '**/?(*.)+(spec|test).ts', // Matches .spec.ts or .test.ts files
  ],

  // File extensions that Jest should look for.
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],

  // Configuration for code coverage reporting.
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8', // Using v8 for performance and accuracy
  // An array of glob patterns indicating a set of files for which coverage information should be collected.
  collectCoverageFrom: [
    'src/portal/portal-backend/src/**/*.ts',
    // Exclude specific files/patterns from coverage reporting that are not core logic or are tested implicitly.
    '!src/portal/portal-backend/src/server.ts', // Contains server start logic, not unit testable directly
    '!src/portal/portal-backend/src/index.ts', // Typically exports the app instance, not logic for coverage
    '!src/portal/portal-backend/src/utils/logger.ts', // Logging utility, often excluded
    '!src/portal/portal-backend/src/config/*.ts', // Configuration files
    '!src/portal/portal-backend/src/middleware/errorHandler.ts', // Error handling middleware, test separately if complex
  ],

  // CRITICAL FIX: Configure ts-jest directly via 'transform' and FORCE esModuleInterop.
  // This ensures TypeScript files are correctly transpiled before tests run.
  transform: {
    // Apply ts-jest transformer to .ts and .tsx files.
    '^.+\\.(ts|tsx)$': [
      path.resolve(__dirname, 'node_modules/ts-jest'), // Explicit path ensures Jest finds ts-jest
      {
        // Explicitly tell ts-jest which tsconfig.json to use for this project.
        tsconfig: path.resolve(__dirname, 'src/portal/portal-backend/tsconfig.json'),
        // CRITICAL NEW ADDITION: Force esModuleInterop directly via compilerOptions.
        // This is essential for proper module import/export behavior in Node.js environments.
        compilerOptions: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  // Map 'bcryptjs' module to its correct nested location for Jest's resolution.
  // This is necessary to resolve native module issues for bcryptjs in testing.
  moduleNameMapper: {
    '^bcryptjs$': '<rootDir>/src/portal/portal-backend/node_modules/bcryptjs',
  },

  // Maximum time an individual test can run (in milliseconds).
  // Increased to 60 seconds to accommodate database setup and teardown within tests.
  testTimeout: 60000,

  // Global setup and teardown scripts run once before and after all test suites respectively.
  // Essential for managing shared resources like in-memory databases.
  globalSetup: path.resolve(__dirname, './jest-global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './jest-global-teardown.ts'),

  // Defines the root directory for Jest. This is crucial for monorepos,
  // as it allows Jest to resolve paths correctly from the project root.
  rootDir: './',
};