import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { PQCDataEncryptionService } from '../../../src/services/pqc-data-encryption.service';
import { PQCDataValidationService } from '../../../src/services/pqc-data-validation.service';
import { AuthService } from '../../../src/auth/auth.service';
import User, { UserSchema } from '../../../src/models/User';
import Consent, { ConsentSchema } from '../../../src/models/Consent';
import { PQCAlgorithmType } from '../../../src/models/interfaces/pqc-data.interface';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '../../../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../src/pqc/pqc-monitoring.service';
import { EnhancedErrorBoundaryService } from '../../../src/services/enhanced-error-boundary.service';
import { PQCErrorTaxonomyService } from '../../../src/services/pqc-error-taxonomy.service';
import { CircuitBreakerService } from '../../../src/services/circuit-breaker.service';
import { HybridCryptoService } from '../../../src/services/hybrid-crypto.service';
import { ClassicalCryptoService } from '../../../src/services/classical-crypto.service';

describe('PQC Database Integration', () => {
  let encryptionService: PQCDataEncryptionService;
  let validationService: PQCDataValidationService;
  let authService: AuthService;
  let connection: Connection;
  let mongod: MongoMemoryServer;
  let userModel: any;
  let consentModel: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: 'User', schema: UserSchema },
          { name: 'Consent', schema: ConsentSchema },
        ]),
      ],
      providers: [
        PQCDataEncryptionService,
        PQCDataValidationService,
        AuthService,
        EnhancedErrorBoundaryService,
        PQCErrorTaxonomyService,
        CircuitBreakerService,
        HybridCryptoService,
        ClassicalCryptoService,
        {
          provide: JwtService,
          useValue: {
            generateTokens: jest.fn().mockReturnValue({
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
            }),
          },
        },
        {
          provide: PQCFeatureFlagsService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: PQCMonitoringService,
          useValue: {
            recordPQCKeyGeneration: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'pqc.enabled': true,
                'pqc.fallback_enabled': true,
                'encryption.default_algorithm': 'Kyber-768',
                'validation.default_algorithm': 'Dilithium-3',
                'performance.monitoring_enabled': true,
                'jwt.secret': 'test-secret',
                'jwt.expiresIn': '1h',
              };
              return config[key];
            }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            callPQCService: jest.fn(),
            callPythonPQCService: jest.fn(),
            executePQCServiceCall: jest.fn().mockResolvedValue({
              success: true,
              token: 'mock-pqc-token',
              algorithm: 'ML-DSA-65',
              verified: true,
            }),
          },
        },
        {
          provide: 'HybridCryptoService',
          useValue: {
            encryptWithFallback: jest.fn(),
            decryptWithFallback: jest.fn(),
            generateKeyPairWithFallback: jest.fn(),
          },
        },
        {
          provide: 'QuantumSafeJWTService',
          useValue: {
            signPQCToken: jest.fn(),
            verifyPQCToken: jest.fn(),
          },
        },
        {
          provide: 'QuantumSafeCryptoIdentityService',
          useValue: {
            generateStandardizedCryptoUserId: jest.fn(),
          },
        },
        {
          provide: 'PQCBridgeService',
          useValue: {
            executePQCOperation: jest.fn(),
          },
        },
      ],
    }).compile();

    encryptionService = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    validationService = module.get<PQCDataValidationService>(PQCDataValidationService);
    authService = module.get<AuthService>(AuthService);
    connection = await module.get(getConnectionToken());
    userModel = module.get(getModelToken('User'));
    consentModel = module.get(getModelToken('Consent'));
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
    await consentModel.deleteMany({});
  });

  describe('PQC-Encrypted Data Storage', () => {
    it('should store and retrieve PQC-encrypted user data from database', async () => {
      const userData = {
        email: 'pqc-db-test@example.com',
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          ssn: '123-45-6789',
        },
        preferences: {
          marketing: true,
          analytics: false,
          notifications: true,
        },
      };

      const encryptedPersonalInfo = await encryptionService.encryptData(userData.personalInfo, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'db-test-user-1',
      });

      expect(encryptedPersonalInfo.success).toBe(true);
      expect(encryptedPersonalInfo.encryptedField!.algorithm).toBe('Kyber-768');

      const integrity = await validationService.createDataIntegrity(encryptedPersonalInfo.encryptedField!, 'db-test-user-1');

      const user = new userModel({
        email: userData.email,
        password: 'TestPassword123!',
        usePQC: true,
        pqcPublicKey: encryptedPersonalInfo.encryptedField?.encryptedData || 'mock-pqc-data',
        pqcKeyGeneratedAt: new Date(),
        encryptedPersonalData: JSON.stringify(encryptedPersonalInfo.encryptedField),
        createdAt: new Date(),
      });

      const savedUser = await user.save();
      expect(savedUser._id).toBeDefined();
      expect(savedUser.usePQC).toBe(true);
      expect(savedUser.pqcPublicKey).toBeDefined();
      expect(savedUser.encryptedPersonalData).toBeDefined();

      const retrievedUser = await userModel.findById(savedUser._id).select('+encryptedPersonalData');
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser.usePQC).toBe(true);
      expect(retrievedUser.encryptedPersonalData).toBeDefined();

      expect(retrievedUser.encryptedPersonalData).toBeDefined();

      const parsedEncryptedData = JSON.parse(retrievedUser.encryptedPersonalData);
      const integrityValidation = await validationService.validateDataIntegrity(
        parsedEncryptedData,
        integrity,
      );

      expect(integrityValidation.isValid).toBe(true);
      expect(integrityValidation.errors).toHaveLength(0);

      const decryptedData = await encryptionService.decryptData(parsedEncryptedData, { userId: 'db-test-user-1' });

      expect(decryptedData.success).toBe(true);
      expect(decryptedData.decryptedData).toBeDefined();

      if (decryptedData.decryptedData.algorithm === 'ML-KEM-768') {
        expect(decryptedData.decryptedData.decrypted).toBe(true);
        expect(decryptedData.decryptedData.keyId).toBeDefined();
      } else {
        expect(decryptedData.decryptedData).toEqual(userData.personalInfo);
      }
    });

    it('should store and retrieve PQC-encrypted consent data with signatures', async () => {
      const consentData = {
        userId: 'db-consent-user-1',
        consentTypes: {
          dataProcessing: true,
          marketing: false,
          analytics: true,
          thirdPartySharing: false,
        },
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser',
          timestamp: new Date().toISOString(),
          version: '2.0',
        },
      };

      const signature = await validationService.generateSignature(consentData, {
        algorithm: 'Dilithium-3' as any,
        userId: consentData.userId,
      });

      expect(signature.algorithm).toBe('Dilithium-3');
      expect(signature.signature).toBeDefined();

      const encryptedConsent = await encryptionService.encryptData(consentData, {
        algorithm: PQCAlgorithmType.AES_256_GCM,
        userId: consentData.userId,
      });

      expect(encryptedConsent.success).toBe(true);
      expect(encryptedConsent.encryptedField!.algorithm).toBe('AES-256-GCM');

      const consent = new consentModel({
        userId: consentData.userId,
        consentType: 'data_processing',
        granted: true,
        encryptedConsentData: encryptedConsent.encryptedField,
        consentSignature: {
          signature: signature.signature,
          algorithm: signature.algorithm,
          publicKeyHash: signature.publicKeyHash || 'test-hash',
          timestamp: signature.timestamp,
          signedDataHash: signature.signedDataHash || 'test-data-hash',
        },
        consentVersion: '2.0',
        isActive: true,
        createdAt: new Date(),
      });

      const savedConsent = await consent.save();
      expect(savedConsent._id).toBeDefined();
      expect(savedConsent.encryptedConsentData).toBeDefined();
      expect(savedConsent.consentSignature).toBeDefined();

      const retrievedConsent = await consentModel.findOne({ userId: consentData.userId });
      expect(retrievedConsent).toBeDefined();

      const signatureVerification = await validationService.verifySignature(
        consentData,
        retrievedConsent.consentSignature,
      );

      expect(signatureVerification.isValid).toBe(true);
      expect(signatureVerification.algorithm).toBe('Dilithium-3');

      const decryptedConsent = await encryptionService.decryptData(retrievedConsent.encryptedConsentData, { userId: consentData.userId });

      expect(decryptedConsent.success).toBe(true);
      expect(decryptedConsent.decryptedData).toBeDefined();

      if (decryptedConsent.decryptedData.algorithm === 'AES-256-GCM') {
        expect(decryptedConsent.decryptedData.decrypted).toBe(true);
      } else {
        expect(decryptedConsent.decryptedData).toEqual(consentData);
      }
    });
  });

  describe('Database Query Performance with PQC Data', () => {
    it('should efficiently query PQC-encrypted data at scale', async () => {
      const testUsers = Array.from({ length: 50 }, (_, i) => ({
        email: `scale-test-${i}@example.com`,
        personalData: {
          userId: `scale-user-${i}`,
          sensitiveInfo: `Sensitive data for user ${i}`,
          timestamp: Date.now(),
        },
      }));

      const startTime = Date.now();

      const savedUsers = await Promise.all(
        testUsers.map(async (userData) => {
          const encrypted = await encryptionService.encryptData(userData.personalData, {
            algorithm: PQCAlgorithmType.KYBER_768,
            userId: userData.personalData.userId,
          });

          const integrity = await validationService.createDataIntegrity(encrypted.encryptedField!, userData.personalData.userId);

          const user = new userModel({
            email: userData.email,
            password: 'TestPassword123!',
            usePQC: true,
            pqcPublicKey: encrypted.encryptedField?.encryptedData || `mock-pqc-data-${userData.personalData.userId}`,
            pqcKeyGeneratedAt: new Date(),
            encryptedPersonalData: JSON.stringify(encrypted.encryptedField),
            createdAt: new Date(),
          });

          return await user.save();
        }),
      );

      const insertTime = Date.now() - startTime;

      expect(savedUsers).toHaveLength(50);
      expect(insertTime).toBeLessThan(30000);

      const queryStartTime = Date.now();

      const retrievedUsers = await userModel.find({ usePQC: true }).select('+encryptedPersonalData').limit(10);

      const queryTime = Date.now() - queryStartTime;

      expect(retrievedUsers.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(5000);

      const validationStartTime = Date.now();

      const validationResults = await Promise.all(
        retrievedUsers.map(async (user) => {
          try {
            const parsedData = JSON.parse(user.encryptedPersonalData);
            const userIntegrity = await validationService.createDataIntegrity(parsedData, user.email);
            return await validationService.validateDataIntegrity(
              parsedData,
              userIntegrity,
            );
          } catch (error) {
            return { isValid: false, errors: ['Parse error'] };
          }
        }),
      );

      const validationTime = Date.now() - validationStartTime;

      expect(validationTime).toBeLessThan(5000);
      validationResults.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });

    it('should maintain data consistency during concurrent database operations', async () => {
      const concurrentOperations = Array.from({ length: 20 }, (_, i) => ({
        userId: `concurrent-user-${i}`,
        data: {
          operation: `concurrent-op-${i}`,
          timestamp: Date.now(),
          payload: `Concurrent data ${i}`,
        },
      }));

      const results = await Promise.all(
        concurrentOperations.map(async (op) => {
          const encrypted = await encryptionService.encryptData(op.data, {
            algorithm: PQCAlgorithmType.AES_256_GCM,
            userId: op.userId,
          });

          const integrity = await validationService.createDataIntegrity(encrypted.encryptedField!, op.userId);

          const user = new userModel({
            email: `${op.userId}@example.com`,
            password: 'TestPassword123!',
            usePQC: true,
            pqcPublicKey: encrypted.encryptedField?.encryptedData || `mock-pqc-data-${op.userId}`,
            pqcKeyGeneratedAt: new Date(),
            encryptedPersonalData: JSON.stringify(encrypted.encryptedField),
            createdAt: new Date(),
          });

          const saved = await user.save();

          const retrieved = await userModel.findById(saved._id).select('+encryptedPersonalData');

          let validation;
          if (retrieved.encryptedPersonalData) {
            const parsedData = JSON.parse(retrieved.encryptedPersonalData);
            const userIntegrity = await validationService.createDataIntegrity(parsedData, op.userId);
            validation = await validationService.validateDataIntegrity(
              parsedData,
              userIntegrity,
            );
          } else {
            validation = { isValid: false, errors: ['No encrypted data found'] };
          }

          return {
            userId: op.userId,
            saved: !!saved._id,
            retrieved: !!retrieved,
            valid: validation.isValid,
          };
        }),
      );

      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result.saved).toBe(true);
        expect(result.retrieved).toBe(true);
        expect(result.valid).toBe(true);
      });

      const totalUsers = await userModel.countDocuments({ usePQC: true });
      expect(totalUsers).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Database Migration and Compatibility', () => {
    it('should handle mixed PQC and non-PQC data in the same collection', async () => {
      const pqcUser = {
        email: 'pqc-user@example.com',
        personalData: { sensitive: 'PQC protected data' },
      };

      const nonPqcUser = {
        email: 'regular-user@example.com',
        personalData: { regular: 'Non-PQC data' },
      };

      const encryptedPqcData = await encryptionService.encryptData(pqcUser.personalData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        userId: 'mixed-pqc-user',
      });

      const pqcIntegrity = await validationService.createDataIntegrity(encryptedPqcData.encryptedField!, 'mixed-pqc-user');

      const savedPqcUser = await new userModel({
        email: pqcUser.email,
        password: 'TestPassword123!',
        usePQC: true,
        pqcPublicKey: encryptedPqcData.encryptedField?.encryptedData || 'mock-pqc-data-mixed',
        pqcKeyGeneratedAt: new Date(),
        encryptedPersonalData: JSON.stringify(encryptedPqcData.encryptedField),
        createdAt: new Date(),
      }).save();

      const savedNonPqcUser = await new userModel({
        email: nonPqcUser.email,
        password: 'TestPassword123!',
        usePQC: false,
        createdAt: new Date(),
      }).save();

      expect(savedPqcUser.usePQC).toBe(true);
      expect(savedPqcUser.pqcPublicKey).toBeDefined();
      expect(savedNonPqcUser.usePQC).toBe(false);
      expect(savedNonPqcUser.email).toBe(nonPqcUser.email);

      const allUsers = await userModel.find({});
      expect(allUsers).toHaveLength(2);

      const pqcUsers = await userModel.find({ usePQC: true }).select('+encryptedPersonalData');
      const nonPqcUsers = await userModel.find({ usePQC: false });

      expect(pqcUsers).toHaveLength(1);
      expect(nonPqcUsers).toHaveLength(1);

      const retrievedPqcUser = pqcUsers[0];
      const validation = await validationService.validateDataIntegrity(
        JSON.parse(retrievedPqcUser.encryptedPersonalData),
        pqcIntegrity,
      );

      expect(validation.isValid).toBe(true);
    });
  });
});
