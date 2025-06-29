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
import { HybridCryptoService } from '../services/hybrid-crypto.service';
import { ClassicalCryptoService } from '../services/classical-crypto.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { PQCDataController } from '../controllers/pqc-data.controller';
import { PQCConsentController } from '../controllers/pqc-consent.controller';
import { PQCUserController } from '../controllers/pqc-user.controller';
import { PQCPerformanceController } from '../controllers/pqc-performance.controller';
import { PQCApiMiddleware } from '../middleware/pqc-api.middleware';
import { PQCApiGuard } from '../guards/pqc-api.guard';
import { ApiPerformanceService } from '../services/api-performance.service';
import { PerformanceMonitorInterceptor } from '../interceptors/performance-monitor.interceptor';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UserModule,
    JwtModule,
    MongooseModule.forFeature([{ name: Consent.name, schema: ConsentSchema }]),
  ],
  controllers: [
    PQCDataController,
    PQCConsentController,
    PQCUserController,
    PQCPerformanceController,
  ],
  providers: [
    PQCDataEncryptionService,
    FieldEncryptionService,
    BulkEncryptionService,
    PQCDataValidationService,
    IntegrityCheckerService,
    ConsentPQCRepository,
    DataMigrationService,
    DataAccessPerformanceService,
    HybridCryptoService,
    ClassicalCryptoService,
    CircuitBreakerService,
    PQCApiMiddleware,
    PQCApiGuard,
    ApiPerformanceService,
    PerformanceMonitorInterceptor,
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
    HybridCryptoService,
    ClassicalCryptoService,
    CircuitBreakerService,
    PQCApiMiddleware,
    PQCApiGuard,
    ApiPerformanceService,
    PerformanceMonitorInterceptor,
  ],
})
export class PQCDataModule {}
