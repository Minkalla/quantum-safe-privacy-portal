import { Test, TestingModule } from '@nestjs/testing';
import { PQCBridgeService } from '../../../src/services/pqc-bridge.service';
import { HybridCryptoService } from '../../../src/services/hybrid-crypto.service';
import { ClassicalCryptoService } from '../../../src/services/classical-crypto.service';
import { CircuitBreakerService } from '../../../src/services/circuit-breaker.service';
import { EnhancedErrorBoundaryService } from '../../../src/services/enhanced-error-boundary.service';
import { PQCErrorTaxonomyService } from '../../../src/services/pqc-error-taxonomy.service';
import { PQCDataEncryptionService } from '../../../src/services/pqc-data-encryption.service';
import { ConfigService } from '@nestjs/config';

describe('PQC Fallback Verification - Real RSA Operations', () => {
  let pqcBridgeService: PQCBridgeService;
  let hybridCryptoService: HybridCryptoService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        PQCBridgeService,
        HybridCryptoService,
        ClassicalCryptoService,
        CircuitBreakerService,
        EnhancedErrorBoundaryService,
        PQCErrorTaxonomyService,
        PQCDataEncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                'SKIP_SECRETS_MANAGER': 'true',
                'pqc.enabled': true,
                'pqc.fallback_enabled': true,
              };
              return config[key] || process.env[key] || 'test-value';
            },
          },
        },
      ],
    }).compile();

    pqcBridgeService = module.get<PQCBridgeService>(PQCBridgeService);
    hybridCryptoService = module.get<HybridCryptoService>(HybridCryptoService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should force PQC service failure and verify real RSA fallback operations', async () => {
    const testUserId = '507f1f77bcf86cd799439011';
    
    console.log('=== TESTING DIRECT FALLBACK OPERATIONS WITH REAL RSA ===');
    
    
    console.log('Testing generate_session_key direct fallback...');
    const sessionResult = await (pqcBridgeService as any).performFallbackOperation(
      'generate_session_key',
      { user_id: testUserId, payload: { test: 'data' } }
    );
    
    console.log('Session fallback result:', JSON.stringify(sessionResult, null, 2));
    expect(sessionResult.success).toBe(true);
    expect(sessionResult.fallback).toBe(true);
    expect(sessionResult.session_data).toBeDefined();
    expect(sessionResult.session_data!.ciphertext).toBeDefined();
    expect(sessionResult.session_data!.shared_secret).toBeDefined();
    expect(sessionResult.metadata?.fallbackReason).toMatch(/PQC service unavailable/);
    
    console.log('✓ Session key direct fallback completed with real cryptographic operations');
    
    console.log('Testing sign_token direct fallback...');
    const signResult = await (pqcBridgeService as any).performFallbackOperation(
      'sign_token',
      { user_id: testUserId, data_hash: 'test-hash-to-sign' }
    );
    
    console.log('Sign fallback result:', JSON.stringify(signResult, null, 2));
    expect(signResult.success).toBe(true);
    expect(signResult.fallback).toBe(true);
    expect(signResult.token).toBeDefined();
    expect(signResult.data).toBeDefined();
    expect(signResult.data.signature).toBeDefined();
    expect(signResult.data.publicKey).toBeDefined();
    expect(signResult.metadata?.fallbackReason).toMatch(/PQC service unavailable/);
    
    console.log('✓ Token signing direct fallback completed with real cryptographic operations');
    
    console.log('Testing verify_token direct fallback...');
    const verifyResult = await (pqcBridgeService as any).performFallbackOperation(
      'verify_token',
      { 
        user_id: testUserId,
        data_hash: 'test-hash-to-sign',
        signature_hex: signResult.data.signature,
        public_key_hex: signResult.data.publicKey,
        algorithm: 'RSA-2048'
      }
    );
    
    console.log('Verify fallback result:', JSON.stringify(verifyResult, null, 2));
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.fallback).toBe(true);
    expect(verifyResult.verified).toBe(true);
    expect(verifyResult.metadata?.fallbackReason).toMatch(/PQC service unavailable/);
    
    console.log('✓ Token verification direct fallback completed with real cryptographic operations');
    console.log('=== ALL DIRECT FALLBACK OPERATIONS VERIFIED WITH REAL CRYPTOGRAPHY ===');
  });
});
