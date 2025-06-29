import { IsEmail, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthenticationMode } from '../interfaces/pqc-auth.interface';

export class PQCLoginDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
    email!: string;

  @ApiProperty({ description: 'User password', example: 'SecurePassword123!' })
  @IsString({ message: 'Password must be a string' })
    password!: string;

  @ApiProperty({
    description: 'Authentication mode preference',
    enum: AuthenticationMode,
    required: false,
    example: AuthenticationMode.HYBRID,
  })
  @IsOptional()
  @IsEnum(AuthenticationMode, { message: 'Invalid authentication mode' })
    authMode?: AuthenticationMode;

  @ApiProperty({ description: 'Remember me flag', required: false, example: false })
  @IsOptional()
  @IsBoolean({ message: 'Remember me must be a boolean' })
    rememberMe?: boolean;

  @ApiProperty({ description: 'Enable PQC authentication', required: false, example: true })
  @IsOptional()
  @IsBoolean({ message: 'Use PQC must be a boolean' })
    usePQC?: boolean;
}

export class PQCRegisterDto {
  @ApiProperty({ description: 'User email address', example: 'newuser@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
    email!: string;

  @ApiProperty({ description: 'User password', example: 'SecurePassword123!' })
  @IsString({ message: 'Password must be a string' })
    password!: string;

  @ApiProperty({ description: 'Enable PQC for this user', required: false, example: true })
  @IsOptional()
  @IsBoolean({ message: 'Use PQC must be a boolean' })
    usePQC?: boolean;

  @ApiProperty({
    description: 'Preferred authentication mode',
    enum: AuthenticationMode,
    required: false,
    example: AuthenticationMode.HYBRID,
  })
  @IsOptional()
  @IsEnum(AuthenticationMode, { message: 'Invalid authentication mode' })
    preferredAuthMode?: AuthenticationMode;
}

export class PQCTokenVerificationDto {
  @ApiProperty({ description: 'Token to verify' })
  @IsString({ message: 'Token must be a string' })
    token!: string;

  @ApiProperty({ description: 'Expected user ID' })
  @IsString({ message: 'User ID must be a string' })
    userId!: string;
}

export class PQCSessionDto {
  @ApiProperty({ description: 'User ID for session generation' })
  @IsString({ message: 'User ID must be a string' })
    userId!: string;

  @ApiProperty({ description: 'Session metadata', required: false })
  @IsOptional()
    metadata?: Record<string, any>;
}
