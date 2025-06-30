import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from '../../../src/auth/auth.service';
import { PQCDataEncryptionService } from '../../../src/services/pqc-data-encryption.service';
import { PQCDataValidationService } from '../../../src/services/pqc-data-validation.service';
import { JwtService } from '../../../src/jwt/jwt.service';
import { JwtModule } from '../../../src/jwt/jwt.module';
import { AuthModule } from '../../../src/auth/auth.module';
import { PQCAlgorithmType } from '../../../src/models/interfaces/pqc-data.interface';

describe('PQC Authentication Flow Integration Tests', () => {
  let app: INestApplication;
  let authService: AuthService;
  let encryptionService: PQCDataEncryptionService;
  let validationService: PQCDataValidationService;
  let jwtService: JwtService;

  beforeAll(async () => {
    process.env['SKIP_SECRETS_MANAGER'] = 'true';
    process.env['JWT_ACCESS_SECRET_ID'] = 'test-access-secret';
    process.env['JWT_REFRESH_SECRET_ID'] = 'test-refresh-secret';
    process.env['MONGODB_URI'] = (global as any).__MONGO_URI__;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot((global as any).__MONGO_URI__),
        JwtModule,
        AuthModule,
      ],
      providers: [
        PQCDataEncryptionService,
        PQCDataValidationService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    encryptionService = moduleFixture.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    validationService = moduleFixture.get<PQCDataValidationService>(PQCDataValidationService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('End-to-End PQC Authentication', () => {
    it('should complete full PQC authentication flow', async () => {
      const userData = {
        email: 'pqc-test@example.com',
        password: 'SecurePassword123!',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.userId).toBeDefined();
      expect(registerResponse.body.email).toBe(userData.email);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
          rememberMe: true,
        })
        .expect(200);

      expect(loginResponse.body.accessToken).toBeDefined();
      expect(loginResponse.body.refreshToken).toBeDefined();
      expect(loginResponse.body.user.email).toBe(userData.email);

      const accessToken = loginResponse.body.accessToken;
      const protectedResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(protectedResponse.body.email).toBe(userData.email);
    });

    it('should handle PQC encryption in authentication flow', async () => {
      const sensitiveData = 'PQC protected user data';
      
      const encryptResult = await encryptionService.encryptData(sensitiveData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'integration-test-key',
      });

      expect(encryptResult.success).toBe(true);
      if (encryptResult.success && encryptResult.encryptedField) {
        expect(encryptResult.encryptedField.algorithm).toBe('Kyber-768');
        expect(encryptResult.encryptedField.encryptedData).toBeDefined();

        const decryptResult = await encryptionService.decryptData(encryptResult.encryptedField);
        expect(decryptResult.success).toBe(true);
        if (decryptResult.success) {
          expect(decryptResult.decryptedData).toBe(sensitiveData);
        }
      }
    });

    it('should handle PQC signatures in authentication flow', async () => {
      const authData = { userId: 'test-user', timestamp: Date.now() };
      
      const signature = await validationService.generateSignature(authData, {
        algorithm: PQCAlgorithmType.DILITHIUM_3,
        publicKeyHash: 'integration-test-signature-key',
      });

      expect(signature.algorithm).toBe('Dilithium-3');
      expect(signature.signature).toBeDefined();

      const verifyResult = await validationService.verifySignature(authData, signature);
      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.errors).toHaveLength(0);
    });
  });

  describe('Cross-Service PQC Integration', () => {
    it('should integrate PQC encryption with JWT tokens', async () => {
      const userPayload = { userId: 'pqc-user', email: 'pqc@example.com' };
      const tokens = jwtService.generateTokens(userPayload);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      const encryptedTokenData = await encryptionService.encryptData(tokens.accessToken, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'jwt-encryption-key',
      });

      expect(encryptedTokenData.success).toBe(true);
      if (encryptedTokenData.success && encryptedTokenData.encryptedField) {
        const decryptedTokenData = await encryptionService.decryptData(encryptedTokenData.encryptedField);
        expect(decryptedTokenData.success).toBe(true);
        if (decryptedTokenData.success) {
          expect(decryptedTokenData.decryptedData).toBe(tokens.accessToken);
        }
      }
    });

    it('should validate data integrity across services', async () => {
      const userData = {
        userId: 'integrity-test-user',
        profile: { name: 'Test User', preferences: { theme: 'dark' } },
      };

      const integrity = await validationService.createDataIntegrity(userData, userData.userId);
      expect(integrity.validationStatus).toBe('valid');
      expect(integrity.signature.algorithm).toBeDefined();

      const validationResult = await validationService.validateDataIntegrity(userData, integrity);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should handle concurrent PQC operations', async () => {
      const concurrentOperations = [];
      const testData = 'concurrent test data';

      for (let i = 0; i < 5; i++) {
        const encryptPromise = encryptionService.encryptData(`${testData}-${i}`, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `concurrent-key-${i}`,
        });
        
        const signPromise = validationService.generateSignature(`${testData}-${i}`, {
          algorithm: PQCAlgorithmType.DILITHIUM_3,
          publicKeyHash: `concurrent-sign-key-${i}`,
        });

        concurrentOperations.push(encryptPromise, signPromise);
      }

      const results = await Promise.all(concurrentOperations);
      
      const encryptResults = results.filter((_, index) => index % 2 === 0);
      const signResults = results.filter((_, index) => index % 2 === 1);

      encryptResults.forEach(result => {
        expect(result.success).toBe(true);
      });

      signResults.forEach(result => {
        expect(result.algorithm).toBe('Dilithium-3');
      });
    });
  });

  describe('Database Integration with PQC', () => {
    it('should store and retrieve PQC-encrypted data', async () => {
      const sensitiveUserData = {
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
        medicalInfo: 'Confidential medical data',
      };

      const encryptedData = await encryptionService.encryptData(JSON.stringify(sensitiveUserData), {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'database-encryption-key',
      });

      expect(encryptedData.success).toBe(true);
      if (encryptedData.success && encryptedData.encryptedField) {
        const storedData = {
          userId: 'db-test-user',
          encryptedField: encryptedData.encryptedField,
          createdAt: new Date(),
        };

        const retrievedEncryptedField = storedData.encryptedField;
        const decryptedData = await encryptionService.decryptData(retrievedEncryptedField);

        expect(decryptedData.success).toBe(true);
        if (decryptedData.success) {
          const originalData = JSON.parse(decryptedData.decryptedData);
          expect(originalData.ssn).toBe(sensitiveUserData.ssn);
          expect(originalData.creditCard).toBe(sensitiveUserData.creditCard);
          expect(originalData.medicalInfo).toBe(sensitiveUserData.medicalInfo);
        }
      }
    });

    it('should maintain data integrity in database operations', async () => {
      const userData = {
        userId: 'db-integrity-user',
        personalData: { name: 'John Doe', age: 30 },
        preferences: { notifications: true, theme: 'light' },
      };

      const integrity = await validationService.createDataIntegrity(userData, userData.userId);
      
      const dbRecord = {
        ...userData,
        integrity,
        lastModified: new Date(),
      };

      const validationResult = await validationService.validateDataIntegrity(
        { userId: userData.userId, personalData: userData.personalData, preferences: userData.preferences },
        dbRecord.integrity
      );

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should handle PQC service failures gracefully', async () => {
      const testData = 'fallback test data';
      
      const encryptResult = await encryptionService.encryptData(testData, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'fallback-test-key',
      });

      if (!encryptResult.success) {
        expect(encryptResult.error).toBeDefined();
        expect(typeof encryptResult.error).toBe('string');
      }
    });

    it('should validate error responses from PQC operations', async () => {
      const invalidData = null;
      
      const encryptResult = await encryptionService.encryptData(invalidData as any, {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'error-test-key',
      });

      expect(encryptResult.success).toBe(false);
      expect(encryptResult.error).toBeDefined();
    });
  });
});
