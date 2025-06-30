import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/auth/auth.service';
import { PQCDataValidationService } from '../../../src/services/pqc-data-validation.service';
import { PQCDataEncryptionService } from '../../../src/services/pqc-data-encryption.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtService } from '../../../src/jwt/jwt.service';
import { ConfigService } from '@nestjs/config';
import { PQCFeatureFlagsService } from '../../../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../../../src/pqc/pqc-monitoring.service';
import { SecretsService } from '../../../src/secrets/secrets.service';
import { EnhancedErrorBoundaryService } from '../../../src/services/enhanced-error-boundary.service';
import { HybridCryptoService } from '../../../src/services/hybrid-crypto.service';
import { spawn } from 'child_process';
import * as path from 'path';

describe('PQC FFI Integration Verification', () => {
  let authService: AuthService;
  let pqcValidationService: PQCDataValidationService;
  let pqcEncryptionService: PQCDataEncryptionService;
  let module: TestingModule;

  beforeAll(async () => {
    const mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET_ID') return 'test-access-secret-id';
        if (key === 'JWT_REFRESH_SECRET_ID') return 'test-refresh-secret-id';
        return 'test-value';
      }),
    };

    const mockSecretsService = {
      getSecret: jest.fn().mockResolvedValue('test-secret-value'),
    };

    const mockJwtService = {
      generateTokens: jest.fn().mockReturnValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      }),
      verifyToken: jest.fn(),
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    const mockPQCFeatureFlagsService = {
      isEnabled: jest.fn().mockReturnValue(true),
    };

    const mockPQCMonitoringService = {
      recordMetric: jest.fn(),
      logEvent: jest.fn(),
    };

    const mockPQCDataEncryptionService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    const mockEnhancedErrorBoundaryService = {
      executeWithErrorBoundary: jest.fn(),
    };

    const mockHybridCryptoService = {
      encryptWithFallback: jest.fn(),
      decryptWithFallback: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        AuthService,
        JwtService,
        PQCDataValidationService,
        { provide: PQCDataEncryptionService, useValue: mockPQCDataEncryptionService },
        { provide: 'UserModel', useValue: mockUserModel },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SecretsService, useValue: mockSecretsService },
        { provide: PQCFeatureFlagsService, useValue: mockPQCFeatureFlagsService },
        { provide: PQCMonitoringService, useValue: mockPQCMonitoringService },
        { provide: EnhancedErrorBoundaryService, useValue: mockEnhancedErrorBoundaryService },
        { provide: HybridCryptoService, useValue: mockHybridCryptoService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    pqcValidationService = module.get<PQCDataValidationService>(PQCDataValidationService);
    pqcEncryptionService = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Real FFI Module Usage Verification', () => {
    it('should verify that pqc_service_bridge.py uses pqc_ffi module', async () => {
      const pythonScriptPath = path.join(
        __dirname,
        '../../../mock-qynauth/src/python_app/pqc_service_bridge.py'
      );

      const verificationScript = `
import sys
import os
sys.path.append('${path.dirname(pythonScriptPath)}')

try:
    import pqc_service_bridge
    import pqc_ffi
    
    # Verify that pqc_service_bridge imports pqc_ffi
    assert hasattr(pqc_service_bridge, 'pqc'), "pqc_service_bridge should have pqc attribute"
    
    # Verify the assert block exists to prevent mock usage
    import inspect
    source = inspect.getsource(pqc_service_bridge)
    assert 'assert hasattr(pqc, \\'pqc_ml_dsa_65_sign\\')' in source, "Runtime safeguard assert block missing"
    
    # Verify pqc_ffi functions are available
    lib = pqc_ffi.get_pqc_library()
    assert hasattr(lib, 'generate_ml_kem_keypair'), "pqc_ffi missing ML-KEM keypair generation"
    assert hasattr(lib, 'generate_ml_dsa_keypair'), "pqc_ffi missing ML-DSA keypair generation"
    assert hasattr(lib, 'ml_kem_encapsulate'), "pqc_ffi missing ML-KEM encapsulation"
    assert hasattr(lib, 'ml_dsa_sign'), "pqc_ffi missing ML-DSA signing"
    assert hasattr(lib, 'ml_dsa_verify'), "pqc_ffi missing ML-DSA verification"
    
    print("FFI_VERIFICATION_SUCCESS: All real FFI functions available")
    
except ImportError as e:
    print(f"FFI_VERIFICATION_ERROR: Import failed - {e}")
    sys.exit(1)
except AssertionError as e:
    print(f"FFI_VERIFICATION_ERROR: Assertion failed - {e}")
    sys.exit(1)
except Exception as e:
    print(f"FFI_VERIFICATION_ERROR: Unexpected error - {e}")
    sys.exit(1)
`;

      return new Promise<void>((resolve, reject) => {
        const pythonProcess = spawn('python3', ['-c', verificationScript], {
          cwd: path.dirname(pythonScriptPath),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          console.log('FFI Verification Output:', stdout);
          if (stderr) console.log('FFI Verification Errors:', stderr);

          if (code === 0 && stdout.includes('FFI_VERIFICATION_SUCCESS')) {
            resolve();
          } else {
            reject(new Error(`FFI verification failed with code ${code}: ${stderr || stdout}`));
          }
        });

        pythonProcess.on('error', (error) => {
          reject(new Error(`Failed to spawn Python process: ${error.message}`));
        });
      });
    });

    it('should perform complete TypeScript -> Python -> Rust FFI roundtrip for ML-DSA signing', async () => {
      const testUserId = 'ffi_test_user_' + Date.now();
      const testPayload = {
        action: 'test_ffi_roundtrip',
        timestamp: new Date().toISOString(),
        data: 'test_signature_verification'
      };

      console.log(`Starting FFI roundtrip test for user: ${testUserId}`);
      console.log(`Test payload:`, JSON.stringify(testPayload));

      const signResult = await authService.callPQCService('sign_token', {
        user_id: testUserId,
        payload: testPayload
      });
      
      expect(signResult.success).toBe(true);
      expect(signResult.signed_token).toBeDefined();
      expect(signResult.performance_metrics).toBeDefined();

      console.log(`Signature generation successful:`, {
        algorithm: signResult.algorithm,
        duration_ms: signResult.performance_metrics?.duration_ms,
        token_length: signResult.signed_token?.length
      });

      const verifyResult = await authService.callPQCService('verify_token', {
        user_id: testUserId,
        token: signResult.signed_token
      });
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.payload).toEqual(testPayload);
      expect(verifyResult.performance_metrics).toBeDefined();

      console.log(`Signature verification successful:`, {
        algorithm: verifyResult.algorithm,
        duration_ms: verifyResult.performance_metrics?.duration_ms,
        payload_match: JSON.stringify(verifyResult.payload) === JSON.stringify(testPayload)
      });

      expect(signResult.performance_metrics?.duration_ms).toBeGreaterThan(0);
      expect(verifyResult.performance_metrics?.duration_ms).toBeGreaterThan(0);
      
      expect(signResult.performance_metrics?.duration_ms).toBeLessThan(5000); // Should complete within 5 seconds
      expect(verifyResult.performance_metrics?.duration_ms).toBeLessThan(5000);
    });

    it('should verify ML-KEM session key generation uses real FFI', async () => {
      const testUserId = 'ffi_kem_test_user_' + Date.now();
      const testMetadata = {
        client_type: 'ffi_integration_test',
        test_timestamp: new Date().toISOString()
      };

      console.log(`Starting ML-KEM FFI test for user: ${testUserId}`);

      const sessionResult = await authService.callPQCService('generate_session_key', {
        user_id: testUserId,
        metadata: testMetadata
      });
      
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.session_data).toBeDefined();
      expect(sessionResult.session_data?.algorithm).toBe('ML-KEM-768');
      expect(sessionResult.session_data?.shared_secret).toBeDefined();
      expect(sessionResult.session_data?.ciphertext).toBeDefined();
      expect(sessionResult.performance_metrics).toBeDefined();

      console.log(`ML-KEM session generation successful:`, {
        algorithm: sessionResult.session_data?.algorithm,
        duration_ms: sessionResult.performance_metrics?.duration_ms,
        shared_secret_length: sessionResult.session_data?.shared_secret?.length,
        ciphertext_length: sessionResult.session_data?.ciphertext?.length
      });

      expect(sessionResult.performance_metrics?.duration_ms).toBeGreaterThan(0);
      expect(sessionResult.performance_metrics?.duration_ms).toBeLessThan(5000);
      
      expect(sessionResult.session_data?.shared_secret?.length).toBeGreaterThan(0);
      expect(sessionResult.session_data?.ciphertext?.length).toBeGreaterThan(0);
    });

    it('should log complete FFI trace for audit purposes', async () => {
      const traceUserId = 'ffi_trace_user_' + Date.now();
      const tracePayload = {
        operation: 'ffi_trace_test',
        trace_id: `trace_${Date.now()}`,
        metadata: {
          test_type: 'ffi_audit_trace',
          timestamp: new Date().toISOString()
        }
      };

      console.log(`=== FFI TRACE START ===`);
      console.log(`User ID: ${traceUserId}`);
      console.log(`Payload: ${JSON.stringify(tracePayload)}`);

      const startTime = Date.now();
      
      const signResult = await authService.callPQCService('sign_token', {
        user_id: traceUserId,
        payload: tracePayload
      });
      const signEndTime = Date.now();
      
      console.log(`Sign operation completed in ${signEndTime - startTime}ms`);
      console.log(`Signed token length: ${signResult.signed_token?.length} characters`);
      
      const verifyStartTime = Date.now();
      const verifyResult = await authService.callPQCService('verify_token', {
        user_id: traceUserId,
        token: signResult.signed_token
      });
      const verifyEndTime = Date.now();
      
      console.log(`Verify operation completed in ${verifyEndTime - verifyStartTime}ms`);
      console.log(`Verification result: ${verifyResult.success ? 'VALID' : 'INVALID'}`);
      console.log(`=== FFI TRACE END ===`);

      expect(signResult.success).toBe(true);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.payload).toEqual(tracePayload);
      
      expect(signEndTime - startTime).toBeGreaterThan(0);
      expect(verifyEndTime - verifyStartTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling with Real FFI', () => {
    it('should handle invalid signatures properly with real verification', async () => {
      const testUserId = 'ffi_error_test_user_' + Date.now();
      const validPayload = { test: 'data' };
      
      const signResult = await authService.callPQCService('sign_token', {
        user_id: testUserId,
        payload: validPayload
      });
      expect(signResult.success).toBe(true);
      
      const tamperedToken = signResult.signed_token!.replace(/.$/, 'X');
      
      const verifyResult = await authService.callPQCService('verify_token', {
        user_id: testUserId,
        token: tamperedToken
      });
      
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.error_message).toContain('verification failed');
      
      console.log(`Real FFI properly rejected tampered signature: ${verifyResult.error_message}`);
    });

    it('should handle user ID mismatch with real FFI', async () => {
      const user1 = 'ffi_user1_' + Date.now();
      const user2 = 'ffi_user2_' + Date.now();
      const testPayload = { test: 'user_mismatch' };
      
      const signResult = await authService.callPQCService('sign_token', {
        user_id: user1,
        payload: testPayload
      });
      expect(signResult.success).toBe(true);
      
      const verifyResult = await authService.callPQCService('verify_token', {
        user_id: user2,
        token: signResult.signed_token
      });
      
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.error_message).toContain('User ID mismatch');
      
      console.log(`Real FFI properly rejected user ID mismatch: ${verifyResult.error_message}`);
    });
  });
});
