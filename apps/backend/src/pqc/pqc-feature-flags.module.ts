import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PQCFeatureFlagsService } from './pqc-feature-flags.service';
import { PQCMonitoringService } from './pqc-monitoring.service';
import { PQCRollbackTestService } from './pqc-rollback-test.service';

@Module({
  imports: [ConfigModule],
  providers: [PQCFeatureFlagsService, PQCMonitoringService, PQCRollbackTestService],
  exports: [PQCFeatureFlagsService, PQCMonitoringService, PQCRollbackTestService],
})
export class PQCFeatureFlagsModule {}
