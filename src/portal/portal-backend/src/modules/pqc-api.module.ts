import { Module } from '@nestjs/common';
import { PQCConsentController } from '../controllers/pqc-consent.controller';
import { PQCUserController } from '../controllers/pqc-user.controller';
import { PQCPerformanceController } from '../controllers/pqc-performance.controller';
import { PQCApiMiddleware } from '../middleware/pqc-api.middleware';
import { PQCApiGuard } from '../guards/pqc-api.guard';
import { ApiPerformanceService } from '../services/api-performance.service';
import { PerformanceMonitorInterceptor } from '../interceptors/performance-monitor.interceptor';
import { PQCDataModule } from '../pqc-data/pqc-data.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PQCDataModule, AuthModule],
  controllers: [PQCConsentController, PQCUserController, PQCPerformanceController],
  providers: [PQCApiMiddleware, PQCApiGuard, ApiPerformanceService, PerformanceMonitorInterceptor],
  exports: [PQCApiMiddleware, PQCApiGuard, ApiPerformanceService, PerformanceMonitorInterceptor],
})
export class PQCApiModule {}
