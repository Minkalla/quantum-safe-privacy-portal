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

module.exports = {
  preset: 'ts-jest', // Use ts-jest preset for TypeScript support
  testEnvironment: 'node', // Test environment for Node.js applications
  roots: ['<rootDir>/src'], // Look for tests inside the src directory
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'], // Pattern to detect test files
  moduleFileExtensions: ['ts', 'js', 'json', 'node'], // File extensions Jest should look for
  collectCoverage: true, // Collect coverage information
  coverageDirectory: 'coverage', // Output directory for coverage reports
  coverageProvider: 'v8', // Use v8 as coverage provider
  testTimeout: 30000, // <-- NEW: Increase global test timeout to 30 seconds (30000 ms)
  // FIX: ts-jest deprecation warning by moving config out of globals
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // globals: { // This section is replaced by the 'transform' property above
  //   'ts-jest': {
  //     tsconfig: 'tsconfig.json',
  //   },
  // },
};