import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HybridCryptoService } from './hybrid-crypto.service';
import { PQCMigrationService } from './pqc-migration.service';
import { PQCDataValidationService } from './pqc-data-validation.service';
import { PQCDataEncryptionService } from './pqc-data-encryption.service';
import { FieldEncryptionService } from './field-encryption.service';
import { BulkEncryptionService } from './bulk-encryption.service';
import { DataAccessPerformanceService } from './data-access-performance.service';

@Module({
  imports: [ConfigModule],
  providers: [
    HybridCryptoService,
    PQCMigrationService,
    PQCDataValidationService,
    PQCDataEncryptionService,
    FieldEncryptionService,
    BulkEncryptionService,
    DataAccessPerformanceService,
  ],
  exports: [
    HybridCryptoService,
    PQCMigrationService,
    PQCDataValidationService,
    PQCDataEncryptionService,
    FieldEncryptionService,
    BulkEncryptionService,
    DataAccessPerformanceService,
  ],
})
export class ServicesModule {}
