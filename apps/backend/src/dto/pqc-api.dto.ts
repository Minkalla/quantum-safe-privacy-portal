import { IsString, IsOptional, IsBoolean, IsObject, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePQCConsentDto {
  @ApiProperty({ description: 'User ID for consent' })
  @IsNotEmpty()
  @IsString()
    userId!: string;

  @ApiProperty({ description: 'Consent data' })
  @IsObject()
    consentData!: any;

  @ApiProperty({ description: 'Enable PQC protection', required: false, default: true })
  @IsOptional()
  @IsBoolean()
    pqcEnabled?: boolean;
}

export class PQCUserOptionsDto {
  @ApiProperty({
    description: 'PQC algorithms to enable',
    required: false,
    example: ['ML-KEM-768', 'ML-DSA-65'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
    algorithms?: string[];

  @ApiProperty({ description: 'Enable hybrid mode', required: false, default: true })
  @IsOptional()
  @IsBoolean()
    hybridMode?: boolean;
}

export class PQCSessionRequestDto {
  @ApiProperty({ description: 'User ID for session generation' })
  @IsNotEmpty()
  @IsString()
    userId!: string;

  @ApiProperty({ description: 'Session metadata', required: false })
  @IsOptional()
  @IsObject()
    metadata?: Record<string, any>;

  @ApiProperty({ description: 'Session duration in seconds', required: false, default: 3600 })
  @IsOptional()
    duration?: number;
}

export class PQCEncryptionRequestDto {
  @ApiProperty({ description: 'Data to encrypt' })
  @IsNotEmpty()
  @IsObject()
    data!: any;

  @ApiProperty({ description: 'User ID for encryption context' })
  @IsNotEmpty()
  @IsString()
    userId!: string;

  @ApiProperty({ description: 'Algorithm preference', required: false, default: 'ML-KEM-768' })
  @IsOptional()
  @IsString()
    algorithm?: string;
}

export class PQCValidationRequestDto {
  @ApiProperty({ description: 'Data to validate' })
  @IsNotEmpty()
  @IsObject()
    data!: any;

  @ApiProperty({ description: 'Data integrity signature' })
  @IsNotEmpty()
  @IsObject()
    dataIntegrity!: any;

  @ApiProperty({ description: 'User ID for validation context' })
  @IsNotEmpty()
  @IsString()
    userId!: string;
}
