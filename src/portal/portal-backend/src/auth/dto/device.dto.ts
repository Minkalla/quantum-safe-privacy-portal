import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceRegisterDto {
  @ApiProperty({ description: 'User agent string', example: 'Mozilla/5.0...' })
  @IsNotEmpty({ message: 'User agent is required' })
  @IsString({ message: 'User agent must be a string' })
    userAgent!: string;

  @ApiProperty({ description: 'Device name', required: false, example: 'John\'s MacBook' })
  @IsOptional()
  @IsString({ message: 'Device name must be a string' })
    deviceName?: string;

  @ApiProperty({
    description: 'Device type',
    enum: ['desktop', 'mobile', 'tablet'],
    required: false,
    example: 'desktop',
  })
  @IsOptional()
  @IsEnum(['desktop', 'mobile', 'tablet'], { message: 'Invalid device type' })
    deviceType?: 'desktop' | 'mobile' | 'tablet';
}

export class DeviceVerifyDto {
  @ApiProperty({ description: 'Device ID to verify', example: 'uuid-string' })
  @IsNotEmpty({ message: 'Device ID is required' })
  @IsString({ message: 'Device ID must be a string' })
    deviceId!: string;

  @ApiProperty({ description: 'Verification code', example: '123456' })
  @IsNotEmpty({ message: 'Verification code is required' })
  @IsString({ message: 'Verification code must be a string' })
    verificationCode!: string;
}

export class DeviceTrustCheckDto {
  @ApiProperty({ description: 'Device fingerprint to check', example: 'abc123...' })
  @IsNotEmpty({ message: 'Device fingerprint is required' })
  @IsString({ message: 'Device fingerprint must be a string' })
    fingerprint!: string;
}
