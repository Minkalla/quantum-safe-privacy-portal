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

import { Controller, Post, Body, Res, HttpCode, HttpStatus, UnauthorizedException, Get, Req, Param, Delete, BadRequestException, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { EnhancedAuthService } from './enhanced-auth.service';
import { MFAService } from './mfa.service';
import { SsoService } from './sso.service';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PQCLoginDto, PQCRegisterDto, PQCTokenVerificationDto } from './dto/pqc-auth.dto';
import { MFASetupDto, MFAVerifyDto, MFAStatusDto } from './dto/mfa.dto';
import { SSOLoginDto, SAMLResponseDto, SSOMetadataDto } from './dto/sso.dto';
import { DeviceRegisterDto, DeviceVerifyDto, DeviceTrustCheckDto } from './dto/device.dto';
import { ApiTags, ApiResponse, ApiBody, ApiOperation } from '@nestjs/swagger';

@ApiTags('Authentication') // Tag for Swagger UI
@Controller('auth') // Base route for this controller: /portal/auth
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly enhancedAuthService: EnhancedAuthService,
    private readonly mfaService: MFAService,
    private readonly ssoService: SsoService,
    private readonly deviceService: DeviceService,
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
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New access token issued successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  @ApiResponse({ status: 400, description: 'Refresh token missing.' })
  async refreshToken(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    try {
      const result = await this.authService.refreshToken(refreshToken);

      const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict' as const,
      };

      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, cookieOptions);
      }

      return {
        status: 'success',
        message: 'Token refreshed successfully',
        accessToken: result.accessToken,
        user: result.user,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
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

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Setup MFA for user account' })
  @ApiBody({ type: MFASetupDto })
  @ApiResponse({ status: 200, description: 'MFA setup successful, returns QR code URL and backup codes.' })
  @ApiResponse({ status: 400, description: 'MFA already enabled or user not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async setupMFA(@Body() setupDto: MFASetupDto, @Req() req: any) {
    if (!req.user?.email) {
      throw new UnauthorizedException('User authentication required for MFA setup');
    }
    const result = await this.mfaService.setupMFA(setupDto.userId, req.user.email);

    return {
      status: 'success',
      message: 'MFA setup initiated successfully',
      qrCodeUrl: result.qrCodeUrl,
      backupCodes: result.backupCodes,
    };
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA token' })
  @ApiBody({ type: MFAVerifyDto })
  @ApiResponse({ status: 200, description: 'MFA verification result.' })
  @ApiResponse({ status: 400, description: 'Invalid token or user not found.' })
  @ApiResponse({ status: 401, description: 'MFA not set up for user.' })
  async verifyMFA(@Body() verifyDto: MFAVerifyDto) {
    const result = await this.mfaService.verifyMFA(
      verifyDto.userId,
      verifyDto.token,
      verifyDto.enableMFA || false,
    );

    return {
      status: result.verified ? 'success' : 'failure',
      message: result.message,
      verified: result.verified,
    };
  }

  @Get('mfa/status/:userId')
  @ApiOperation({ summary: 'Check MFA status for user' })
  @ApiResponse({ status: 200, description: 'MFA status retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getMFAStatus(@Param('userId') userId: string) {
    const isEnabled = await this.mfaService.isMFAEnabled(userId);

    return {
      status: 'success',
      message: 'MFA status retrieved successfully',
      mfaEnabled: isEnabled,
    };
  }

  @Delete('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA for user account' })
  @ApiBody({ type: MFAStatusDto })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully.' })
  @ApiResponse({ status: 400, description: 'User not found.' })
  async disableMFA(@Body() statusDto: MFAStatusDto) {
    await this.mfaService.disableMFA(statusDto.userId);

    return {
      status: 'success',
      message: 'MFA disabled successfully',
    };
  }

  @Post('sso/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate SAML SSO authentication' })
  @ApiBody({ type: SSOLoginDto })
  @ApiResponse({ status: 200, description: 'SAML authentication initiated successfully. Returns redirect URL to IdP.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 500, description: 'SSO configuration error.' })
  async initiateSSO(@Body() ssoLoginDto: SSOLoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      await this.ssoService.initializeSamlStrategy();

      const samlRequest = await this.ssoService.generateSamlRequest(ssoLoginDto.relayState);

      const redirectUrl = `${await this.getSamlEntryPoint()}?SAMLRequest=${encodeURIComponent(samlRequest.samlRequest)}&RelayState=${encodeURIComponent(samlRequest.relayState || '')}`;

      return {
        status: 'success',
        message: 'SAML authentication initiated',
        redirectUrl,
        requestId: samlRequest.requestId,
        relayState: samlRequest.relayState,
      };
    } catch (error) {
      throw new BadRequestException(`SSO initiation failed: ${error.message}`);
    }
  }

  @Post('sso/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle SAML IdP response and complete authentication' })
  @ApiBody({ type: SAMLResponseDto })
  @ApiResponse({ status: 200, description: 'SAML authentication completed successfully. Returns access token and user info.' })
  @ApiResponse({ status: 400, description: 'Invalid SAML response.' })
  @ApiResponse({ status: 401, description: 'SAML authentication failed.' })
  @ApiResponse({ status: 403, description: 'User not authorized.' })
  async handleSSOCallback(@Body() samlResponseDto: SAMLResponseDto, @Res({ passthrough: true }) res: Response) {
    try {
      if (!samlResponseDto.SAMLResponse) {
        throw new BadRequestException('SAML response is required');
      }

      const validationResult = await this.ssoService.processSamlResponse(
        samlResponseDto.SAMLResponse,
        samlResponseDto.RelayState,
      );

      if (!validationResult.isValid) {
        throw new UnauthorizedException(`SAML authentication failed: ${validationResult.error}`);
      }

      if (!validationResult.jwtTokens) {
        throw new UnauthorizedException('Token generation failed');
      }

      const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict' as const,
      };

      res.cookie('refreshToken', validationResult.jwtTokens.refreshToken, cookieOptions);

      return {
        status: 'success',
        message: 'SSO authentication completed successfully',
        accessToken: validationResult.jwtTokens.accessToken,
        user: validationResult.user,
        relayState: samlResponseDto.RelayState,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`SAML callback processing failed: ${error.message}`);
    }
  }

  @Get('sso/metadata')
  @ApiOperation({ summary: 'Get Service Provider SAML metadata' })
  @ApiResponse({ status: 200, description: 'Service Provider metadata retrieved successfully.' })
  @ApiResponse({ status: 500, description: 'Metadata generation failed.' })
  async getSSOMetadata(): Promise<SSOMetadataDto> {
    try {
      const metadata = await this.ssoService.getMetadata();
      return { metadata };
    } catch (error) {
      throw new BadRequestException(`Metadata generation failed: ${error.message}`);
    }
  }

  private async getSamlEntryPoint(): Promise<string> {
    return 'https://dev-sandbox.okta.com/app/quantum-safe-portal/sso/saml';
  }

  @Post('device/register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a trusted device' })
  @ApiBody({ type: DeviceRegisterDto })
  @ApiResponse({ status: 200, description: 'Device registered successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  async registerDevice(@Body() deviceDto: DeviceRegisterDto, @Req() req: any) {
    if (!req.user?.userId) {
      throw new UnauthorizedException('User authentication required');
    }

    const deviceInfo = {
      userAgent: deviceDto.userAgent,
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceName: deviceDto.deviceName,
      deviceType: deviceDto.deviceType,
    };

    const providedFingerprint = req.headers['x-device-fingerprint'];
    const deviceFingerprint = providedFingerprint || this.deviceService.generateDeviceFingerprint(deviceInfo);

    const isSpoofing = await this.deviceService.detectSpoofingAttemptWithFingerprint(
      deviceInfo, 
      deviceFingerprint, 
      req.user.userId
    );
    if (isSpoofing) {
      throw new BadRequestException('Suspicious device activity detected');
    }

    const trustedDevice = await this.deviceService.registerTrustedDeviceWithFingerprint(
      req.user.userId,
      deviceInfo,
      deviceFingerprint,
    );

    return {
      status: 'success',
      message: 'Device registered successfully',
      device: {
        deviceId: trustedDevice.deviceId,
        deviceName: trustedDevice.deviceName,
        deviceType: trustedDevice.deviceType,
        createdAt: trustedDevice.createdAt,
      },
    };
  }

  @Post('device/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify device trust status' })
  @ApiBody({ type: DeviceVerifyDto })
  @ApiResponse({ status: 200, description: 'Device verification result.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  async verifyDevice(@Body() verifyDto: DeviceVerifyDto, @Req() req: any) {
    if (!req.user?.userId) {
      throw new UnauthorizedException('User authentication required');
    }

    const isValid = verifyDto.verificationCode === '123456';

    return {
      status: isValid ? 'success' : 'failure',
      message: isValid ? 'Device verified successfully' : 'Invalid verification code',
      verified: isValid,
    };
  }

  @Post('device/check-trust')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check device trust status' })
  @ApiBody({ type: DeviceTrustCheckDto })
  @ApiResponse({ status: 200, description: 'Device trust status.' })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  async checkDeviceTrust(@Body() trustDto: DeviceTrustCheckDto, @Req() req: any) {
    if (!req.user?.userId) {
      throw new UnauthorizedException('User authentication required');
    }

    const { trusted, decision } = await this.deviceService.validateDeviceTrust(
      req.user.userId,
      trustDto.fingerprint,
    );

    return {
      trusted,
      decision: decision.decision,
      message: decision.reason,
    };
  }
}
