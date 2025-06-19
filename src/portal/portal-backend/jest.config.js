/**
 * @file jest.config.js
 * @description Jest configuration file for the Quantum-Safe Privacy Portal Backend.
 * Configures Jest to work with TypeScript using ts-jest, sets up test environments,
 * and defines patterns for test file discovery.
 *
 * @module JestConfig
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This configuration ensures our automated tests are run efficiently and reliably,
 * aligning with our "no regrets" quality standards. Automated testing is crucial for
 * preventing regressions and maintaining code integrity in a complex project.
 *
 * @see {@link https://jestjs.io/docs/configuration|Jest Configuration Docs}
 * @see {@link https://kulshekhar.github.io/ts-jest/docs/getting-started/presets#advanced}
 */

// NEW: Import path module to resolve absolute paths for presets
const path = require('path');

module.exports = {
  // NEW: Explicitly specify path to ts-jest preset relative to this config file
  // __dirname refers to the directory where jest.config.js is (src/portal/portal-backend)
  // We go up two levels (../../) to reach the monorepo root's node_modules.
  preset: path.resolve(__dirname, '../../node_modules/ts-jest/preset'), // <-- IMPORTANT CHANGE
  testEnvironment: 'node',
  roots: ['<rootDir>/src'], // Look for tests inside the src directory relative to this config
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testTimeout: 30000,
  // FIX: ts-jest deprecation warning by moving config out of globals
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // REMOVED: moduleDirectories as preset is now explicitly path'd
};