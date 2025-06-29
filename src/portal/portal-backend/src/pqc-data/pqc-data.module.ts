import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import Consent, { ConsentSchema } from '../models/Consent';
import { PQCDataEncryptionService } from '../services/pqc-data-encryption.service';
import { FieldEncryptionService } from '../services/field-encryption.service';
import { BulkEncryptionService } from '../services/bulk-encryption.service';
import { PQCDataValidationService } from '../services/pqc-data-validation.service';
import { IntegrityCheckerService } from '../services/integrity-checker.service';
import { ConsentPQCRepository } from '../repositories/consent-pqc.repository';
import { DataMigrationService } from '../services/data-migration.service';
import { DataAccessPerformanceService } from '../services/data-access-performance.service';
import { PQCDataController } from '../controllers/pqc-data.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: Consent.name, schema: ConsentSchema },
    ]),
  ],
  controllers: [PQCDataController],
  providers: [
    PQCDataEncryptionService,
    FieldEncryptionService,
    BulkEncryptionService,
    PQCDataValidationService,
    IntegrityCheckerService,
    ConsentPQCRepository,
    DataMigrationService,
    DataAccessPerformanceService,
  ],
  exports: [
    PQCDataEncryptionService,
    FieldEncryptionService,
    BulkEncryptionService,
    PQCDataValidationService,
    IntegrityCheckerService,
    ConsentPQCRepository,
    DataMigrationService,
    DataAccessPerformanceService,
  ],
})
export class PQCDataModule {}
