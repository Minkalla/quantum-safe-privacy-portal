// src/portal/portal-backend/src/config/config.service.ts
/**
 * @file config.service.ts
 * @description NestJS AppConfigService for centralized environment variable management and validation.
 * This service ensures that critical environment variables, including secret IDs and AWS region,
 * are present and correctly formatted at application startup.
 *
 * @module AppConfigService
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Adheres to "no regrets" quality by providing robust configuration management.
 * Supports compliance standards (ISO/IEC 27701 7.2.8, NIST SP 800-53 CM-3) by validating
 * environment variables and securely managing secret IDs.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { IsString, IsBoolean, IsNumber, IsUrl, IsIn, IsOptional, Min, Max, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

// Define a class to represent expected environment variables for validation
class EnvironmentVariables {
  @IsString()
  @IsIn(['development', 'production', 'test'])
    NODE_ENV!: string;

  @IsNumber()
    PORT!: number;

  @IsString()
    MONGO_URI!: string;

  @IsString()
    JWT_ACCESS_SECRET_ID!: string;

  @IsString()
    JWT_REFRESH_SECRET_ID!: string;

  @IsString()
    AWS_REGION!: string;

  @IsBoolean()
    ENABLE_SWAGGER_DOCS!: boolean;

  @IsUrl({ require_tld: false })
    FRONTEND_URL!: string;

  @IsString()
    APP_VERSION!: string;

  @IsOptional()
  @IsBoolean()
    PQC_KEY_GENERATION_ENABLED?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
    PQC_KEY_GENERATION_PERCENTAGE?: number;

  @IsOptional()
  @IsBoolean()
    PQC_USER_REGISTRATION_ENABLED?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
    PQC_USER_REGISTRATION_PERCENTAGE?: number;

  @IsOptional()
  @IsBoolean()
    PQC_AUTHENTICATION_ENABLED?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
    PQC_AUTHENTICATION_PERCENTAGE?: number;

  @IsOptional()
  @IsBoolean()
    PQC_JWT_SIGNING_ENABLED?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
    PQC_JWT_SIGNING_PERCENTAGE?: number;
}

@Injectable()
export class AppConfigService { // CHANGED: Renamed class to AppConfigService
  constructor(private nestConfigService: NestConfigService) {
    this.validateEnvironmentVariables();
  }

  get<T>(key: string): T | undefined {
    return this.nestConfigService.get<T>(key);
  }

  private validateEnvironmentVariables(): void {
    const configValues = {
      NODE_ENV: this.nestConfigService.get<string>('NODE_ENV'),
      PORT: this.nestConfigService.get<number>('PORT'),
      MONGO_URI: this.nestConfigService.get<string>('MONGO_URI'),
      JWT_ACCESS_SECRET_ID: this.nestConfigService.get<string>('JWT_ACCESS_SECRET_ID'),
      JWT_REFRESH_SECRET_ID: this.nestConfigService.get<string>('JWT_REFRESH_SECRET_ID'),
      AWS_REGION: this.nestConfigService.get<string>('AWS_REGION'),
      ENABLE_SWAGGER_DOCS: this.nestConfigService.get<boolean>('ENABLE_SWAGGER_DOCS'),
      FRONTEND_URL: this.nestConfigService.get<string>('FRONTEND_URL'),
      APP_VERSION: this.nestConfigService.get<string>('APP_VERSION'),
    };

    const validatedConfig = plainToClass(
      EnvironmentVariables,
      configValues,
      { enableImplicitConversion: true },
    );

    const errors = validateSync(validatedConfig, { skipMissingProperties: false });

    if (errors.length > 0) {
      const errorMessage = errors.flatMap(error => Object.values(error.constraints || {})).join('; ');
      throw new Error(`Environment validation error: ${errorMessage}`);
    }
  }
}
