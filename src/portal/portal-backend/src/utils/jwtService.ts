// src/portal/portal-backend/src/utils/jwtService.ts
/**
 * @file jwtService.ts
 * @description Utility for handling JSON Web Tokens (JWTs), including creation of Access Tokens
 * and Refresh Tokens, and their verification. This modular service supports the dual-token strategy
 * for enhanced security and user experience, aligning with "no regrets" principles.
 *
 * @module JwtService
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This service is designed to be flexible for future integration with Post-Quantum Cryptography (PQC)
 * through QynAuth, ensuring that token generation can incorporate PQC-verified identities.
 *
 * @see {@link https://www.npmjs.com/package/jsonwebtoken|jsonwebtoken}
 */

import jwt from 'jsonwebtoken'; // MODIFIED: Removed { Secret } import
import AppError from './appError'; 

// Ensure JWT secrets and expiration times are loaded from environment variables
// These should be long, random strings for production
const JWT_ACCESS_SECRET = process.env['JWT_ACCESS_SECRET'] || 'supersecretaccesskey'; // Fallback for dev, use .env in prod
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'supersecretrefreshkey'; // Fallback for dev, use .env in prod

// Expiration times for tokens
// Access tokens should be short-lived for security
const JWT_ACCESS_EXPIRATION = process.env['JWT_ACCESS_EXPIRATION'] || '15m'; // 15 minutes
// Refresh tokens are longer-lived for convenience
const JWT_REFRESH_EXPIRATION = process.env['JWT_REFRESH_EXPIRATION'] || '7d'; // 7 days
// Remember Me expiration
const JWT_REFRESH_REMEMBER_ME_EXPIRATION = process.env['JWT_REFRESH_REMEMBER_ME_EXPIRATION'] || '30d'; // 30 days if rememberMe

/**
 * @function generateTokens
 * @description Generates an Access Token and a Refresh Token for a user.
 * @param {object} payload - The data to include in the token (e.g., userId, email).
 * @param {boolean} [rememberMe=false] - If true, extends refresh token expiration.
 * @returns {{ accessToken: string, refreshToken: string }} - The generated tokens.
 */
export const generateTokens = (payload: object, rememberMe: boolean = false) => {
    // MODIFIED: Direct cast to 'any' for the secret
    const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET as any, { expiresIn: JWT_ACCESS_EXPIRATION });

    const refreshTokenExpiration = rememberMe ? JWT_REFRESH_REMEMBER_ME_EXPIRATION : JWT_REFRESH_EXPIRATION;
    // MODIFIED: Direct cast to 'any' for the secret
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET as any, { expiresIn: refreshTokenExpiration });

    return { accessToken, refreshToken };
};

/**
 * @function verifyAccessToken
 * @description Verifies the authenticity of an Access Token.
 * @param {string} token - The Access Token to verify.
 * @returns {object | string} - The decoded payload if verification is successful.
 * @throws {AppError} - If the token is invalid or expired.
 */
export const verifyAccessToken = (token: string) => {
    try {
        // MODIFIED: Direct cast to 'any' for the secret
        return jwt.verify(token, JWT_ACCESS_SECRET as any);
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new AppError('Access token expired', 401);
        }
        throw new AppError('Invalid access token', 401);
    }
};

/**
 * @function verifyRefreshToken
 * @description Verifies the authenticity of a Refresh Token.
 * @param {string} token - The Refresh Token to verify.
 * @returns {object | string} - The decoded payload if verification is successful.
 * @throws {AppError} - If the token is invalid or expired.
 */
export const verifyRefreshToken = (token: string) => {
    try {
        // MODIFIED: Direct cast to 'any' for the secret
        return jwt.verify(token, JWT_REFRESH_SECRET as any);
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new AppError('Refresh token expired', 403); 
        }
        throw new AppError('Invalid refresh token', 403);
    }
};

// Added environment variable checks for secrets
if (!JWT_ACCESS_SECRET || JWT_ACCESS_SECRET === 'supersecretaccesskey') {
    console.warn("WARNING: JWT_ACCESS_SECRET is not set or using default. Please set a strong secret in your .env for production.");
}
if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET === 'supersecretrefreshkey') {
    console.warn("WARNING: JWT_REFRESH_SECRET is not set or using default. Please set a strong secret in your .env for production.");
}