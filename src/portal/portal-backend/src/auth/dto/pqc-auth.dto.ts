import { IsEmail, IsString, IsOptional, IsBoolean, IsEnum, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthenticationMode } from '../interfaces/pqc-auth.interface';

export class PQCLoginDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
    email!: string;

  @ApiProperty({ description: 'User password', example: 'SecurePassword123!' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
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
  @IsNotEmpty({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
    email!: string;

  @ApiProperty({ description: 'User password', example: 'SecurePassword123!' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
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
  @IsNotEmpty({ message: 'Token is required' })
  @IsString({ message: 'Token must be a string' })
    token!: string;

  @ApiProperty({ description: 'Expected user ID' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsString({ message: 'User ID must be a string' })
    userId!: string;
}

export class PQCSessionDto {
  @ApiProperty({ description: 'User ID for session generation' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsString({ message: 'User ID must be a string' })
    userId!: string;

  @ApiProperty({ description: 'Session metadata', required: false })
  @IsOptional()
    metadata?: Record<string, any>;
}
