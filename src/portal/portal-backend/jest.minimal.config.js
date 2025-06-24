const path = require('path');

module.exports = {
  testEnvironment: 'node',
  
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
  ],

  moduleFileExtensions: ['ts', 'js'],

  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: path.resolve(__dirname, 'tsconfig.json'),
      isolatedModules: true,
      useESM: false,
    }],
  },

  transformIgnorePatterns: [
    'node_modules/'
  ],

  testTimeout: 30000,
  rootDir: './',
  
  preset: undefined,
  extensionsToTreatAsEsm: [],
};
