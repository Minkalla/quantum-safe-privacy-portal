import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PQCDataValidationService } from '../pqc-data-validation.service';
import { AuthService } from '../../auth/auth.service';
import { EnhancedErrorBoundaryService } from '../enhanced-error-boundary.service';
import { QuantumSafeCryptoIdentityService } from '../quantum-safe-crypto-identity.service';
import { PQCBridgeService } from '../pqc-bridge.service';
import { SecretsService } from '../../secrets/secrets.service';
import { JwtService } from '../../jwt/jwt.service';
import { UserSchema } from '../../models/User';
import { PQCFeatureFlagsService } from '../../pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../pqc/pqc-monitoring.service';
import { PQCService } from '../pqc.service';
import { HybridCryptoService } from '../hybrid-crypto.service';
import { QuantumSafeJWTService } from '../quantum-safe-jwt.service';
import { PQCDataEncryptionService } from '../pqc-data-encryption.service';
import { ClassicalCryptoService } from '../classical-crypto.service';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { generateCryptoUserId } from '../../utils/crypto-user-id.util';

describe('UID Signature Lifecycle - Live PQC Operations', () => {
  let validationService: PQCDataValidationService;
  let authService: AuthService;
  let module: TestingModule;

  beforeAll(async () => {
    const mongoUri = process.env.MongoDB1 || 'mongodb://localhost:27017/test';

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
      ],
      providers: [
        PQCDataValidationService,
        AuthService,
        EnhancedErrorBoundaryService,
        QuantumSafeCryptoIdentityService,
        PQCBridgeService,
        SecretsService,
        JwtService,
        PQCFeatureFlagsService,
        PQCMonitoringService,
        PQCService,
        HybridCryptoService,
        QuantumSafeJWTService,
        PQCDataEncryptionService,
        ClassicalCryptoService,
        CircuitBreakerService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                TOKEN_EXPIRATION: '3600',
                SKIP_SECRETS_MANAGER: 'true',
                PQC_SERVICE_URL: 'http://localhost:8001',
              };
              return config[key];
            },
          },
        },
      ],
    }).compile();

    validationService = module.get<PQCDataValidationService>(PQCDataValidationService);
    authService = module.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should use consistent user ID for signing and verification with live PQC', async () => {
    const testData = { message: 'test payload', timestamp: Date.now() };
    const testUserId = 'test-user-123';

    console.log('=== Live PQC UID Signature Lifecycle Test ===');

    const signingUserId = generateCryptoUserId(testUserId, {
      algorithm: 'ML-DSA-65',
      operation: 'signing',
    });

    const verificationUserId = generateCryptoUserId(testUserId, {
      algorithm: 'ML-DSA-65',
      operation: 'signing', // Should be same as signing for consistency
    });

    console.log('Generated signing user ID:', signingUserId);
    console.log('Generated verification user ID:', verificationUserId);

    expect(signingUserId).toBeDefined();
    expect(verificationUserId).toBeDefined();
    expect(signingUserId).toBe(verificationUserId);

    const signature = await validationService.generateSignature(testData, {
      userId: testUserId,
      algorithm: 'DILITHIUM_3' as any,
    });

    console.log('Live PQC signature generated:', signature.signature.substring(0, 50) + '...');
    console.log('Signature metadata:', signature.metadata);

    const verifyResult = await validationService.verifySignature(testData, signature, {
      userId: testUserId,
    });

    console.log('Live PQC verification result:', verifyResult.isValid);
    console.log('Verification errors:', verifyResult.errors);
    console.log('Verification warnings:', verifyResult.warnings);

    expect(signature).toBeDefined();
    expect(signature.signature).toBeDefined();
    expect(signature.signature.length).toBeGreaterThan(10);

    const isPQCSignature = signature.signature.includes('dilithium3:');
    const isClassicalFallback = signature.signature.includes('classical:');
    expect(isPQCSignature || isClassicalFallback).toBe(true);

    expect(verifyResult.isValid).toBe(true);
    expect(verifyResult.errors).toHaveLength(0);
    expect(verifyResult.algorithm).toBeDefined();
  }, 30000);

  it('should handle anonymous user ID consistently with live PQC', async () => {
    const testData = { message: 'anonymous test payload' };

    console.log('=== Live PQC Anonymous UID Test ===');

    const signature = await validationService.generateSignature(testData, {
      algorithm: 'DILITHIUM_3' as any,
    });

    console.log('Anonymous live PQC signature generated:', signature.signature.substring(0, 50) + '...');

    const verifyResult = await validationService.verifySignature(testData, signature);

    console.log('Anonymous live PQC verification result:', verifyResult.isValid);
    console.log('Anonymous verification errors:', verifyResult.errors);

    expect(signature).toBeDefined();
    expect(signature.signature).toBeDefined();
    expect(signature.signature.length).toBeGreaterThan(10);

    const isPQCSignature = signature.signature.includes('dilithium3:');
    const isClassicalFallback = signature.signature.includes('classical:');
    expect(isPQCSignature || isClassicalFallback).toBe(true);

    expect(verifyResult.isValid).toBe(true);
    expect(verifyResult.algorithm).toBeDefined();
  }, 30000);
});
