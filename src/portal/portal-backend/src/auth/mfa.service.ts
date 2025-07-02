import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import * as speakeasy from 'speakeasy';
import { IUser } from '../models/User';
import { SecretsService } from '../secrets/secrets.service';
import { AuditTrailService } from '../monitoring/audit-trail.service';

export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  verified: boolean;
  message: string;
}

@Injectable()
export class MFAService {
  private readonly logger = new Logger(MFAService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>,
    private readonly secretsService: SecretsService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  async setupMFA(userId: string, userEmail: string): Promise<MFASetupResult> {
    try {
      const user = await this.userModel.findById(this.sanitizeUserId(userId));
      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.mfaEnabled) {
        throw new BadRequestException('MFA is already enabled for this user');
      }

      const secret = speakeasy.generateSecret({
        name: `Quantum-Safe Privacy Portal (${userEmail})`,
        issuer: 'Quantum-Safe Privacy Portal',
        length: 32,
      });

      const secretKey = `mfa_secret_${userId}`;
      await this.secretsService.storeSecret(secretKey, secret.base32);

      const qrCodeUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: userEmail,
        issuer: 'Quantum-Safe Privacy Portal',
        encoding: 'base32',
      });

      const backupCodes = this.generateBackupCodes();
      const backupCodesKey = `mfa_backup_codes_${userId}`;
      await this.secretsService.storeSecret(backupCodesKey, JSON.stringify(backupCodes));

      await this.auditTrailService.logSecurityEvent(
        'MFA_SETUP_INITIATED',
        { userId, email: userEmail },
        'SUCCESS',
      );

      this.logger.log(`MFA setup initiated for user ${userId}`);

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      await this.auditTrailService.logSecurityEvent(
        'MFA_SETUP_FAILED',
        { userId, error: error.message },
        'FAILURE',
      );
      this.logger.error(`MFA setup failed for user ${userId}:`, error);
      throw error;
    }
  }

  async verifyMFA(userId: string, token: string, enableMFA = false): Promise<MFAVerificationResult> {
    try {
      const user = await this.userModel.findById(this.sanitizeUserId(userId));
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const secretKey = `mfa_secret_${userId}`;
      const secret = await this.secretsService.getSecret(secretKey);

      if (!secret) {
        throw new UnauthorizedException('MFA not set up for this user');
      }

      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1,
        step: 30,
      });

      if (!verified) {
        const backupCodesKey = `mfa_backup_codes_${userId}`;
        const backupCodesJson = await this.secretsService.getSecret(backupCodesKey);

        if (backupCodesJson) {
          const backupCodes = JSON.parse(backupCodesJson);
          const backupCodeIndex = backupCodes.indexOf(token);

          if (backupCodeIndex !== -1) {
            backupCodes.splice(backupCodeIndex, 1);
            await this.secretsService.storeSecret(backupCodesKey, JSON.stringify(backupCodes));

            await this.auditTrailService.logSecurityEvent(
              'MFA_BACKUP_CODE_USED',
              { userId, remainingCodes: backupCodes.length },
              'SUCCESS',
            );

            if (enableMFA) {
              await this.enableMFAForUser(userId);
            }

            return { verified: true, message: 'Backup code verified successfully' };
          }
        }

        await this.auditTrailService.logSecurityEvent(
          'MFA_VERIFICATION_FAILED',
          { userId, tokenLength: token.length },
          'FAILURE',
        );

        return { verified: false, message: 'Invalid TOTP code or backup code' };
      }

      if (enableMFA) {
        await this.enableMFAForUser(userId);
      }

      await this.auditTrailService.logSecurityEvent(
        'MFA_VERIFICATION_SUCCESS',
        { userId },
        'SUCCESS',
      );

      this.logger.log(`MFA verification successful for user ${userId}`);
      return { verified: true, message: 'TOTP code verified successfully' };

    } catch (error) {
      await this.auditTrailService.logSecurityEvent(
        'MFA_VERIFICATION_ERROR',
        { userId, error: error.message },
        'FAILURE',
      );
      this.logger.error(`MFA verification error for user ${userId}:`, error);
      throw error;
    }
  }

  async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(this.sanitizeUserId(userId));
    return user?.mfaEnabled || false;
  }

  async disableMFA(userId: string): Promise<void> {
    try {
      const user = await this.userModel.findById(this.sanitizeUserId(userId));
      if (!user) {
        throw new BadRequestException('User not found');
      }

      await this.userModel.findByIdAndUpdate(this.sanitizeUserId(userId), {
        mfaEnabled: false,
        mfaEnabledAt: null,
      });

      const secretKey = `mfa_secret_${userId}`;
      const backupCodesKey = `mfa_backup_codes_${userId}`;

      await this.secretsService.deleteSecret(secretKey);
      await this.secretsService.deleteSecret(backupCodesKey);

      await this.auditTrailService.logSecurityEvent(
        'MFA_DISABLED',
        { userId },
        'SUCCESS',
      );

      this.logger.log(`MFA disabled for user ${userId}`);
    } catch (error) {
      await this.auditTrailService.logSecurityEvent(
        'MFA_DISABLE_FAILED',
        { userId, error: error.message },
        'FAILURE',
      );
      this.logger.error(`Failed to disable MFA for user ${userId}:`, error);
      throw error;
    }
  }

  private async enableMFAForUser(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(this.sanitizeUserId(userId), {
      mfaEnabled: true,
      mfaEnabledAt: new Date(),
    });

    await this.auditTrailService.logSecurityEvent(
      'MFA_ENABLED',
      { userId },
      'SUCCESS',
    );

    this.logger.log(`MFA enabled for user ${userId}`);
  }
  private generateBackupCodes(): string[] {
    const crypto = require('crypto');
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const randomBytes = crypto.randomBytes(4);
      const code = randomBytes.toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private sanitizeUserId(userId: string): string {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID');
    }
  
    // Validate MongoDB ObjectId format (24 hex characters)
    if (!/^[a-f\d]{24}$/i.test(userId)) {
      throw new BadRequestException('User ID format invalid');
    }
  
    return userId;
  }
}
