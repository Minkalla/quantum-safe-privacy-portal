/**
 * @file branding.controller.ts
 * @description NestJS controller for branding configuration endpoints.
 * This controller handles branding configuration retrieval and updates,
 * providing secure access to white-label branding settings for authenticated users.
 *
 * @module BrandingController
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Implements protected routes using JwtAuthGuard for secure access.
 * Provides endpoints for branding configuration management and serves as
 * the API layer for WBS 1.16 white-label branding requirements.
 */

import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandingService, BrandingConfig } from './branding.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

@ApiTags('branding')
@Controller('portal/branding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  /**
   * Get branding configuration for authenticated user
   * Protected endpoint that requires valid JWT token
   */
  @Get('config')
  @ApiOperation({ summary: 'Get branding configuration for authenticated user' })
  @ApiResponse({ status: 200, description: 'Branding configuration retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getBrandingConfig(@Req() req: AuthenticatedRequest) {
    const { userId } = req.user!;
    
    const brandingConfig = await this.brandingService.getBrandingConfig(userId);
    
    return {
      status: 'success',
      message: 'Branding configuration retrieved successfully',
      data: brandingConfig,
    };
  }

  /**
   * Update branding configuration for authenticated user
   * Protected endpoint that requires valid JWT token
   */
  @Put('config')
  @ApiOperation({ summary: 'Update branding configuration for authenticated user' })
  @ApiResponse({ status: 200, description: 'Branding configuration updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token.' })
  @ApiResponse({ status: 400, description: 'Invalid branding configuration data.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateBrandingConfig(@Req() req: AuthenticatedRequest, @Body() brandingData: BrandingConfig) {
    const { userId } = req.user!;
    
    const updatedConfig = await this.brandingService.updateBrandingConfig(userId, brandingData);
    
    return {
      status: 'success',
      message: 'Branding configuration updated successfully',
      data: updatedConfig,
    };
  }
}
