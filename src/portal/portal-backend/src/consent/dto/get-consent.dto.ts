/**
 * @file get-consent.dto.ts
 * @description Data Transfer Object (DTO) for GET consent endpoint parameters.
 * Uses class-validator decorators for robust input validation.
 */

import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetConsentParamsDto {
  @ApiProperty({
    description: 'The ID of the user whose consent records to retrieve.',
    example: '60d5ec49f1a23c001c8a4d7d',
    minLength: 24,
    maxLength: 24,
  })
  @IsString({ message: 'User ID must be a string.' })
  @MinLength(24, { message: 'User ID must be exactly 24 characters long.' })
  @MaxLength(24, { message: 'User ID must be exactly 24 characters long.' })
  @Matches(/^[a-fA-F0-9]{24}$/, { message: 'User ID must be a valid MongoDB ObjectId.' })
    userId!: string;
}
