import { IsString, IsOptional, IsBoolean, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PQCAlgorithmType } from '../models/interfaces/pqc-data.interface';

export class EncryptDataDto {
  @ApiProperty({ description: 'Data to encrypt' })
  @IsObject()
    data: any;

  @ApiProperty({ description: 'Encryption algorithm', enum: PQCAlgorithmType, required: false })
  @IsOptional()
  @IsEnum(PQCAlgorithmType)
    algorithm?: PQCAlgorithmType;

  @ApiProperty({ description: 'Key ID for encryption', required: false })
  @IsOptional()
  @IsString()
    keyId?: string;

  @ApiProperty({ description: 'User ID for encryption context', required: false })
  @IsOptional()
  @IsString()
    userId?: string;
}

export class MigrationOptionsDto {
  @ApiProperty({ description: 'Batch size for migration', required: false, default: 100 })
  @IsOptional()
    batchSize?: number;

  @ApiProperty({ description: 'Dry run mode', required: false, default: false })
  @IsOptional()
  @IsBoolean()
    dryRun?: boolean;

  @ApiProperty({ description: 'Continue on error', required: false, default: true })
  @IsOptional()
  @IsBoolean()
    continueOnError?: boolean;
}

export class IntegrityCheckDto {
  @ApiProperty({ description: 'User ID to check integrity for', required: false })
  @IsOptional()
  @IsString()
    userId?: string;

  @ApiProperty({ description: 'Strict validation mode', required: false, default: false })
  @IsOptional()
  @IsBoolean()
    strictMode?: boolean;
}
