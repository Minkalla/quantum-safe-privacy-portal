import { Module } from '@nestjs/common';
import { ABTestingService } from './ab-testing.service';
import { MetricsCollectorService } from './metrics-collector.service';
import { RollbackSystemService } from './rollback-system.service';
import { ABTestingIntegrationService } from './ab-testing-integration.service';
import { PQCFeatureFlagsModule } from './pqc-feature-flags.module';

@Module({
  imports: [PQCFeatureFlagsModule],
  providers: [
    ABTestingService,
    MetricsCollectorService,
    RollbackSystemService,
    ABTestingIntegrationService,
  ],
  exports: [
    ABTestingService,
    MetricsCollectorService,
    RollbackSystemService,
    ABTestingIntegrationService,
  ],
})
export class ABTestingModule {}
