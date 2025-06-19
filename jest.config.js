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
 * @see {@link https://jestjs.io/docs/configuration|Jest Configuration Docs}
 * @see {@link https://kulshekhar.github.io/ts-jest/docs/getting-started#using-typescript}
 * @see {@link https://jestjs.io/docs/configuration#projects-arraystring--projectconfig|Jest Projects}
 */

// Import path module to resolve absolute paths
const path = require('path');

module.exports = {
  testEnvironment: 'node',
  // We are defining roots relative to the monorepo root
  roots: [
    '<rootDir>/src/portal/portal-backend/src', // Look for backend tests
  ],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testTimeout: 30000,
  // FIX: Configure ts-jest directly via 'transform' with explicit path to its nested location
  transform: {
    '^.+\\.tsx?$': [
      path.resolve(__dirname, 'src/portal/portal-backend/node_modules/ts-jest'),
      {
        tsconfig: path.resolve(__dirname, 'src/portal/portal-backend/tsconfig.json'),
      },
    ],
  },
  // Map 'bcryptjs' module to its correct nested location for Jest's resolution
  moduleNameMapper: {
    '^bcryptjs$': path.resolve(__dirname, 'src/portal/portal-backend/node_modules/bcryptjs'),
  },
};