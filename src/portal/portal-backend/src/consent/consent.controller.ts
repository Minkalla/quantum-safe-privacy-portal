/**
 * @file consent.controller.ts
 * @description NestJS controller for consent management endpoints.
 * Handles HTTP requests for consent creation and retrieval, ensuring GDPR compliance.
 *
 * @module ConsentController
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Provides REST API endpoints for consent management with proper validation,
 * authentication, and comprehensive API documentation via Swagger.
 */

import { Controller, Post, Get, Body, Param, UseGuards, ValidationPipe, HttpCode, HttpStatus, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { CreateConsentDto } from './dto/create-consent.dto';
import { GetConsentParamsDto } from './dto/get-consent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Consent Management')
@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or update user consent',
    description: 'Captures or updates user consent for various data processing activities. Supports GDPR Article 7 compliance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent successfully created or updated.',
    schema: {
      type: 'object',
      properties: {
        consentId: { type: 'string', example: '60d5ec49f1a23c001c8a4d7d' },
        userId: { type: 'string', example: '60d5ec49f1a23c001c8a4d7d' },
        consentType: { type: 'string', example: 'marketing' },
        granted: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid payload or validation errors.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['User ID must be a string.'] },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid or expired JWT token' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Consent record already exists with the same granted status.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Consent record already exists with the same granted status' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async createConsent(
    @Body(ValidationPipe) createConsentDto: CreateConsentDto,
    @Req() request: Request,
  ) {
    if (!createConsentDto.ipAddress) {
      createConsentDto.ipAddress = request.ip || request.connection.remoteAddress;
    }
    if (!createConsentDto.userAgent) {
      createConsentDto.userAgent = request.headers['user-agent'];
    }

    try {
      return await this.consentService.createConsent(createConsentDto);
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve user consent records',
    description: 'Retrieves all consent records for a specific user ID.',
  })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user whose consent records to retrieve',
    example: '60d5ec49f1a23c001c8a4d7d',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent records successfully retrieved.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '60d5ec49f1a23c001c8a4d7d' },
          userId: { type: 'string', example: '60d5ec49f1a23c001c8a4d7d' },
          consentType: { type: 'string', example: 'marketing' },
          granted: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - No consent records found for this user.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'No consent records found for this user' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async getConsentByUserId(@Param(ValidationPipe) params: GetConsentParamsDto) {
    return this.consentService.getConsentByUserId(params.userId);
  }
}
