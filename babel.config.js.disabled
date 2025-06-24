/**
 * @file babel.config.js
 * @description Centralized Babel configuration for the entire Minkalla monorepo.
 * This explicitly defines Babel presets for Jest/TypeScript transformation,
 * addressing persistent SyntaxErrors.
 *
 * @module BabelConfig
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Jest uses Babel internally via ts-jest to transform TypeScript. This explicit config
 * helps resolve complex parsing issues, especially around modern JavaScript features
 * and specific TypeScript syntax, ensuring the test files are correctly transpiled.
 */

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }], // Transpile to current Node.js version
    '@babel/preset-typescript', // Handle TypeScript syntax
  ],
};