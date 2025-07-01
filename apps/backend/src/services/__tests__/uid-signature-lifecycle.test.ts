import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataValidationService } from '../pqc-data-validation.service';
import { AuthService } from '../../auth/auth.service';
import { EnhancedErrorBoundaryService } from '../enhanced-error-boundary.service';
import { generateCryptoUserId } from '../../utils/crypto-user-id.util';

describe('UID Signature Lifecycle', () => {
  let validationService: PQCDataValidationService;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = {
      callPQCService: jest.fn().mockResolvedValue({
        success: true,
        token: 'test-signature-token-12345',
        verified: true,
        algorithm: 'ML-DSA-65'
      }),
    };

    const mockErrorBoundary = {
      executeWithErrorBoundary: jest.fn().mockImplementation(async (fn) => await fn()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataValidationService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: AuthService, useValue: mockAuthService },
        { provide: EnhancedErrorBoundaryService, useValue: mockErrorBoundary },
      ],
    }).compile();

    validationService = module.get<PQCDataValidationService>(PQCDataValidationService);
  });

  it('should use consistent user ID for signing and verification', async () => {
    const testData = { message: 'test payload', timestamp: Date.now() };
    const testUserId = 'test-user-123';
    
    console.log('=== UID Signature Lifecycle Test ===');
    
    const signingUserId = generateCryptoUserId(testUserId, {
      algorithm: 'ML-DSA-65',
      operation: 'signing'
    });
    
    const verificationUserId = generateCryptoUserId(testUserId, {
      algorithm: 'ML-DSA-65',
      operation: 'signing' // Should be same as signing for consistency
    });
    
    console.log('Generated signing user ID:', signingUserId);
    console.log('Generated verification user ID:', verificationUserId);
    
    expect(signingUserId).toBeDefined();
    expect(verificationUserId).toBeDefined();
    expect(signingUserId).toBe(verificationUserId);
    
    const signature = await validationService.generateSignature(testData, {
      userId: testUserId,
      algorithm: 'DILITHIUM_3' as any
    });
    
    console.log('Signature generated with user ID stored in metadata:', signature.metadata);
    
    const verifyResult = await validationService.verifySignature(testData, signature, {
      userId: testUserId
    });
    
    console.log('Verification result:', verifyResult.isValid);
    console.log('Verification errors:', verifyResult.errors);
    
    expect(signature).toBeDefined();
    expect(signature.signature).toContain('dilithium3:');
    expect(verifyResult.isValid).toBe(true);
    expect(verifyResult.errors).toHaveLength(0);
    
    const signCalls = mockAuthService.callPQCService.mock.calls.filter(call => call[0] === 'sign_token');
    const verifyCalls = mockAuthService.callPQCService.mock.calls.filter(call => call[0] === 'verify_token');
    
    expect(signCalls).toHaveLength(1);
    expect(verifyCalls).toHaveLength(1);
    
    const signCallUserId = signCalls[0][1].user_id;
    const verifyCallUserId = verifyCalls[0][1].user_id;
    
    console.log('Sign call user ID:', signCallUserId);
    console.log('Verify call user ID:', verifyCallUserId);
    
    expect(signCallUserId).toBe(verifyCallUserId);
    expect(signCallUserId).toBe(signingUserId);
  });

  it('should handle anonymous user ID consistently', async () => {
    const testData = { message: 'anonymous test payload' };
    
    console.log('=== Anonymous UID Test ===');
    
    const signature = await validationService.generateSignature(testData, {
      algorithm: 'DILITHIUM_3' as any
    });
    
    const verifyResult = await validationService.verifySignature(testData, signature);
    
    console.log('Anonymous signature verification result:', verifyResult.isValid);
    
    expect(signature).toBeDefined();
    expect(verifyResult.isValid).toBe(true);
    
    const signCalls = mockAuthService.callPQCService.mock.calls.filter(call => call[0] === 'sign_token');
    const verifyCalls = mockAuthService.callPQCService.mock.calls.filter(call => call[0] === 'verify_token');
    
    const lastSignCall = signCalls[signCalls.length - 1];
    const lastVerifyCall = verifyCalls[verifyCalls.length - 1];
    
    console.log('Anonymous sign call user ID:', lastSignCall[1].user_id);
    console.log('Anonymous verify call user ID:', lastVerifyCall[1].user_id);
    
    expect(lastSignCall[1].user_id).toBe(lastVerifyCall[1].user_id);
  });
});
