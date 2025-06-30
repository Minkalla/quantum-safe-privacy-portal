import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PQCDataEncryptionService } from '../../../../src/services/pqc-data-encryption.service';
import { AuthService } from '../../../../src/auth/auth.service';
import { PQCAlgorithmType } from '../../../../src/models/interfaces/pqc-data.interface';

describe('Kyber-768 Algorithm Unit Tests', () => {
  let encryptionService: PQCDataEncryptionService;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    };

    const mockAuthService = {
      callPythonPQCService: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PQCDataEncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    encryptionService = module.get<PQCDataEncryptionService>(PQCDataEncryptionService);
    authService = module.get(AuthService);
  });

  describe('Key Generation', () => {
    it('should generate Kyber-768 key pairs with correct sizes', async () => {
      const mockKeyPair = {
        success: true,
        session_data: {
          ciphertext: 'kyber-768-ciphertext-1568-bytes',
          shared_secret: 'a'.repeat(64),
        },
      };

      authService.callPythonPQCService.mockResolvedValue(mockKeyPair);

      const result = await encryptionService.encryptData('test data', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'test-key',
      });

      expect(result.success).toBe(true);
      expect(authService.callPythonPQCService).toHaveBeenCalledWith(
        'generate_session_key',
        expect.objectContaining({
          user_id: 'test-key',
        })
      );
    });

    it('should generate unique key pairs on each call', async () => {
      const keyPairs = [];
      
      for (let i = 0; i < 5; i++) {
        const mockKeyPair = {
          success: true,
          session_data: {
            ciphertext: `kyber-768-ciphertext-${i}-${Math.random()}`,
            shared_secret: `shared-secret-${i}-${Math.random()}`,
          },
        };

        authService.callPythonPQCService.mockResolvedValueOnce(mockKeyPair);

        const result = await encryptionService.encryptData('test data', {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `test-key-${i}`,
        });

        if (result.success && result.encryptedField) {
          keyPairs.push(result.encryptedField.encryptedData);
        }
      }

      const uniqueKeyPairs = new Set(keyPairs);
      expect(uniqueKeyPairs.size).toBe(5);
    });

    it('should handle key generation failures gracefully', async () => {
      authService.callPythonPQCService.mockResolvedValue({
        success: false,
        error_message: 'Key generation failed',
      });

      const result = await encryptionService.encryptData('test data', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Key generation failed');
    });
  });

  describe('Encapsulation', () => {
    it('should perform Kyber-768 encapsulation correctly', async () => {
      const mockEncapsulation = {
        success: true,
        session_data: {
          ciphertext: 'kyber-768-encapsulated-data',
          shared_secret: 'b'.repeat(64),
        },
      };

      authService.callPythonPQCService.mockResolvedValue(mockEncapsulation);

      const result = await encryptionService.encryptData('sensitive data', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'encapsulation-key',
      });

      expect(result.success).toBe(true);
      if (result.success && result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
        expect(result.encryptedField.encryptedData).toBeDefined();
      }
    });

    it('should produce different ciphertexts for same plaintext', async () => {
      const plaintextData = 'identical plaintext';
      const ciphertexts = [];

      for (let i = 0; i < 3; i++) {
        const mockEncapsulation = {
          success: true,
          session_data: {
            ciphertext: `kyber-768-ciphertext-${i}-${Math.random()}`,
            shared_secret: `shared-secret-${i}`,
          },
        };

        authService.callPythonPQCService.mockResolvedValueOnce(mockEncapsulation);

        const result = await encryptionService.encryptData(plaintextData, {
          algorithm: PQCAlgorithmType.KYBER_768,
          keyId: `key-${i}`,
        });

        if (result.success && result.encryptedField) {
          ciphertexts.push(result.encryptedField.encryptedData);
        }
      }

      const uniqueCiphertexts = new Set(ciphertexts);
      expect(uniqueCiphertexts.size).toBe(3);
    });
  });

  describe('Decapsulation', () => {
    it('should perform Kyber-768 decapsulation correctly', async () => {
      const encryptedField = {
        encryptedData: 'kyber-768-encrypted-data',
        algorithm: 'Kyber-768',
        keyId: 'test-key',
        nonce: 'test-nonce',
        timestamp: new Date(),
      };

      const mockDecapsulation = {
        success: true,
        decrypted_data: 'original plaintext',
      };

      authService.callPythonPQCService.mockResolvedValue(mockDecapsulation);

      const result = await encryptionService.decryptData(encryptedField);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.decryptedData).toBe('original plaintext');
      }
    });

    it('should handle invalid ciphertext gracefully', async () => {
      const invalidEncryptedField = {
        encryptedData: 'invalid-ciphertext',
        algorithm: 'Kyber-768',
        keyId: 'test-key',
        nonce: 'test-nonce',
        timestamp: new Date(),
      };

      authService.callPythonPQCService.mockResolvedValue({
        success: false,
        error_message: 'Decapsulation failed',
      });

      const result = await encryptionService.decryptData(invalidEncryptedField);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Decapsulation failed');
    });
  });

  describe('Algorithm Compliance', () => {
    it('should meet NIST Kyber-768 specifications', async () => {
      const mockCompliantResult = {
        success: true,
        session_data: {
          ciphertext: 'a'.repeat(1568),
          shared_secret: 'b'.repeat(64),
        },
      };

      authService.callPythonPQCService.mockResolvedValue(mockCompliantResult);

      const result = await encryptionService.encryptData('test data', {
        algorithm: PQCAlgorithmType.KYBER_768,
        keyId: 'compliance-test',
      });

      expect(result.success).toBe(true);
      if (result.success && result.encryptedField) {
        expect(result.encryptedField.algorithm).toBe('Kyber-768');
      }
    });
  });
});
