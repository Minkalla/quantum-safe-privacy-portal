import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { MFAService } from './mfa.service';
import { SecretsService } from '../secrets/secrets.service';
import { AuditTrailService } from '../monitoring/audit-trail.service';
import * as speakeasy from 'speakeasy';

describe('MFAService', () => {
  let service: MFAService;
  let mockUserModel: any;
  let mockSecretsService: any;
  let mockAuditTrailService: any;

  const mockUser = {
    _id: 'user123456789012',
    email: 'test@example.com',
    mfaEnabled: false,
    mfaEnabledAt: null,
  };

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    mockSecretsService = {
      storeSecret: jest.fn(),
      getSecret: jest.fn(),
      deleteSecret: jest.fn(),
    };

    mockAuditTrailService = {
      logSecurityEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MFAService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: SecretsService,
          useValue: mockSecretsService,
        },
        {
          provide: AuditTrailService,
          useValue: mockAuditTrailService,
        },
      ],
    }).compile();

    service = module.get<MFAService>(MFAService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setupMFA', () => {
    it('should setup MFA for a user successfully', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockSecretsService.storeSecret.mockResolvedValue(undefined);

      const result = await service.setupMFA('user123456789012', 'test@example.com');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(mockSecretsService.storeSecret).toHaveBeenCalledTimes(2);
      expect(mockAuditTrailService.logSecurityEvent).toHaveBeenCalledWith(
        'MFA_SETUP_INITIATED',
        { userId: 'user123456789012', email: 'test@example.com' },
        'SUCCESS',
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.setupMFA('user123456789012', 'test@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if MFA already enabled', async () => {
      mockUserModel.findById.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      await expect(service.setupMFA('user123456789012', 'test@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyMFA', () => {
    const mockSecret = 'JBSWY3DPEHPK3PXP';

    beforeEach(() => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockSecretsService.getSecret.mockResolvedValue(mockSecret);
    });

    it('should verify TOTP code successfully', async () => {
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(true);

      const result = await service.verifyMFA('user123456789012', '123456');

      expect(result.verified).toBe(true);
      expect(result.message).toBe('TOTP code verified successfully');
      expect(mockAuditTrailService.logSecurityEvent).toHaveBeenCalledWith(
        'MFA_VERIFICATION_SUCCESS',
        { userId: 'user123456789012' },
        'SUCCESS',
      );
    });

    it('should verify backup code successfully', async () => {
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(false);
      const backupCodes = ['ABCD1234', 'EFGH5678'];
      mockSecretsService.getSecret
        .mockResolvedValueOnce(mockSecret)
        .mockResolvedValueOnce(JSON.stringify(backupCodes));

      const result = await service.verifyMFA('user123456789012', 'ABCD1234');

      expect(result.verified).toBe(true);
      expect(result.message).toBe('Backup code verified successfully');
      expect(mockSecretsService.storeSecret).toHaveBeenCalledWith(
        'mfa_backup_codes_user123',
        JSON.stringify(['EFGH5678']),
      );
    });

    it('should fail verification for invalid code', async () => {
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(false);
      mockSecretsService.getSecret
        .mockResolvedValueOnce(mockSecret)
        .mockResolvedValueOnce(JSON.stringify(['ABCD1234']));

      const result = await service.verifyMFA('user123456789012', '999999');

      expect(result.verified).toBe(false);
      expect(result.message).toBe('Invalid TOTP code or backup code');
      expect(mockAuditTrailService.logSecurityEvent).toHaveBeenCalledWith(
        'MFA_VERIFICATION_FAILED',
        { userId: 'user123456789012', tokenLength: 6 },
        'FAILURE',
      );
    });

    it('should enable MFA when enableMFA flag is true', async () => {
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(true);

      await service.verifyMFA('user123456789012', '123456', true);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user123456789012', {
        mfaEnabled: true,
        mfaEnabledAt: expect.any(Date),
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.verifyMFA('user123456789012', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if MFA not set up', async () => {
      mockSecretsService.getSecret.mockResolvedValue(null);

      await expect(service.verifyMFA('user123456789012', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('isMFAEnabled', () => {
    it('should return true if MFA is enabled', async () => {
      mockUserModel.findById.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      const result = await service.isMFAEnabled('user123456789012');

      expect(result).toBe(true);
    });

    it('should return false if MFA is not enabled', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.isMFAEnabled('user123456789012');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await service.isMFAEnabled('user123456789012');

      expect(result).toBe(false);
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA successfully', async () => {
      mockUserModel.findById.mockResolvedValue({ ...mockUser, mfaEnabled: true });
      mockSecretsService.deleteSecret.mockResolvedValue(undefined);

      await service.disableMFA('user123456789012');

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user123456789012', {
        mfaEnabled: false,
        mfaEnabledAt: null,
      });
      expect(mockSecretsService.deleteSecret).toHaveBeenCalledTimes(2);
      expect(mockAuditTrailService.logSecurityEvent).toHaveBeenCalledWith(
        'MFA_DISABLED',
        { userId: 'user123456789012' },
        'SUCCESS',
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.disableMFA('user123456789012')).rejects.toThrow(BadRequestException);
    });
  });
});
