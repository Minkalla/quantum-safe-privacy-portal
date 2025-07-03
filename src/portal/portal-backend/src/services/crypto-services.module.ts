import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { HybridCryptoService } from './hybrid-crypto.service';
import { ClassicalCryptoService } from './classical-crypto.service';
import { DataMigrationService } from './data-migration.service';
import { PQCDataEncryptionService } from './pqc-data-encryption.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { BulkEncryptionService } from './bulk-encryption.service';
import { FieldEncryptionService } from './field-encryption.service';
import { EnhancedErrorBoundaryService } from './enhanced-error-boundary.service';
import { PQCService } from './pqc.service';
import { PQCBridgeService } from './pqc-bridge.service';
import { PQCDataValidationService } from './pqc-data-validation.service';
import { QuantumSafeCryptoIdentityService } from './quantum-safe-crypto-identity.service';
import User, { IUser, UserSchema } from '../models/User';
import Consent, { IConsent, ConsentSchema } from '../models/Consent';
import { SecretsModule } from '../secrets/secrets.module';
import { PQCFeatureFlagsModule } from '../pqc/pqc-feature-flags.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Consent.name, schema: ConsentSchema },
    ]),
    SecretsModule,
    PQCFeatureFlagsModule,
    MonitoringModule,
  ],
  providers: [
    HybridCryptoService,
    ClassicalCryptoService,
    DataMigrationService,
    PQCDataEncryptionService,
    CircuitBreakerService,
    BulkEncryptionService,
    FieldEncryptionService,
    EnhancedErrorBoundaryService,
    PQCService,
    PQCBridgeService,
    PQCDataValidationService,
    QuantumSafeCryptoIdentityService,
  ],
  exports: [
    HybridCryptoService,
    ClassicalCryptoService,
    DataMigrationService,
    PQCDataEncryptionService,
    CircuitBreakerService,
    BulkEncryptionService,
    FieldEncryptionService,
    EnhancedErrorBoundaryService,
    PQCService,
    PQCBridgeService,
    PQCDataValidationService,
    QuantumSafeCryptoIdentityService,
  ],
})
export class CryptoServicesModule {}
