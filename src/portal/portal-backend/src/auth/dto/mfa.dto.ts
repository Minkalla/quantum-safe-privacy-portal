import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MFASetupDto {
  @ApiProperty({
    description: 'User ID for MFA setup',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'User ID must be a string.' })
  @IsNotEmpty({ message: 'User ID is required.' })
  userId!: string;
}

export class MFAVerifyDto {
  @ApiProperty({
    description: 'User ID for MFA verification',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'User ID must be a string.' })
  @IsNotEmpty({ message: 'User ID is required.' })
  userId!: string;

  @ApiProperty({
    description: 'TOTP token or backup code',
    example: '123456',
  })
  @IsString({ message: 'Token must be a string.' })
  @IsNotEmpty({ message: 'Token is required.' })
  token!: string;

  @ApiProperty({
    description: 'Whether to enable MFA after successful verification',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'enableMFA must be a boolean.' })
  enableMFA?: boolean;
}

export class MFAStatusDto {
  @ApiProperty({
    description: 'User ID to check MFA status',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'User ID must be a string.' })
  @IsNotEmpty({ message: 'User ID is required.' })
  userId!: string;
}
