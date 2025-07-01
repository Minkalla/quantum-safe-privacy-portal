import { Module, forwardRef } from '@nestjs/common';
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
import { AuthModule } from '../auth/auth.module';
import User, { IUser, UserSchema } from '../models/User';
import Consent, { IConsent, ConsentSchema } from '../models/Consent';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Consent.name, schema: ConsentSchema },
    ]),
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
  ],
})
export class CryptoServicesModule {}
