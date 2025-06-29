import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataMigrationService } from '../data-migration.service';
import { HybridCryptoService } from '../hybrid-crypto.service';
import { PQCDataEncryptionService } from '../pqc-data-encryption.service';
import { BulkEncryptionService } from '../bulk-encryption.service';
import { IUser } from '../../models/User';
import { IConsent } from '../../models/Consent';

describe('DataMigrationService', () => {
  let service: DataMigrationService;
  let userModel: jest.Mocked<Model<IUser>>;
  let consentModel: jest.Mocked<Model<IConsent>>;
  let hybridCryptoService: jest.Mocked<HybridCryptoService>;
  let pqcService: jest.Mocked<PQCDataEncryptionService>;
  let bulkEncryption: jest.Mocked<BulkEncryptionService>;

  beforeEach(async () => {
    const mockUserModel = {
      find: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn(),
    };

    const mockConsentModel = {
      find: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn(),
    };

    const mockHybridCryptoService = {
      encryptWithFallback: jest.fn(),
      decryptWithFallback: jest.fn(),
      generateKeyPairWithFallback: jest.fn(),
    };

    const mockPqcService = {
      encryptData: jest.fn(),
      decryptData: jest.fn(),
    };

    const mockBulkEncryption = {
      encryptBatch: jest.fn(),
      decryptBatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataMigrationService,
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: getModelToken('Consent'), useValue: mockConsentModel },
        { provide: HybridCryptoService, useValue: mockHybridCryptoService },
        { provide: PQCDataEncryptionService, useValue: mockPqcService },
        { provide: BulkEncryptionService, useValue: mockBulkEncryption },
      ],
    }).compile();

    service = module.get<DataMigrationService>(DataMigrationService);
    userModel = module.get(getModelToken('User'));
    consentModel = module.get(getModelToken('Consent'));
    hybridCryptoService = module.get(HybridCryptoService);
    pqcService = module.get(PQCDataEncryptionService);
    bulkEncryption = module.get(BulkEncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('migrateToPQC', () => {
    it('should return zero counts when migration is disabled', async () => {
      process.env.MIGRATION_ENABLED = 'false';

      const result = await service.migrateToPQC();

      expect(result.migrated).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should migrate users and consents when enabled', async () => {
      process.env.MIGRATION_ENABLED = 'true';
      
      const mockUsers = [
        { _id: 'user1', email: 'user1@test.com', cryptoVersion: 'placeholder' },
        { _id: 'user2', email: 'user2@test.com', cryptoVersion: 'placeholder' },
      ];
      
      const mockConsents = [
        { _id: 'consent1', userId: 'user1', cryptoVersion: 'placeholder' },
      ];

      userModel.find.mockResolvedValue(mockUsers as any);
      consentModel.find.mockResolvedValue(mockConsents as any);

      jest.spyOn(service, 'migrateUserData').mockResolvedValue({
        success: true,
        algorithm: 'ML-KEM-768',
        migratedFields: 2,
      });

      jest.spyOn(service, 'migrateConsentData').mockResolvedValue({
        success: true,
        algorithm: 'ML-KEM-768',
        migratedFields: 1,
      });

      const result = await service.migrateToPQC();

      expect(result.migrated).toBe(3);
      expect(result.failed).toBe(0);
      expect(service.migrateUserData).toHaveBeenCalledTimes(2);
      expect(service.migrateConsentData).toHaveBeenCalledTimes(1);
    });
  });

  describe('migrateUserData', () => {
    it('should migrate user from placeholder to PQC', async () => {
      const userId = 'test-user-id';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        cryptoVersion: 'placeholder',
        encryptedEmail: 'old-encrypted-email',
        encryptedPersonalData: 'old-encrypted-data',
      };

      const mockKeyPair = {
        publicKey: 'new-public-key',
        privateKey: 'new-private-key',
        algorithm: 'RSA-2048',
      };

      const mockEncryptionResult = {
        algorithm: 'ML-KEM-768' as const,
        ciphertext: 'new-encrypted-data',
        fallbackUsed: false,
      };

      userModel.findById.mockResolvedValue(mockUser as any);
      hybridCryptoService.generateKeyPairWithFallback.mockResolvedValue(mockKeyPair);
      hybridCryptoService.encryptWithFallback.mockResolvedValue(mockEncryptionResult);
      userModel.updateOne.mockResolvedValue({ acknowledged: true } as any);

      const result = await service.migrateUserData(userId);

      expect(result.success).toBe(true);
      expect(result.algorithm).toBe('ML-KEM-768');
      expect(result.migratedFields).toBe(2);
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: userId },
        expect.objectContaining({
          cryptoVersion: 'pqc-real',
          backupCryptoVersion: 'placeholder',
          cryptoAlgorithm: 'ML-KEM-768',
          migrationDate: expect.any(Date),
        })
      );
    });

    it('should skip migration for already migrated users', async () => {
      const userId = 'test-user-id';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        cryptoVersion: 'pqc-real',
      };

      userModel.findById.mockResolvedValue(mockUser as any);

      const result = await service.migrateUserData(userId);

      expect(result.success).toBe(true);
      expect(result.algorithm).toBe('pqc-real');
      expect(result.migratedFields).toBe(0);
      expect(hybridCryptoService.generateKeyPairWithFallback).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-user';
      userModel.findById.mockResolvedValue(null);

      await expect(service.migrateUserData(userId)).rejects.toThrow('User not found: non-existent-user');
    });
  });

  describe('rollbackPQC', () => {
    it('should rollback users and consents', async () => {
      const mockUsers = [
        { _id: 'user1', cryptoVersion: 'pqc-real', backupCryptoVersion: 'placeholder' },
      ];
      
      const mockConsents = [
        { _id: 'consent1', cryptoVersion: 'pqc-real', backupCryptoVersion: 'placeholder' },
      ];

      userModel.find.mockResolvedValue(mockUsers as any);
      consentModel.find.mockResolvedValue(mockConsents as any);

      jest.spyOn(service, 'rollbackUserData').mockResolvedValue({
        success: true,
        rolledBackFields: 2,
      });

      jest.spyOn(service, 'rollbackConsentData').mockResolvedValue({
        success: true,
        rolledBackFields: 1,
      });

      const result = await service.rollbackPQC();

      expect(result.rolledBack).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('getMigrationStatus', () => {
    it('should return migration progress statistics', async () => {
      userModel.countDocuments.mockReturnValueOnce(Promise.resolve(8) as any);
      userModel.countDocuments.mockReturnValueOnce(Promise.resolve(5) as any);
      userModel.countDocuments.mockReturnValueOnce(Promise.resolve(3) as any);

      const result = await service.getMigrationStatus();

      expect(result.totalUsers).toBe(8);
      expect(result.placeholderUsers).toBe(5);
      expect(result.migratedUsers).toBe(3);
      expect(result.migrationProgress).toBe(37.5);
    });
  });
});
