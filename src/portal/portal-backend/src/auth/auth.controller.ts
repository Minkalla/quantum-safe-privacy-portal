// src/portal/portal-backend/src/auth/auth.controller.ts
/**
 * @file auth.controller.ts
 * @description NestJS controller for authentication-related operations.
 * Handles HTTP requests for user registration and login, utilizing AuthService for business logic.
 *
 * @module AuthController
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This controller uses NestJS decorators for routing and dependency injection,
 * ensuring clean separation of concerns and maintainability. It integrates Swagger
 * for API documentation.
 */

import { Controller, Post, Body, Res, HttpCode, HttpStatus, UnauthorizedException, Get } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { EnhancedAuthService } from './enhanced-auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PQCLoginDto, PQCRegisterDto, PQCTokenVerificationDto } from './dto/pqc-auth.dto';
import { ApiTags, ApiResponse, ApiBody, ApiOperation } from '@nestjs/swagger';

@ApiTags('Authentication') // Tag for Swagger UI
@Controller('auth') // Base route for this controller: /portal/auth
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly enhancedAuthService: EnhancedAuthService,
  ) {}

  /**
   * @swagger
   * /portal/auth/register:
   * post:
   * summary: Register a new user account
   * description: Creates a new user account with provided email and password. Ensures password complexity and email uniqueness.
   * requestBody:
   * required: true
   * content:
   * application/json:
   * schema:
   * $ref: '#/components/schemas/UserCredentials'
   * responses:
   * 201:
   * description: User successfully registered.
   * content:
   * application/json:
   * schema:
   * type: object
   * properties:
   * message:
   * type: string
   * example: User registered successfully
   * userId:
   * type: string
   * example: 60d5ec49f1a23c001c8a4d7d
   * email:
   * type: string
   * example: newuser@minkalla.com
   * 400:
   * description: Validation failed (e.g., weak password, invalid email format, missing fields).
   * content:
   * application/json:
   * schema:
   * $ref: '#/components/schemas/ErrorResponse'
   * 409:
   * description: Email already registered.
   * content:
   * application/json:
   * schema:
   * $ref: '#/components/schemas/ErrorResponse'
   * 429:
   * description: Too many registration attempts.
   * content:
   * application/json:
   * schema:
   * $ref: '#/components/schemas/ErrorResponse'
   * security: []
   * x-compliance:
   * - NIST SP 800-53:IA-5 (Authenticator Management)
   * - AC-7 (Unsuccessful Login Attempts)
   * - CM-3 (Configuration Management)
   * - PCI DSS:2.2 (Secure Configurations)
   * - 8.2 (Authentication Controls)
   * - ISO 27001:A.9.2.1 (User Registration)
   * - A.10.1.1 (Control of Operational Software)
   * x-pii-data:
   * - email
   * - password (during input validation)
   * - IP address (for rate limiting)
   * x-threat-model:
   * - Account Enumeration
   * - Weak Credential Attacks
   * - Brute-Force Registration
   * - Rate Limiting
   * - Strong Password Policy
   * - DTO Validation
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts.' })
  async register(@Body() registerDto: RegisterDto) {
    const { userId, email } = await this.authService.register(registerDto);
    return { message: 'User registered successfully', userId, email };
  }

  /**
   * @swagger
   * /portal/auth/login:
   * post:
   * summary: Authenticate user and issue access/refresh tokens
   * description: Logs in a user with provided credentials. On successful authentication, issues a short-lived access token in the response body and a long-lived refresh token in an HTTP-only, secure, SameSite=Strict cookie. Implements brute-force protection with account lockout.
   * requestBody:
   * required: true
   * content:
   * application/json:
   * schema:
   * $ref: '#/components/schemas/UserCredentials'
   * responses:
   * 200:
   * description: Successful authentication, returns access token. Refresh token set as HTTP-only cookie.
   * content:
   * application/json:
   * schema:
   * type: object
   * properties:
   * status: { type: 'string', example: 'success' }
   * message: { type: 'string', example: 'Logged in successfully' }
   * accessToken: { type: 'string', description: 'Short-lived JWT for subsequent authenticated API requests.' }
   * user:
   * type: object
   * properties:
   * id: { type: 'string', example: '60d5ec49f1a23c001c8a4d7d' }
   * email: { type: 'string', example: 'testuser@minkalla.com' }
   * headers:
   * Set-Cookie:
   * schema:
   * type: string
   * example: refreshToken=eyJhbGciOiJIUzI1Ni...; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=Fri, 27 Jun 2025 10:00:00 GMT
   * description: The refresh token is set as an HTTP-only, secure, SameSite=Strict cookie.
   * 400:
   * description: Validation failed (e.g., missing email/password).
   * content:
   * application/json:
   * schema:
   * $ref: '#/components/schemas/ErrorResponse'
   * 401:
   * description: Invalid credentials (e.g., incorrect password, user not found).
   * content:
   * application/json:
   * schema:
   * $ref: '#/components/schemas/ErrorResponse'
   * 403:
   * description: Account locked due to too many failed attempts.
   * content:
   * application/json:
   * schema:
   * $ref: '#/components/schemas/ErrorResponse'
   * 429:
   * description: Too many login attempts.
   * content:
   * application/json:
   * schema:
   * $ref: '#/components/schemas/ErrorResponse'
   * security: []
   * x-compliance:
   * - NIST SP 800-53:AU-12 (Audit Generation)
   * - AC-7 (Unsuccessful Login Attempts)
   * - IA-2(1) (Centralized Account Management)
   * - IA-5(1) (Authenticated Access)
   * - SC-5 (Denial of Service Protection)
   * - PCI DSS:8.1.5 (Authentication Controls)
   * - 10.2.1 (Audit Trails)
   * - ISO 27001:A.9.2.3 (Privileged Access Management)
   * - A.10.1.1 (Control of Operational Software)
   * x-pii-data:
   * - email
   * - password (during input validation)
   * - IP address (for rate limiting)
   * x-threat-model:
   * - Brute-Force
   * - Credential Stuffing
   * - Token Hijacking (via insecure Refresh Token handling)
   * - Rate Limiting
   * - Strong Password Policy
   * - DTO Validation
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and issue access/refresh tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Successful authentication, returns access token. Refresh token set as HTTP-only cookie.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 403, description: 'Account locked.' })
  @ApiResponse({ status: 429, description: 'Too many login attempts.' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sqlInjectionPatterns = [
      /('|(\\'))/i,
      /(;|\\;)/i,
      /(--|\\--)/i,
      /(\bOR\b|\bAND\b)/i,
      /(\bUNION\b|\bSELECT\b)/i,
      /(\bINSERT\b|\bUPDATE\b|\bDELETE\b)/i,
      /(\bDROP\b|\bCREATE\b|\bALTER\b)/i,
      /(\/\*|\*\/)/i,
      /(\bEXEC\b|\bEXECUTE\b)/i,
    ];

    const containsSqlInjection = (input: string) => {
      return sqlInjectionPatterns.some(pattern => pattern.test(input));
    };

    if (!emailRegex.test(loginDto.email) ||
        containsSqlInjection(loginDto.email) ||
        containsSqlInjection(loginDto.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken, user } = await this.authService.login(loginDto);

    const cookieOptions = {
      expires: new Date(Date.now() + (loginDto.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)),
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production', // CHANGED: Access with bracket notation
      sameSite: 'strict' as const,
    };
    res.cookie('refreshToken', refreshToken, cookieOptions);

    const response: any = { status: 'success', message: 'Logged in successfully', accessToken, user };

    if (loginDto.rememberMe && refreshToken) {
      response.refreshToken = refreshToken;
    }

    return response;
  }

  @Post('pqc/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user with PQC support' })
  @ApiBody({ type: PQCRegisterDto })
  @ApiResponse({ status: 201, description: 'User successfully registered with PQC capabilities.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  async registerPQC(@Body() registerDto: PQCRegisterDto) {
    const result = await this.enhancedAuthService.registerWithPQC(registerDto);
    return {
      message: 'User registered successfully with PQC support',
      ...result,
    };
  }

  @Post('pqc/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with hybrid PQC/Classical authentication' })
  @ApiBody({ type: PQCLoginDto })
  @ApiResponse({ status: 200, description: 'Successful authentication with PQC or classical fallback.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 403, description: 'Account locked.' })
  async loginPQC(@Body() loginDto: PQCLoginDto, @Res({ passthrough: true }) res: Response) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sqlInjectionPatterns = [
      /('|(\\'))/i,
      /(;|\\;)/i,
      /(--|\\--)/i,
      /(\bOR\b|\bAND\b)/i,
      /(\bUNION\b|\bSELECT\b)/i,
      /(\bINSERT\b|\bUPDATE\b|\bDELETE\b)/i,
      /(\bDROP\b|\bCREATE\b|\bALTER\b)/i,
      /(\/\*|\*\/)/i,
      /(\bEXEC\b|\bEXECUTE\b)/i,
    ];

    const containsSqlInjection = (input: string) => {
      return sqlInjectionPatterns.some(pattern => pattern.test(input));
    };

    if (!emailRegex.test(loginDto.email) ||
        containsSqlInjection(loginDto.email) ||
        containsSqlInjection(loginDto.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const result = await this.enhancedAuthService.loginWithHybridAuth(loginDto);

    const cookieOptions = {
      expires: new Date(Date.now() + (loginDto.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)),
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict' as const,
    };

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
    }

    return {
      status: 'success',
      message: 'Logged in successfully with PQC support',
      ...result,
    };
  }

  @Post('pqc/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify PQC-signed token' })
  @ApiBody({ type: PQCTokenVerificationDto })
  @ApiResponse({ status: 200, description: 'Token verification result.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Invalid token.' })
  @ApiResponse({ status: 403, description: 'Token expired.' })
  @ApiResponse({ status: 401, description: 'Signature verification failed.' })
  async verifyPQCToken(@Body() verificationDto: PQCTokenVerificationDto) {
    const result = await this.enhancedAuthService.verifyPQCToken(verificationDto);

    return {
      message: 'Token verification completed',
      ...result,
    };
  }

  @Get('pqc/config')
  @ApiOperation({ summary: 'Get current hybrid authentication configuration' })
  @ApiResponse({ status: 200, description: 'Current hybrid authentication configuration.' })
  getHybridConfig() {
    return {
      message: 'Current hybrid authentication configuration',
      config: this.enhancedAuthService.getHybridConfig(),
    };
  }
}
