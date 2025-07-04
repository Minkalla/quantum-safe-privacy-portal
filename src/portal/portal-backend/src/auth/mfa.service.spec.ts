import { TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { MFAService } from './mfa.service';
import { SecretsService } from '../secrets/secrets.service';
import { AuditTrailService } from '../monitoring/audit-trail.service';
import { createTestModule } from '../test-utils/createTestModule';
import * as speakeasy from 'speakeasy';

describe('MFAService', () => {
  let service: MFAService;
  let module: TestingModule;
  let secretsService: SecretsService;
  let auditTrailService: AuditTrailService;

  const mockUser = {
    _id: '60d5ec49f1a23c001c8a4d7d',
    email: 'test@example.com',
    mfaEnabled: false,
    mfaEnabledAt: null,
  };

  beforeEach(async () => {
    module = await createTestModule({
      providers: [
        MFAService,
        AuditTrailService,
      ],
    });

    await module.init();
    service = module.get<MFAService>(MFAService);
    secretsService = module.get<SecretsService>(SecretsService);
    auditTrailService = module.get<AuditTrailService>(AuditTrailService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setupMFA', () => {
    it('should setup MFA for a user successfully', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue(mockUser);

      const result = await service.setupMFA('60d5ec49f1a23c001c8a4d7d', 'test@example.com');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should throw BadRequestException if user not found', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue(null);

      await expect(service.setupMFA('60d5ec49f1a23c001c8a4d7d', 'test@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if MFA already enabled', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      await expect(service.setupMFA('60d5ec49f1a23c001c8a4d7d', 'test@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyMFA', () => {
    const mockSecret = 'JBSWY3DPEHPK3PXP';

    it('should verify TOTP code successfully', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue(mockUser);

      const originalVerify = speakeasy.totp.verify;
      speakeasy.totp.verify = () => true;

      try {
        const result = await service.verifyMFA('60d5ec49f1a23c001c8a4d7d', '123456');
        expect(result.verified).toBe(true);
        expect(result.message).toBe('TOTP code verified successfully');
      } finally {
        speakeasy.totp.verify = originalVerify;
      }
    });

    it('should verify backup code successfully', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'test-secret-id',
      });

      const originalVerify = speakeasy.totp.verify;
      speakeasy.totp.verify = jest.fn().mockReturnValue(false);

      const backupCodes = ['ABCD1234', 'EFGH5678'];

      const mockSecretsService = {
        getSecret: jest.fn().mockImplementation(async (key: string) => {
          if (key.includes('mfa_secret')) return mockSecret;
          if (key.includes('backup_codes')) return JSON.stringify(backupCodes);
          throw new Error('Secret not found');
        }),
        storeSecret: jest.fn().mockResolvedValue(undefined),
        deleteSecret: jest.fn().mockResolvedValue(undefined),
      };

      (service as any).secretsService = mockSecretsService;

      try {
        const result = await service.verifyMFA('60d5ec49f1a23c001c8a4d7d', 'ABCD1234');
        expect(result.verified).toBe(true);
        expect(result.message).toBe('Backup code verified successfully');

        expect(mockSecretsService.storeSecret).toHaveBeenCalledWith(
          'mfa_backup_codes_60d5ec49f1a23c001c8a4d7d',
          JSON.stringify(['EFGH5678']),
        );
      } finally {
        speakeasy.totp.verify = originalVerify;
        (service as any).secretsService = secretsService;
      }
    });

    it('should fail verification for invalid code', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue(mockUser);

      const originalVerify = speakeasy.totp.verify;
      speakeasy.totp.verify = () => false;

      secretsService.getSecret = async (key: string) => {
        if (key.includes('mfa_secret')) return mockSecret;
        if (key.includes('backup_codes')) return JSON.stringify(['ABCD1234']);
        throw new Error('Secret not found');
      };

      try {
        const result = await service.verifyMFA('60d5ec49f1a23c001c8a4d7d', '999999');
        expect(result.verified).toBe(false);
        expect(result.message).toBe('Invalid TOTP code or backup code');
      } finally {
        speakeasy.totp.verify = originalVerify;
      }
    });

    it('should enable MFA when enableMFA flag is true', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue(mockUser);

      const originalVerify = speakeasy.totp.verify;
      speakeasy.totp.verify = () => true;

      try {
        await service.verifyMFA('60d5ec49f1a23c001c8a4d7d', '123456', true);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('60d5ec49f1a23c001c8a4d7d', {
          mfaEnabled: true,
          mfaEnabledAt: expect.any(Date),
        });
      } finally {
        speakeasy.totp.verify = originalVerify;
      }
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue(null);

      await expect(service.verifyMFA('60d5ec49f1a23c001c8a4d7d', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if MFA not set up', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
        mfaSecret: null,
      });

      const mockSecretsService = {
        getSecret: jest.fn().mockRejectedValue(new Error('Secret not found')),
        storeSecret: jest.fn().mockResolvedValue(undefined),
        deleteSecret: jest.fn().mockResolvedValue(undefined),
      };

      (service as any).secretsService = mockSecretsService;

      try {
        await expect(service.verifyMFA('60d5ec49f1a23c001c8a4d7d', '123456')).rejects.toThrow(
          UnauthorizedException,
        );
      } finally {
        (service as any).secretsService = secretsService;
      }
    });
  });

  describe('isMFAEnabled', () => {
    it('should return true if MFA is enabled', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      const result = await service.isMFAEnabled('60d5ec49f1a23c001c8a4d7d');

      expect(result).toBe(true);
    });

    it('should return false if MFA is not enabled', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue(mockUser);

      const result = await service.isMFAEnabled('60d5ec49f1a23c001c8a4d7d');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue(null);

      const result = await service.isMFAEnabled('60d5ec49f1a23c001c8a4d7d');

      expect(result).toBe(false);
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA successfully', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      await service.disableMFA('60d5ec49f1a23c001c8a4d7d');

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('60d5ec49f1a23c001c8a4d7d', {
        mfaEnabled: false,
        mfaEnabledAt: null,
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      const userModel = module.get(getModelToken('User'));
      userModel.findById.mockResolvedValue(null);

      await expect(service.disableMFA('60d5ec49f1a23c001c8a4d7d')).rejects.toThrow(BadRequestException);
    });
  });
});
