import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

const mockUserModel = {
  findOne: jest.fn().mockResolvedValue(null),
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  create: jest.fn().mockResolvedValue({}),
  save: jest.fn().mockResolvedValue({}),
  findById: jest.fn().mockResolvedValue(null),
  updateOne: jest.fn().mockResolvedValue({}),
};

const mockSessionModel = {
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({}),
  deleteOne: jest.fn().mockResolvedValue({}),
};

const mockTenantModel = {
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({}),
};

const mockDeviceTrustModel = {
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({}),
};

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
  configOverrides?: Record<string, any>;
}

export async function createTestModule(overrides: TestModuleOverrides = {}): Promise<TestingModule> {
  const defaultConfig = {
    'SKIP_SECRETS_MANAGER': 'true',
    'AWS_REGION': 'us-east-1',
    'pqc.enabled': true,
    'pqc.fallback_enabled': true,
    'JWT_ACCESS_SECRET_ID': 'test-access-secret-id',
    'JWT_REFRESH_SECRET_ID': 'test-refresh-secret-id',
    'MongoDB1': process.env.MongoDB1 || 'mongodb://localhost:27017/test',
    ...overrides.configOverrides,
  };

  return await Test.createTestingModule({
    providers: [
      QuantumSafeCryptoIdentityService,
      HybridCryptoService,
      QuantumSafeJWTService,
      PQCBridgeService,
      EnhancedErrorBoundaryService,
      PQCService,
      ClassicalCryptoService,
      CircuitBreakerService,
      SecretsService,
      PQCFeatureFlagsService,
      PQCMonitoringService,
      PQCDataEncryptionService,
      PQCDataValidationService,
      JwtService,
      {
        provide: getModelToken('User'),
        useValue: overrides.userModel || mockUserModel,
      },
      {
        provide: getModelToken('Session'),
        useValue: overrides.sessionModel || mockSessionModel,
      },
      {
        provide: getModelToken('Tenant'),
        useValue: overrides.tenantModel || mockTenantModel,
      },
      {
        provide: getModelToken('DeviceTrust'),
        useValue: overrides.deviceTrustModel || mockDeviceTrustModel,
      },
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) => defaultConfig[key] || process.env[key] || 'test-value',
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
