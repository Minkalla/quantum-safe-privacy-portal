// src/portal/portal-backend/src/auth/dto/login.dto.ts
/**
 * @file login.dto.ts
 * @description Data Transfer Object (DTO) for user login requests.
 * Uses class-validator decorators for robust input validation.
 *
 * @module AuthDTOs
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This DTO ensures that incoming login data adheres to defined rules,
 * contributing to the "no regrets" approach for data integrity and security.
 */

import { IsEmail, IsString, MinLength, MaxLength, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'The email address of the user attempting to log in.',
    example: 'testuser@minkalla.com',
    format: 'email',
    minLength: 5,
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsString({ message: 'Email must be a string.' })
  @MinLength(5, { message: 'Email must be at least 5 characters long.' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters.' })
  email: string;

  @ApiProperty({
    description: 'The password for the user account.',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 255,
  })
  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(255, { message: 'Password must not exceed 255 characters.' })
  password: string;

  @ApiProperty({
    description: 'Optional flag to request a longer-lived session (e.g., 30 days vs 7 days).',
    example: true,
    type: Boolean,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'RememberMe must be a boolean value.' })
  rememberMe?: boolean;
}