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
 * Automated testing is crucial for preventing regressions and maintaining code integrity.
 *
 * @see {@link https://jestjs.io/docs/configuration|Jest Configuration Docs}
 * @see {@link https://kulshekhar.github.io/ts-jest/docs/getting-started/presets#advanced}
 * @see {@link https://jestjs.io/docs/configuration#projects-arraystring--projectconfig|Jest Projects}
 */

module.exports = {
  preset: 'ts-jest', // ts-jest is now directly resolvable from root node_modules
  testEnvironment: 'node',
  // We are defining roots relative to the monorepo root
  // This tells Jest where to look for tests within our packages
  roots: [
    '<rootDir>/src/portal/portal-backend/src', // Look for backend tests
    // Add other package test roots here as they are developed
  ],
  // Define specific test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testTimeout: 30000, // Global timeout for all tests
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/src/portal/portal-backend/tsconfig.json' }], // Reference specific tsconfig
  },
  // When running tests from the monorepo root, we need to ensure modules are resolved correctly
  // This is especially important for imports like `../models/User` from `authController.ts`
  moduleNameMapper: {
    // Map paths within portal-backend for correct module resolution during tests
    '^@portal-backend/(.*)$': '<rootDir>/src/portal/portal-backend/src/$1',
  },
  // Jest will now find ts-jest and other modules in the root node_modules by default
  // No need for moduleDirectories or explicit path.resolve(__dirname, '../../node_modules') here
};