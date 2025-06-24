// src/portal/portal-backend/src/auth/dto/register.dto.ts
/**
 * @file register.dto.ts
 * @description Data Transfer Object (DTO) for user registration requests.
 * Uses class-validator decorators for robust input validation.
 *
 * @module AuthDTOs
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This DTO ensures that incoming registration data adheres to defined rules,
 * contributing to the "no regrets" approach for data integrity and security.
 */

import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'The email address of the user.',
    example: 'newuser@minkalla.com',
    format: 'email',
    minLength: 5,
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsString({ message: 'Email must be a string.' })
  @MinLength(5, { message: 'Email must be at least 5 characters long.' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters.' })
  email!: string; // CHANGED: Added definite assignment assertion

  @ApiProperty({
    description: 'The password for the user account.',
    example: 'StrongPassword123!',
    minLength: 8,
    maxLength: 255,
  })
  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(255, { message: 'Password must not exceed 255 characters.' })
  password!: string; // CHANGED: Added definite assignment assertion
}
