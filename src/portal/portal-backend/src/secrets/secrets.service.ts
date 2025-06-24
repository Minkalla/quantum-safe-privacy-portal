/**
 * @file secrets.service.ts
 * @description NestJS service for interacting with AWS Secrets Manager.
 * This service provides a secure way to retrieve and (optionally) cache secrets,
 * such as JWT keys and database credentials, from AWS Secrets Manager.
 *
 * @module SecretsService
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Adheres to "no regrets" quality by centralizing secure secret retrieval.
 * Supports compliance standards (NIST SP 800-53 SC-8, FedRAMP AC-6) by using
 * encrypted API calls and least privilege IAM roles.
 *
 * Updates in June 2025:
 * - Added conditional bypass for AWS Secrets Manager calls for CI/testing environments
 * via `SKIP_SECRETS_MANAGER` environment variable. This allows the application to
 * start with dummy secrets for DAST scans without requiring live AWS credentials.
 */

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private secretsManagerClient: SecretsManagerClient | null = null; // Changed to nullable
  private secretCache: Map<string, { value: string; expiry: number }> = new Map();
  private readonly CACHE_TTL_HOURS = 1;
  private readonly skipSecretsManager: boolean;

  constructor(private readonly configService: ConfigService) {
    this.skipSecretsManager = this.configService.get<string>('SKIP_SECRETS_MANAGER') === 'true';

    if (this.skipSecretsManager) {
      this.logger.warn(
        'SKIP_SECRETS_MANAGER is true. Bypassing actual AWS Secrets Manager client initialization.',
      );
    } else {
      const awsRegion = this.configService.get<string>('AWS_REGION');

      if (!awsRegion) {
        this.logger.error(
          'AWS_REGION environment variable is not set. Secrets Manager client cannot be initialized.',
        );
        throw new InternalServerErrorException('AWS region configuration missing.');
      }

      this.secretsManagerClient = new SecretsManagerClient({ region: awsRegion });
      this.logger.log(`SecretsManagerClient initialized for region: ${awsRegion}`);
    }
  }

  /**
   * Retrieves a secret value. If SKIP_SECRETS_MANAGER is true, returns a dummy value.
   * Otherwise, retrieves from AWS Secrets Manager with in-memory caching.
   *
   * @param secretId The ID or ARN of the secret to retrieve.
   * @returns The secret string value.
   * @throws InternalServerErrorException if secret retrieval fails or is not found.
   */
  async getSecret(secretId: string): Promise<string> {
    if (this.skipSecretsManager) {
      this.logger.warn(
        `SKIP_SECRETS_MANAGER is true. Returning dummy value for secretId: "${secretId}"`,
      );
      // Return a predictable dummy value based on the secretId for testing
      return `DUMMY_SECRET_FOR_${secretId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    }

    if (!this.secretsManagerClient) {
      this.logger.error('SecretsManagerClient is not initialized. Cannot fetch real secret.');
      throw new InternalServerErrorException(
        'Secrets Manager client not initialized due to missing AWS_REGION or unexpected error.',
      );
    }

    const cachedSecret = this.secretCache.get(secretId);
    if (cachedSecret && cachedSecret.expiry > Date.now()) {
      this.logger.debug(`Retrieving secret "${secretId}" from cache.`);
      return cachedSecret.value;
    }

    this.logger.log(`Fetching secret "${secretId}" from AWS Secrets Manager.`);
    try {
      const command = new GetSecretValueCommand({ SecretId: secretId });
      const data = await this.secretsManagerClient.send(command);

      if (!data.SecretString) {
        this.logger.error(`Secret "${secretId}" not found or has no SecretString value.`);
        throw new InternalServerErrorException(`Secret "${secretId}" not found or empty.`);
      }

      const secretValue = data.SecretString;
      const expiryTime = Date.now() + this.CACHE_TTL_HOURS * 60 * 60 * 1000;
      this.secretCache.set(secretId, { value: secretValue, expiry: expiryTime });
      this.logger.log(`Successfully fetched and cached secret "${secretId}".`);

      return secretValue;
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve secret "${secretId}" from Secrets Manager: ${error.message}`,
      );
      throw new InternalServerErrorException(`Failed to retrieve secret: ${error.message}`);
    }
  }
}
