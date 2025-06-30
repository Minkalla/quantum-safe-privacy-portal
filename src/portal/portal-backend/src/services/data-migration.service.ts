import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HybridCryptoService } from './hybrid-crypto.service';
import { PQCDataEncryptionService } from './pqc-data-encryption.service';
import { BulkEncryptionService } from './bulk-encryption.service';
import User, { IUser } from '../models/User';
import Consent, { IConsent } from '../models/Consent';

export interface MigrationResult {
  success: boolean;
  algorithm: string;
  migratedFields?: number;
  errors?: string[];
  performanceMetrics?: {
    migrationTime: number;
    recordsProcessed: number;
  };
}

export interface RollbackResult {
  success: boolean;
  rolledBackFields?: number;
  errors?: string[];
  performanceMetrics?: {
    rollbackTime: number;
    recordsProcessed: number;
  };
}

@Injectable()
export class DataMigrationService {
  private readonly logger = new Logger(DataMigrationService.name);
  private readonly batchSize = parseInt(process.env.MIGRATION_BATCH_SIZE || '100');
  private readonly migrationEnabled = process.env.MIGRATION_ENABLED === 'true';

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<IUser>,
    @InjectModel(Consent.name) private readonly consentModel: Model<IConsent>,
    private readonly hybridCryptoService: HybridCryptoService,
    private readonly pqcService: PQCDataEncryptionService,
    private readonly bulkEncryption: BulkEncryptionService,
  ) {}

  async migrateToPQC(): Promise<{ migrated: number; failed: number }> {
    if (!this.migrationEnabled) {
      this.logger.warn('PQC migration is disabled via environment configuration');
      return { migrated: 0, failed: 0 };
    }

    this.logger.log('Starting comprehensive PQC data migration');
    const startTime = Date.now();
    let migrated = 0;
    let failed = 0;

    try {
      const placeholderUsers = await this.userModel.find({ cryptoVersion: 'placeholder' });
      this.logger.log(`Found ${placeholderUsers.length} users with placeholder encryption`);

      for (const user of placeholderUsers) {
        try {
          const result = await this.migrateUserData(user._id.toString());
          if (result.success) {
            migrated++;
            this.logger.debug(`Successfully migrated user ${user._id}`);
          } else {
            failed++;
            this.logger.warn(`Failed to migrate user ${user._id}: ${result.errors?.join(', ')}`);
          }
        } catch (error) {
          failed++;
          this.logger.error(`Migration error for user ${user._id}: ${error.message}`);
        }
      }

      const placeholderConsents = await this.consentModel.find({ cryptoVersion: 'placeholder' });
      this.logger.log(`Found ${placeholderConsents.length} consents with placeholder encryption`);

      for (const consent of placeholderConsents) {
        try {
          const result = await this.migrateConsentData(consent._id.toString());
          if (result.success) {
            migrated++;
            this.logger.debug(`Successfully migrated consent ${consent._id}`);
          } else {
            failed++;
            this.logger.warn(`Failed to migrate consent ${consent._id}: ${result.errors?.join(', ')}`);
          }
        } catch (error) {
          failed++;
          this.logger.error(`Migration error for consent ${consent._id}: ${error.message}`);
        }
      }

      const migrationTime = Date.now() - startTime;
      this.logger.log(`PQC migration completed in ${migrationTime}ms: ${migrated} migrated, ${failed} failed`);

      return { migrated, failed };
    } catch (error) {
      this.logger.error(`PQC migration failed: ${error.message}`);
      return { migrated, failed: failed + 1 };
    }
  }

  async rollbackPQC(): Promise<{ rolledBack: number; failed: number }> {
    if (!this.migrationEnabled) {
      this.logger.warn('PQC rollback is disabled via environment configuration');
      return { rolledBack: 0, failed: 0 };
    }

    this.logger.log('Starting PQC rollback to classical encryption');
    const startTime = Date.now();
    let rolledBack = 0;
    let failed = 0;

    try {
      const pqcUsers = await this.userModel.find({ cryptoVersion: 'pqc-real' });
      this.logger.log(`Found ${pqcUsers.length} users with PQC encryption to rollback`);

      for (const user of pqcUsers) {
        try {
          const result = await this.rollbackUserData(user._id.toString());
          if (result.success) {
            rolledBack++;
            this.logger.debug(`Successfully rolled back user ${user._id}`);
          } else {
            failed++;
            this.logger.warn(`Failed to rollback user ${user._id}: ${result.errors?.join(', ')}`);
          }
        } catch (error) {
          failed++;
          this.logger.error(`Rollback error for user ${user._id}: ${error.message}`);
        }
      }

      const pqcConsents = await this.consentModel.find({ cryptoVersion: 'pqc-real' });
      this.logger.log(`Found ${pqcConsents.length} consents with PQC encryption to rollback`);

      for (const consent of pqcConsents) {
        try {
          const result = await this.rollbackConsentData(consent._id.toString());
          if (result.success) {
            rolledBack++;
            this.logger.debug(`Successfully rolled back consent ${consent._id}`);
          } else {
            failed++;
            this.logger.warn(`Failed to rollback consent ${consent._id}: ${result.errors?.join(', ')}`);
          }
        } catch (error) {
          failed++;
          this.logger.error(`Rollback error for consent ${consent._id}: ${error.message}`);
        }
      }

      const rollbackTime = Date.now() - startTime;
      this.logger.log(`PQC rollback completed in ${rollbackTime}ms: ${rolledBack} rolled back, ${failed} failed`);

      return { rolledBack, failed };
    } catch (error) {
      this.logger.error(`PQC rollback failed: ${error.message}`);
      return { rolledBack, failed: failed + 1 };
    }
  }

  async migrateUserData(userId: string): Promise<MigrationResult> {
    if (!this.migrationEnabled) {
      return { success: false, algorithm: 'migration-disabled' };
    }

    const startTime = Date.now();
    let migratedFields = 0;
    const errors: string[] = [];

    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (user.cryptoVersion === 'placeholder') {
        this.logger.debug(`Migrating user ${userId} from placeholder to real PQC`);

        const newKeys = await this.hybridCryptoService.generateKeyPairWithFallback();
        const migratedData = await this.reencryptUserData(user, newKeys);

        await this.userModel.updateOne(
          { _id: userId },
          {
            ...migratedData,
            cryptoVersion: 'pqc-real',
            migrationDate: new Date(),
            cryptoAlgorithm: newKeys.algorithm,
            backupCryptoVersion: 'placeholder',
          },
        );

        migratedFields = this.countEncryptedFields(user);

        return {
          success: true,
          algorithm: newKeys.algorithm,
          migratedFields,
          performanceMetrics: {
            migrationTime: Date.now() - startTime,
            recordsProcessed: 1,
          },
        };
      } else {
        return {
          success: true,
          algorithm: user.cryptoVersion || 'unknown',
          migratedFields: 0,
        };
      }
    } catch (error) {
      this.logger.error(`Migration failed for user ${userId}: ${error.message}`);
      errors.push(error.message);

      return {
        success: false,
        algorithm: 'migration-failed',
        errors,
        performanceMetrics: {
          migrationTime: Date.now() - startTime,
          recordsProcessed: 0,
        },
      };
    }
  }

  async migrateConsentData(consentId: string): Promise<MigrationResult> {
    if (!this.migrationEnabled) {
      return { success: false, algorithm: 'migration-disabled' };
    }

    const startTime = Date.now();
    let migratedFields = 0;
    const errors: string[] = [];

    try {
      const consent = await this.consentModel.findById(consentId);
      if (!consent) {
        throw new Error(`Consent not found: ${consentId}`);
      }

      if (consent.cryptoVersion === 'placeholder') {
        this.logger.debug(`Migrating consent ${consentId} from placeholder to real PQC`);

        const newKeys = await this.hybridCryptoService.generateKeyPairWithFallback();
        const migratedData = await this.reencryptConsentData(consent, newKeys);

        await this.consentModel.updateOne(
          { _id: consentId },
          {
            ...migratedData,
            cryptoVersion: 'pqc-real',
            migrationDate: new Date(),
            cryptoAlgorithm: newKeys.algorithm,
            backupCryptoVersion: 'placeholder',
          },
        );

        migratedFields = this.countEncryptedConsentFields(consent);

        return {
          success: true,
          algorithm: newKeys.algorithm,
          migratedFields,
          performanceMetrics: {
            migrationTime: Date.now() - startTime,
            recordsProcessed: 1,
          },
        };
      } else {
        return {
          success: true,
          algorithm: consent.cryptoVersion || 'unknown',
          migratedFields: 0,
        };
      }
    } catch (error) {
      this.logger.error(`Migration failed for consent ${consentId}: ${error.message}`);
      errors.push(error.message);

      return {
        success: false,
        algorithm: 'migration-failed',
        errors,
        performanceMetrics: {
          migrationTime: Date.now() - startTime,
          recordsProcessed: 0,
        },
      };
    }
  }

  async rollbackUserData(userId: string): Promise<RollbackResult> {
    const startTime = Date.now();
    let rolledBackFields = 0;
    const errors: string[] = [];

    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (user.cryptoVersion === 'pqc-real' && user.backupCryptoVersion) {
        this.logger.debug(`Rolling back user ${userId} from PQC to ${user.backupCryptoVersion}`);

        await this.userModel.updateOne(
          { _id: userId },
          {
            cryptoVersion: user.backupCryptoVersion,
            rollbackDate: new Date(),
            $unset: {
              cryptoAlgorithm: 1,
              backupCryptoVersion: 1,
              migrationDate: 1,
            },
          },
        );

        rolledBackFields = this.countEncryptedFields(user);

        return {
          success: true,
          rolledBackFields,
          performanceMetrics: {
            rollbackTime: Date.now() - startTime,
            recordsProcessed: 1,
          },
        };
      } else {
        return {
          success: true,
          rolledBackFields: 0,
        };
      }
    } catch (error) {
      this.logger.error(`Rollback failed for user ${userId}: ${error.message}`);
      errors.push(error.message);

      return {
        success: false,
        errors,
        performanceMetrics: {
          rollbackTime: Date.now() - startTime,
          recordsProcessed: 0,
        },
      };
    }
  }

  async rollbackConsentData(consentId: string): Promise<RollbackResult> {
    const startTime = Date.now();
    let rolledBackFields = 0;
    const errors: string[] = [];

    try {
      const consent = await this.consentModel.findById(consentId);
      if (!consent) {
        throw new Error(`Consent not found: ${consentId}`);
      }

      if (consent.cryptoVersion === 'pqc-real' && consent.backupCryptoVersion) {
        this.logger.debug(`Rolling back consent ${consentId} from PQC to ${consent.backupCryptoVersion}`);

        await this.consentModel.updateOne(
          { _id: consentId },
          {
            cryptoVersion: consent.backupCryptoVersion,
            rollbackDate: new Date(),
            $unset: {
              cryptoAlgorithm: 1,
              backupCryptoVersion: 1,
              migrationDate: 1,
            },
          },
        );

        rolledBackFields = this.countEncryptedConsentFields(consent);

        return {
          success: true,
          rolledBackFields,
          performanceMetrics: {
            rollbackTime: Date.now() - startTime,
            recordsProcessed: 1,
          },
        };
      } else {
        return {
          success: true,
          rolledBackFields: 0,
        };
      }
    } catch (error) {
      this.logger.error(`Rollback failed for consent ${consentId}: ${error.message}`);
      errors.push(error.message);

      return {
        success: false,
        errors,
        performanceMetrics: {
          rollbackTime: Date.now() - startTime,
          recordsProcessed: 0,
        },
      };
    }
  }

  async getMigrationStatus(): Promise<{
    totalUsers: number;
    placeholderUsers: number;
    migratedUsers: number;
    migrationProgress: number;
  }> {
    try {
      const totalUsers = await this.userModel.countDocuments();
      const placeholderUsers = await this.userModel.countDocuments({ cryptoVersion: 'placeholder' });
      const migratedUsers = await this.userModel.countDocuments({ cryptoVersion: 'pqc-real' });

      const migrationProgress = totalUsers > 0 ? (migratedUsers / totalUsers) * 100 : 0;

      return {
        totalUsers,
        placeholderUsers,
        migratedUsers,
        migrationProgress: Math.round(migrationProgress * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Failed to get migration status: ${error.message}`);
      throw error;
    }
  }

  private async reencryptUserData(user: any, newKeys: { publicKey: string; privateKey: string; algorithm: string }): Promise<any> {
    const migratedUser = { ...user.toObject() };

    if (user.encryptedEmail) {
      try {
        const decryptedEmail = await this.decryptPlaceholderData(user.encryptedEmail);
        const reencryptedEmail = await this.hybridCryptoService.encryptWithFallback(decryptedEmail, newKeys.publicKey);
        migratedUser.encryptedEmail = reencryptedEmail.ciphertext;
      } catch (error) {
        this.logger.warn(`Failed to migrate email for user ${user._id}: ${error.message}`);
      }
    }

    if (user.encryptedPersonalData) {
      try {
        const decryptedData = await this.decryptPlaceholderData(user.encryptedPersonalData);
        const reencryptedData = await this.hybridCryptoService.encryptWithFallback(decryptedData, newKeys.publicKey);
        migratedUser.encryptedPersonalData = reencryptedData.ciphertext;
      } catch (error) {
        this.logger.warn(`Failed to migrate personal data for user ${user._id}: ${error.message}`);
      }
    }

    return migratedUser;
  }

  private async reencryptConsentData(consent: any, newKeys: { publicKey: string; privateKey: string; algorithm: string }): Promise<any> {
    const migratedConsent = { ...consent.toObject() };

    if (consent.encryptedConsentData) {
      try {
        const decryptedData = await this.decryptPlaceholderData(consent.encryptedConsentData);
        const reencryptedData = await this.hybridCryptoService.encryptWithFallback(decryptedData, newKeys.publicKey);
        migratedConsent.encryptedConsentData = reencryptedData.ciphertext;
      } catch (error) {
        this.logger.warn(`Failed to migrate consent data for ${consent._id}: ${error.message}`);
      }
    }

    return migratedConsent;
  }

  private async decryptPlaceholderData(encryptedData: string): Promise<string> {
    try {
      const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
      return decoded;
    } catch (error) {
      this.logger.warn(`Failed to decode placeholder data, returning as-is: ${error.message}`);
      return encryptedData;
    }
  }

  private countEncryptedFields(user: any): number {
    let count = 0;
    if (user.encryptedEmail) count++;
    if (user.encryptedPersonalData) count++;
    return count;
  }

  private countEncryptedConsentFields(consent: any): number {
    let count = 0;
    if (consent.encryptedConsentData) count++;
    return count;
  }

  async validateMigration(recordId: string, recordType: 'user' | 'consent'): Promise<boolean> {
    try {
      if (recordType === 'user') {
        const user = await this.userModel.findById(recordId);
        return user && user.cryptoVersion === 'pqc-real';
      } else {
        const consent = await this.consentModel.findById(recordId);
        return consent && consent.cryptoVersion === 'pqc-real';
      }
    } catch (error) {
      this.logger.error(`Migration validation failed for ${recordType} ${recordId}: ${error.message}`);
      return false;
    }
  }
}
