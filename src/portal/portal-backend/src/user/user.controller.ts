/**
 * @file user.controller.ts
 * @description NestJS controller for user profile operations.
 * This controller handles user profile retrieval and updates,
 * demonstrating protected route implementation with JWT authentication.
 *
 * @module UserController
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Implements protected routes using AuthMiddleware for JWT validation.
 * Provides endpoints for user profile management and serves as a reference
 * implementation for WBS 1.12 protected route requirements.
 */

import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

interface UserProfileDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  preferences?: {
    notifications: boolean;
    theme: string;
  };
}

@ApiTags('user')
@Controller('portal/user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor() {}

  /**
   * Get user profile information
   * Protected endpoint that requires valid JWT token
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token.' })
  async getProfile(@Req() req: AuthenticatedRequest) {
    const { userId, email } = req.user!;

    const userProfile = {
      id: userId,
      email,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1-555-0123',
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date(),
      preferences: {
        notifications: true,
        theme: 'light',
      },
      pqcEnabled: true,
    };

    return {
      status: 'success',
      message: 'User profile retrieved successfully',
      data: userProfile,
    };
  }

  /**
   * Update user profile information
   * Protected endpoint that requires valid JWT token
   */
  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token.' })
  @ApiResponse({ status: 400, description: 'Invalid profile data.' })
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() profileData: UserProfileDto) {
    const { userId, email } = req.user!;

    const updatedProfile = {
      id: userId,
      email,
      ...profileData,
      updatedAt: new Date(),
    };

    return {
      status: 'success',
      message: 'User profile updated successfully',
      data: updatedProfile,
    };
  }

  /**
   * Get user settings
   * Another protected endpoint for demonstration
   */
  @Get('settings')
  @ApiOperation({ summary: 'Get user settings' })
  @ApiResponse({ status: 200, description: 'User settings retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token.' })
  async getSettings(@Req() req: AuthenticatedRequest) {
    const { userId } = req.user!;

    const userSettings = {
      userId,
      security: {
        twoFactorEnabled: false,
        sessionTimeout: 15, // minutes
      },
      privacy: {
        dataSharing: false,
        analytics: true,
      },
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
    };

    return {
      status: 'success',
      message: 'User settings retrieved successfully',
      data: userSettings,
    };
  }
}
