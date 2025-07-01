import { Module } from '@nestjs/common';
import { BaselineManagerService } from './baseline-manager.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { AlertingService } from './alerting.service';
import { AuditTrailService } from './audit-trail.service';
import { PerformanceGatesService } from './performance-gates.service';

@Module({
  providers: [
    BaselineManagerService,
    AnomalyDetectorService,
    AlertingService,
    AuditTrailService,
    PerformanceGatesService,
  ],
  exports: [
    BaselineManagerService,
    AnomalyDetectorService,
    AlertingService,
    AuditTrailService,
    PerformanceGatesService,
  ],
})
export class MonitoringModule {}
