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

import jwt, { Secret, SignOptions, JwtPayload, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken'; 
import AppError from './appError'; 

// Environment variables (ensure these are strings at runtime)
const JWT_ACCESS_SECRET: Secret = process.env['JWT_ACCESS_SECRET']!; 
const JWT_REFRESH_SECRET: Secret = process.env['JWT_REFRESH_SECRET']!; 
const JWT_ACCESS_EXPIRATION: string = process.env['JWT_ACCESS_EXPIRATION'] || '15m'; 
const JWT_REFRESH_EXPIRATION: string = process.env['JWT_REFRESH_EXPIRATION'] || '7d';
const JWT_REFRESH_REMEMBER_ME_EXPIRATION: string = process.env['JWT_REFRESH_REMEMBER_ME_EXPIRATION'] || '30d';

/**
 * @function generateTokens
 * @description Generates an Access Token and a Refresh Token for a user.
 * @param {object} payload - The data to include in the token (e.g., userId, email).
 * @param {boolean} [rememberMe=false] - If true, extends refresh token expiration.
 * @returns {{ accessToken: string, refreshToken: string }} - The generated tokens.
 */
export const generateTokens = (payload: object, rememberMe: boolean = false) => {
    // @ts-ignore: TS2769 - No overload matches this call. Bypass stubborn type error for now.
    const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_EXPIRATION } as SignOptions); 

    const refreshTokenExpiration = rememberMe ? JWT_REFRESH_REMEMBER_ME_EXPIRATION : JWT_REFRESH_EXPIRATION;
    // @ts-ignore: TS2769 - No overload matches this call. Bypass stubborn type error for now.
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: refreshTokenExpiration } as SignOptions);

    return { accessToken, refreshToken };
};

/**
 * @function verifyAccessToken
 * @description Verifies the authenticity of an Access Token.
 * @param {string} token - The Access Token to verify.
 * @returns {JwtPayload | string} - The decoded payload if verification is successful.
 * @throws {AppError} - If the token is invalid or expired.
 */
export const verifyAccessToken = (token: string) => {
    try {
        // @ts-ignore: TS2769 - No overload matches this call. Bypass stubborn type error for now.
        return jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload; 
    } catch (error) {
        if (error instanceof TokenExpiredError) { 
            throw new AppError('Access token expired', 401);
        }
        if (error instanceof JsonWebTokenError) { 
            throw new AppError('Invalid access token', 401);
        }
        throw new AppError('Unknown JWT error', 401); 
    }
};

/**
 * @function verifyRefreshToken
 * @description Verifies the authenticity of a Refresh Token.
 * @param {string} token - The Refresh Token to verify.
 * @returns {JwtPayload | string} - The decoded payload if verification is successful.
 * @throws {AppError} - If the token is invalid or expired.
 */
export const verifyRefreshToken = (token: string) => {
    try {
        // @ts-ignore: TS2769 - No overload matches this call. Bypass stubborn type error for now.
        return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload; 
    } catch (error) {
        if (error instanceof TokenExpiredError) { 
            throw new AppError('Refresh token expired', 403); 
        }
        if (error instanceof JsonWebTokenError) { 
            throw new AppError('Invalid refresh token', 403);
        }
        throw new AppError('Unknown JWT error', 403); 
    }
};

// Robust runtime validation for environment variables as recommended by Grok
if (!process.env['JWT_ACCESS_SECRET']) {
    throw new Error("Critical: JWT_ACCESS_SECRET environment variable is not defined. Please set a strong secret in your .env file.");
}
if (!process.env['JWT_REFRESH_SECRET']) {
    throw new Error("Critical: JWT_REFRESH_SECRET environment variable is not defined. Please set a strong secret in your .env file.");
}