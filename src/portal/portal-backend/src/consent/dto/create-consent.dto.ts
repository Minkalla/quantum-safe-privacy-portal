/**
 * @file create-consent.dto.ts
 * @description Data Transfer Object (DTO) for consent creation requests.
 * Uses class-validator decorators for robust input validation.
 *
 * @module ConsentDTOs
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This DTO ensures that incoming consent data adheres to defined rules,
 * contributing to the "no regrets" approach for data integrity and security.
 * Supports GDPR Article 7 compliance requirements.
 */

import { IsString, IsBoolean, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  DATA_PROCESSING = 'data_processing',
  COOKIES = 'cookies',
  THIRD_PARTY_SHARING = 'third_party_sharing',
}

export class CreateConsentDto {
  @ApiProperty({
    description: 'The ID of the user providing consent.',
    example: '60d5ec49f1a23c001c8a4d7d',
    minLength: 24,
    maxLength: 24,
  })
  @IsString({ message: 'User ID must be a string.' })
  @MinLength(24, { message: 'User ID must be exactly 24 characters long.' })
  @MaxLength(24, { message: 'User ID must be exactly 24 characters long.' })
    userId!: string;

  @ApiProperty({
    description: 'The type of consent being provided.',
    example: 'marketing',
    enum: ConsentType,
  })
  @IsEnum(ConsentType, {
    message: 'Consent type must be one of: marketing, analytics, data_processing, cookies, third_party_sharing',
  })
    consentType!: ConsentType;

  @ApiProperty({
    description: 'Whether consent is granted (true) or revoked (false).',
    example: true,
  })
  @IsBoolean({ message: 'Granted must be a boolean value.' })
    granted!: boolean;

  @ApiProperty({
    description: 'IP address from which consent was provided (optional, for audit trail).',
    example: '192.168.1.1',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'IP address must be a string.' })
  @MaxLength(45, { message: 'IP address must not exceed 45 characters.' })
    ipAddress?: string;

  @ApiProperty({
    description: 'User agent string from which consent was provided (optional, for audit trail).',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'User agent must be a string.' })
  @MaxLength(500, { message: 'User agent must not exceed 500 characters.' })
    userAgent?: string;
}
