import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export enum PQCAlgorithm {
  KYBER_768 = 'kyber-768',
  DILITHIUM_3 = 'dilithium-3',
  HYBRID_MODE = 'hybrid',
}

export interface PQCFeatureFlagsConfig {
  pqc_key_generation: boolean;
  pqc_user_registration: boolean;
  pqc_authentication: boolean;
  pqc_jwt_signing: boolean;
  hybrid_mode: boolean;
}

export interface PQCRolloutPercentages {
  pqc_key_generation: number;
  pqc_user_registration: number;
  pqc_authentication: number;
  pqc_jwt_signing: number;
}

@Injectable()
export class PQCFeatureFlagsService {
  private readonly logger = new Logger(PQCFeatureFlagsService.name);

  private flags: PQCFeatureFlagsConfig = {
    pqc_key_generation: false,
    pqc_user_registration: false,
    pqc_authentication: false,
    pqc_jwt_signing: false,
    hybrid_mode: true,
  };

  private rolloutPercentages: PQCRolloutPercentages = {
    pqc_key_generation: 0,
    pqc_user_registration: 0,
    pqc_authentication: 0,
    pqc_jwt_signing: 0,
  };

  private algorithmPreferences = {
    kem_algorithm: PQCAlgorithm.KYBER_768,
    signature_algorithm: PQCAlgorithm.DILITHIUM_3,
    fallback_mode: PQCAlgorithm.HYBRID_MODE,
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeFromEnvironment();
  }

  private initializeFromEnvironment(): void {
    this.flags.pqc_key_generation = this.configService.get<boolean>('PQC_KEY_GENERATION_ENABLED', false);
    this.flags.pqc_user_registration = this.configService.get<boolean>('PQC_USER_REGISTRATION_ENABLED', false);
    this.flags.pqc_authentication = this.configService.get<boolean>('PQC_AUTHENTICATION_ENABLED', false);
    this.flags.pqc_jwt_signing = this.configService.get<boolean>('PQC_JWT_SIGNING_ENABLED', false);
    this.flags.hybrid_mode = true;

    this.rolloutPercentages.pqc_key_generation = this.configService.get<number>('PQC_KEY_GENERATION_PERCENTAGE', 0);
    this.rolloutPercentages.pqc_user_registration = this.configService.get<number>('PQC_USER_REGISTRATION_PERCENTAGE', 0);
    this.rolloutPercentages.pqc_authentication = this.configService.get<number>('PQC_AUTHENTICATION_PERCENTAGE', 0);
    this.rolloutPercentages.pqc_jwt_signing = this.configService.get<number>('PQC_JWT_SIGNING_PERCENTAGE', 0);

    this.logger.log('PQC Feature Flags initialized from environment variables');
    this.logger.debug(`Flags: ${JSON.stringify(this.flags)}`);
    this.logger.debug(`Rollout Percentages: ${JSON.stringify(this.rolloutPercentages)}`);
  }

  isEnabled(flagName: keyof PQCFeatureFlagsConfig, userId?: string): boolean {
    if (!this.flags[flagName]) {
      return false;
    }

    if (userId && flagName in this.rolloutPercentages) {
      const userHash = crypto.createHash('md5').update(userId).digest('hex');
      const userPercentage = parseInt(userHash.substring(0, 2), 16) % 100;
      const rolloutPercentage = this.rolloutPercentages[flagName as keyof PQCRolloutPercentages];
      return userPercentage < rolloutPercentage;
    }

    return true;
  }

  getAlgorithmForUser(operation: string, userId: string): PQCAlgorithm {
    const flagMapping: Record<string, keyof PQCFeatureFlagsConfig> = {
      key_generation: 'pqc_key_generation',
      user_registration: 'pqc_user_registration',
      authentication: 'pqc_authentication',
      jwt_signing: 'pqc_jwt_signing',
    };

    const flagName = flagMapping[operation];
    if (!flagName) {
      return this.algorithmPreferences.fallback_mode;
    }

    if (this.isEnabled(flagName, userId)) {
      if (['key_generation', 'user_registration', 'authentication'].includes(operation)) {
        return this.algorithmPreferences.kem_algorithm;
      } else if (operation === 'jwt_signing') {
        return this.algorithmPreferences.signature_algorithm;
      }
    }

    return this.algorithmPreferences.fallback_mode;
  }

  updateRolloutPercentage(flagName: keyof PQCRolloutPercentages, percentage: number): boolean {
    if (!(flagName in this.rolloutPercentages)) {
      this.logger.error(`Invalid flag name: ${flagName}`);
      return false;
    }

    if (percentage < 0 || percentage > 100) {
      this.logger.error(`Invalid percentage: ${percentage}. Must be between 0 and 100`);
      return false;
    }

    const oldPercentage = this.rolloutPercentages[flagName];
    this.rolloutPercentages[flagName] = percentage;

    this.logger.log(`Updated ${flagName} rollout from ${oldPercentage}% to ${percentage}%`);
    return true;
  }

  enableFlag(flagName: keyof PQCFeatureFlagsConfig): boolean {
    if (!(flagName in this.flags)) {
      this.logger.error(`Invalid flag name: ${flagName}`);
      return false;
    }

    this.flags[flagName] = true;
    this.logger.log(`Enabled flag: ${flagName}`);
    return true;
  }

  disableFlag(flagName: keyof PQCFeatureFlagsConfig): boolean {
    if (!(flagName in this.flags)) {
      this.logger.error(`Invalid flag name: ${flagName}`);
      return false;
    }

    if (flagName === 'hybrid_mode') {
      this.logger.warn('Cannot disable hybrid_mode - it\'s always enabled for safety');
      return false;
    }

    this.flags[flagName] = false;
    if (flagName in this.rolloutPercentages) {
      this.rolloutPercentages[flagName as keyof PQCRolloutPercentages] = 0;
    }
    this.logger.log(`Disabled flag: ${flagName}`);
    return true;
  }

  getStatus(): {
    flags: PQCFeatureFlagsConfig;
    rolloutPercentages: PQCRolloutPercentages;
    algorithmPreferences: Record<string, string>;
  } {
    return {
      flags: { ...this.flags },
      rolloutPercentages: { ...this.rolloutPercentages },
      algorithmPreferences: {
        kem_algorithm: this.algorithmPreferences.kem_algorithm,
        signature_algorithm: this.algorithmPreferences.signature_algorithm,
        fallback_mode: this.algorithmPreferences.fallback_mode,
      },
    };
  }

  disableAllPQCFlags(): void {
    const flagsToDisable: (keyof PQCFeatureFlagsConfig)[] = [
      'pqc_key_generation',
      'pqc_user_registration',
      'pqc_authentication',
      'pqc_jwt_signing',
    ];

    flagsToDisable.forEach(flagName => {
      this.disableFlag(flagName);
    });

    this.logger.error('All PQC flags disabled - system reverted to hybrid mode');
  }

  isPQCEnabledForUser(userId: string): {
    keyGeneration: boolean;
    userRegistration: boolean;
    authentication: boolean;
    jwtSigning: boolean;
  } {
    return {
      keyGeneration: this.isEnabled('pqc_key_generation', userId),
      userRegistration: this.isEnabled('pqc_user_registration', userId),
      authentication: this.isEnabled('pqc_authentication', userId),
      jwtSigning: this.isEnabled('pqc_jwt_signing', userId),
    };
  }
}
