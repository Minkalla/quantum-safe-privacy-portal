import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecretsModule } from '../secrets/secrets.module';
import { PQCFeatureFlagsModule } from '../pqc/pqc-feature-flags.module';
import { JwtService } from '../jwt/jwt.service';
import { QuantumSafeCryptoIdentityService } from '../services/quantum-safe-crypto-identity.service';
import { HybridCryptoService } from '../services/hybrid-crypto.service';
import { QuantumSafeJWTService } from '../services/quantum-safe-jwt.service';
import { PQCBridgeService } from '../services/pqc-bridge.service';
import { EnhancedErrorBoundaryService } from '../services/enhanced-error-boundary.service';
import { PQCService } from '../services/pqc.service';
import { ClassicalCryptoService } from '../services/classical-crypto.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { SecretsService } from '../secrets/secrets.service';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../pqc/pqc-monitoring.service';
import { PQCDataEncryptionService } from '../services/pqc-data-encryption.service';
import { PQCDataValidationService } from '../services/pqc-data-validation.service';
import { AuditTrailService } from '../monitoring/audit-trail.service';
import { AuthService } from '../auth/auth.service';

const createMockModel = () => ({
  findOne: jest.fn().mockImplementation((query) => {
    if (query?.email === 'test@example.com') {
      return Promise.resolve({
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        password: '$2a$10$hashedpassword',
        mfaEnabled: false,
        mfaSecret: null,
        trustedDevices: [],
        save: jest.fn().mockResolvedValue({}),
      });
    }
    return Promise.resolve(null);
  }),
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  create: jest.fn().mockResolvedValue({
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    save: jest.fn().mockResolvedValue({}),
  }),
  save: jest.fn().mockResolvedValue({}),
  findById: jest.fn().mockImplementation((id) => {
    if (id === '507f1f77bcf86cd799439011' || id === '60d5ec49f1a23c001c8a4d7d') {
      return Promise.resolve({
        _id: id,
        email: 'test@example.com',
        mfaEnabled: false,
        mfaSecret: null,
        trustedDevices: [],
        save: jest.fn().mockResolvedValue({}),
      });
    }
    return Promise.resolve(null);
  }),
  updateOne: jest.fn().mockResolvedValue({}),
  deleteOne: jest.fn().mockResolvedValue({}),
  countDocuments: jest.fn().mockResolvedValue(0),
  find: jest.fn().mockResolvedValue([]),
  deleteMany: jest.fn().mockResolvedValue({}),
});

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

export interface TestModuleOverrides {
  userModel?: any;
  sessionModel?: any;
  tenantModel?: any;
  deviceTrustModel?: any;
  providers?: any[];
  controllers?: any[];
  configOverrides?: Record<string, any>;
  imports?: any[];
}

export async function createTestModule(overrides: TestModuleOverrides = {}): Promise<TestingModule> {
  const defaultConfig = {
    'SKIP_SECRETS_MANAGER': 'true',
    'AWS_REGION': 'us-east-1',
    'APP_VERSION': '1.0.0-test',
    'NODE_ENV': 'test',
    'PORT': '3000',
    'pqc.enabled': true,
    'pqc.fallback_enabled': true,
    'JWT_ACCESS_SECRET_ID': 'test-access-secret-id',
    'JWT_REFRESH_SECRET_ID': 'test-refresh-secret-id',
    'JWT_SECRET': 'test-jwt-secret',
    'JWT_ACCESS_SECRET': 'test-access-secret',
    'JWT_REFRESH_SECRET': 'test-refresh-secret',
    'device.trust.enabled': true,
    'device.trust.expiry_days': 30,
    'MongoDB1': process.env.MongoDB1 || 'mongodb://localhost:27017/test',
    'SSO_IDP_ENTRY_POINT': 'https://test-idp.example.com/sso',
    'SSO_IDP_CERTIFICATE': 'test-certificate',
    'SSO_ISSUER': 'test-issuer',
    'SSO_CALLBACK_URL': 'https://test.example.com/auth/sso/callback',
    'SSO_ENTITY_ID': 'test-entity-id',
    'SSO_PRIVATE_KEY': 'test-private-key',
    'SSO_DECRYPTION_CERT': 'test-decryption-cert',
    ...overrides.configOverrides,
  };

  return await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => defaultConfig],
      }),
      SecretsModule,
      PQCFeatureFlagsModule,
      ...(overrides.imports || []),
    ],
    controllers: [
      ...(overrides.controllers || []),
    ],
    providers: [
      QuantumSafeCryptoIdentityService,
      HybridCryptoService,
      QuantumSafeJWTService,
      PQCBridgeService,
      PQCService,
      ClassicalCryptoService,
      CircuitBreakerService,
      {
        provide: SecretsService,
        useValue: {
          getSecret: jest.fn().mockImplementation((secretId: string) => {
            if (secretId.includes('backup_codes') || secretId.includes('mfa')) {
              return Promise.resolve('["backup1", "backup2", "backup3"]');
            }
            if (secretId.includes('secret')) {
              return Promise.resolve('test-secret-value');
            }
            return Promise.resolve(`test-secret-${secretId}`);
          }),
          storeSecret: jest.fn().mockResolvedValue(undefined),
          deleteSecret: jest.fn().mockResolvedValue(undefined),
        },
      },
      PQCFeatureFlagsService,
      PQCMonitoringService,
      PQCDataEncryptionService,
      {
        provide: AuthService,
        useValue: {
          callPythonPQCService: jest.fn().mockResolvedValue({
            success: true,
            signature: 'mock-signature',
            public_key: 'mock-public-key',
          }),
          executePQCServiceCall: jest.fn().mockResolvedValue({ success: true }),
          sanitizeUserId: jest.fn().mockImplementation(id => id),
          sanitizeEmail: jest.fn().mockImplementation(email => email),
          register: jest.fn().mockResolvedValue({
            success: true,
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MDk0NTkyMDAsImV4cCI6MTYwOTQ2MjgwMH0.test-signature',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoxNjEwMDY0MDAwfQ.test-refresh-signature',
            user: { id: 'test-user-id', email: 'test@example.com' },
          }),
          login: jest.fn().mockResolvedValue({
            success: true,
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MDk0NTkyMDAsImV4cCI6MTYwOTQ2MjgwMH0.test-signature',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoxNjEwMDY0MDAwfQ.test-refresh-signature',
            user: { id: 'test-user-id', email: 'test@example.com' },
          }),
        },
      },
      PQCDataValidationService,
      {
        provide: PQCBridgeService,
        useValue: {
          executePQCOperation: jest.fn().mockResolvedValue({
            success: true,
            token: 'mock-pqc-token',
            algorithm: 'ML-DSA-65',
            verified: true,
            payload: { test: 'data' },
          }),
        },
      },
      AuditTrailService,
      {
        provide: EnhancedErrorBoundaryService,
        useValue: {
          executeWithErrorBoundary: jest.fn().mockImplementation(async (fn) => {
            return await fn();
          }),
        },
      },
      {
        provide: JwtService,
        useValue: {
          generateTokens: jest.fn().mockReturnValue({
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MDk0NTkyMDAsImV4cCI6MTYwOTQ2MjgwMH0.test-signature',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoxNjEwMDY0MDAwfQ.test-refresh-signature',
          }),
          generateSSOTokens: jest.fn().mockReturnValue({
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJzc29UeXBlIjoidGVzdCIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoxNjA5NDYyODAwfQ.test-sso-signature',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoxNjEwMDY0MDAwfQ.test-sso-refresh-signature',
          }),
          verifyToken: jest.fn().mockImplementation((token) => {
            if (token && token.includes('test-signature')) {
              return {
                userId: 'test-user-id',
                email: 'test@example.com',
                iat: 1609459200,
                exp: 1609462800,
              };
            }
            throw new Error('Invalid token');
          }),
          isSSOToken: jest.fn().mockReturnValue(false),
          initializeSecrets: jest.fn().mockResolvedValue(undefined),
        },
      },
      {
        provide: PQCService,
        useValue: {
          triggerPQCHandshake: jest.fn().mockResolvedValue({
            success: true,
            handshake_metadata: {
              handshake_id: 'test-handshake',
              timestamp: new Date().toISOString(),
              algorithm: 'ML-KEM-768',
            },
          }),
          verifyPQCHandshake: jest.fn().mockResolvedValue({ success: true }),
          initializePQC: jest.fn().mockResolvedValue({ success: true }),
        },
      },
      {
        provide: getModelToken('User'),
        useValue: overrides.userModel || createMockModel(),
      },
      {
        provide: getModelToken('Session'),
        useValue: overrides.sessionModel || createMockModel(),
      },
      {
        provide: getModelToken('Tenant'),
        useValue: overrides.tenantModel || createMockModel(),
      },
      {
        provide: getModelToken('DeviceTrust'),
        useValue: overrides.deviceTrustModel || createMockModel(),
      },
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) => {
            const value = defaultConfig[key] || process.env[key];
            if (key === 'SKIP_SECRETS_MANAGER') return 'true';
            if (key === 'AWS_REGION') return 'us-east-1';
            return value || 'test-value';
          },
        },
      },
      {
        provide: Logger,
        useValue: mockLogger,
      },
      ...(overrides.providers || []),
    ],
  }).compile();
}
