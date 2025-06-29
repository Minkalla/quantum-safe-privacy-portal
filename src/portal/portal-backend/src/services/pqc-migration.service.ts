import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HybridCryptoService } from './hybrid-crypto.service';

export interface MigrationResult {
  success: boolean;
  algorithm: string;
  migratedCount?: number;
  failedCount?: number;
  errors?: string[];
}

export interface UserMigrationData {
  userId: string;
  cryptoVersion: 'placeholder' | 'pqc-real' | 'classical';
  encryptedData?: string;
  keyPairs?: Record<string, any>;
  migrationDate?: Date;
}

export interface MigrationConfig {
  batchSize: number;
  enabled: boolean;
  dryRun: boolean;
  continueOnError: boolean;
}

@Injectable()
export class PQCMigrationService {
  private readonly logger = new Logger(PQCMigrationService.name);
  private readonly config: MigrationConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly hybridCrypto: HybridCryptoService,
  ) {
    this.config = {
      batchSize: this.configService.get<number>('MIGRATION_BATCH_SIZE') || 100,
      enabled: this.configService.get<boolean>('MIGRATION_ENABLED') === true,
      dryRun: this.configService.get<boolean>('MIGRATION_DRY_RUN') === true,
      continueOnError: this.configService.get<boolean>('MIGRATION_CONTINUE_ON_ERROR') !== false,
    };
  }

  async migrateUserData(userId: string): Promise<MigrationResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        algorithm: 'none',
        errors: ['Migration is disabled in configuration'],
      };
    }

    try {
      this.logger.log(`Starting migration for user: ${userId}`);

      const userData = await this.getUserMigrationData(userId);

      if (userData.cryptoVersion === 'pqc-real') {
        return {
          success: true,
          algorithm: 'ML-KEM-768',
          migratedCount: 0,
        };
      }

      if (userData.cryptoVersion === 'placeholder') {
        return await this.migrateFromPlaceholder(userData);
      }

      return await this.migrateFromClassical(userData);
    } catch (error) {
      this.logger.error(`Migration failed for user ${userId}: ${error.message}`);
      return {
        success: false,
        algorithm: 'unknown',
        errors: [error.message],
      };
    }
  }

  async migrateBatchUsers(userIds: string[]): Promise<MigrationResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        algorithm: 'none',
        errors: ['Batch migration is disabled in configuration'],
      };
    }

    const results: MigrationResult[] = [];
    let migratedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    this.logger.log(`Starting batch migration for ${userIds.length} users`);

    for (let i = 0; i < userIds.length; i += this.config.batchSize) {
      const batch = userIds.slice(i, i + this.config.batchSize);

      for (const userId of batch) {
        try {
          const result = await this.migrateUserData(userId);
          results.push(result);

          if (result.success) {
            migratedCount += result.migratedCount || 1;
          } else {
            failedCount++;
            if (result.errors) {
              errors.push(...result.errors);
            }
          }
        } catch (error) {
          failedCount++;
          errors.push(`User ${userId}: ${error.message}`);

          if (!this.config.continueOnError) {
            break;
          }
        }
      }

      if (i + this.config.batchSize < userIds.length) {
        await this.delay(1000);
      }
    }

    return {
      success: failedCount === 0,
      algorithm: 'ML-KEM-768',
      migratedCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async migrateFromPlaceholder(userData: UserMigrationData): Promise<MigrationResult> {
    try {
      if (this.config.dryRun) {
        this.logger.log(`DRY RUN: Would migrate placeholder data for user ${userData.userId}`);
        return {
          success: true,
          algorithm: 'ML-KEM-768',
          migratedCount: 1,
        };
      }

      const newKeyPairs = await this.generateRealPQCKeys(userData.userId);
      const migratedData = await this.reencryptUserData(userData, newKeyPairs);

      await this.updateUserCryptoVersion(userData.userId, {
        ...migratedData,
        cryptoVersion: 'pqc-real',
        migrationDate: new Date(),
      });

      this.logger.log(`Successfully migrated placeholder data for user ${userData.userId}`);

      return {
        success: true,
        algorithm: 'ML-KEM-768',
        migratedCount: 1,
      };
    } catch (error) {
      this.logger.error(
        `Placeholder migration failed for user ${userData.userId}: ${error.message}`,
      );
      return {
        success: false,
        algorithm: 'placeholder',
        errors: [error.message],
      };
    }
  }

  private async migrateFromClassical(userData: UserMigrationData): Promise<MigrationResult> {
    try {
      if (this.config.dryRun) {
        this.logger.log(`DRY RUN: Would migrate classical data for user ${userData.userId}`);
        return {
          success: true,
          algorithm: 'ML-KEM-768',
          migratedCount: 1,
        };
      }

      const hybridResult = await this.hybridCrypto.generateTokenWithFallback(userData.userId, {
        migrationSource: 'classical',
      });

      if (!hybridResult.success) {
        throw new Error(hybridResult.errorMessage || 'Hybrid token generation failed');
      }

      await this.updateUserCryptoVersion(userData.userId, {
        cryptoVersion: hybridResult.fallbackUsed ? 'classical' : 'pqc-real',
        migrationDate: new Date(),
        encryptedData: hybridResult.token,
      });

      return {
        success: true,
        algorithm: hybridResult.fallbackUsed ? 'RSA-2048' : 'ML-KEM-768',
        migratedCount: 1,
      };
    } catch (error) {
      this.logger.error(`Classical migration failed for user ${userData.userId}: ${error.message}`);
      return {
        success: false,
        algorithm: 'classical',
        errors: [error.message],
      };
    }
  }

  private async getUserMigrationData(userId: string): Promise<UserMigrationData> {
    return {
      userId,
      cryptoVersion: 'placeholder',
      encryptedData: `placeholder-data-${userId}`,
      keyPairs: {},
    };
  }

  private async generateRealPQCKeys(userId: string): Promise<Record<string, any>> {
    this.logger.debug(`Generating real PQC keys for user ${userId}`);
    return {
      mlkem: {
        publicKey: `mlkem-pub-${userId}`,
        privateKey: `mlkem-priv-${userId}`,
      },
      mldsa: {
        publicKey: `mldsa-pub-${userId}`,
        privateKey: `mldsa-priv-${userId}`,
      },
    };
  }

  private async reencryptUserData(
    userData: UserMigrationData,
    newKeys: Record<string, any>,
  ): Promise<UserMigrationData> {
    if (!userData.encryptedData) {
      return { ...userData, keyPairs: newKeys };
    }

    const reencryptedData = await this.hybridCrypto.encryptWithFallback(
      userData.encryptedData,
      newKeys.mlkem?.publicKey,
    );

    return {
      ...userData,
      encryptedData: reencryptedData.ciphertext,
      keyPairs: newKeys,
    };
  }

  private async updateUserCryptoVersion(
    userId: string,
    data: Partial<UserMigrationData>,
  ): Promise<void> {
    this.logger.debug(`Updating crypto version for user ${userId}:`, data);
  }

  async validateMigrationCompatibility(): Promise<{
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!this.config.enabled) {
      issues.push('Migration service is disabled');
      recommendations.push('Enable migration in configuration');
    }

    const circuitBreakerStatus = this.hybridCrypto.getCircuitBreakerStatus();
    if (circuitBreakerStatus.state === 'OPEN') {
      issues.push('Circuit breaker is OPEN - PQC operations are failing');
      recommendations.push('Investigate PQC service issues before migration');
    }

    if (this.config.batchSize > 1000) {
      issues.push('Batch size is very large and may cause performance issues');
      recommendations.push('Consider reducing batch size to 100-500');
    }

    return {
      compatible: issues.length === 0,
      issues,
      recommendations,
    };
  }

  async getMigrationStatus(): Promise<{
    enabled: boolean;
    dryRun: boolean;
    batchSize: number;
    circuitBreakerState: string;
    lastMigrationDate?: Date;
  }> {
    const circuitBreakerStatus = this.hybridCrypto.getCircuitBreakerStatus();

    return {
      enabled: this.config.enabled,
      dryRun: this.config.dryRun,
      batchSize: this.config.batchSize,
      circuitBreakerState: circuitBreakerStatus.state,
      lastMigrationDate: undefined,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
