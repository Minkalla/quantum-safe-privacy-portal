const path = require('path');

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.test.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/index.ts',
    '!src/utils/logger.ts',
    '!src/config/*.ts',
    '!src/middleware/errorHandler.ts',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: path.resolve(__dirname, 'tsconfig.json'),
        diagnostics: {
          ignoreCodes: [2304, 2593, 2769]
        },
        transpileOnly: true,
        compilerOptions: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^bcryptjs$': '<rootDir>/node_modules/bcryptjs',
    "^#apps/backend/package.json$": "<rootDir>/apps/backend/package.json",
    "^#src/portal/portal-backend/package.json$": "<rootDir>/src/portal/portal-backend/package.json"
  },
  roots: [
    "<rootDir>/src", 
    "<rootDir>/test"
  ],
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/test/test-setup.ts'],
  rootDir: './',
};
