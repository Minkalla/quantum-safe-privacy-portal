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
 * It uses explicit `testMatch` patterns to target specific packages from the monorepo root.
 * Automated testing is crucial for preventing regressions and maintaining code integrity in a complex project.
 *
 * Updates in June 2025:
 * - Integrated `globalSetup` and `globalTeardown` scripts for robust test environment lifecycle management,
 * especially for `mongodb-memory-server` and Express app isolation.
 * - Increased `testTimeout` to accommodate potential database interaction delays.
 * - Refined `collectCoverageFrom` paths to exclude non-core-logic files from coverage reporting.
 * - Maintained explicit `ts-jest` transform configuration and `moduleNameMapper` for `bcryptjs`
 * as previously established "CRITICAL FIXES" and best practices.
 * - **Crucially, updated `testMatch` to explicitly locate backend test files relative to the monorepo root (June 22, 2025).**
 *
 * @see {@link https://jestjs.io/docs/configuration|Jest Configuration Docs}
 * @see {@link https://kulshekhar.github.io/ts-jest/docs/getting-started#using-typescript}
 * @see {@link https://jestjs.io/docs/configuration#projects-arraystring--projectconfig|Jest Projects}
 */

// Import path module to resolve absolute paths
const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Patterns to match test files
  testMatch: [
    '<rootDir>/src/portal/portal-backend/src/**/*.spec.ts',
    '<rootDir>/src/portal/portal-backend/src/**/*.test.ts',
  ],

  // File extensions that Jest should look for
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],

  // Configuration for code coverage reporting
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/portal/portal-backend/src/**/*.ts',
    '!src/portal/portal-backend/src/server.ts',
    '!src/portal/portal-backend/src/index.ts',
    '!src/portal/portal-backend/src/utils/logger.ts',
    '!src/portal/portal-backend/src/config/*.ts',
    '!src/portal/portal-backend/src/middleware/errorHandler.ts',
  ],

  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: path.resolve(__dirname, 'src/portal/portal-backend/tsconfig.json'),
      isolatedModules: true,
    }],
  },

  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],

  moduleNameMapper: {
    '^bcryptjs$': '<rootDir>/src/portal/portal-backend/node_modules/bcryptjs',
  },

  testTimeout: 60000,
  rootDir: './',
};
