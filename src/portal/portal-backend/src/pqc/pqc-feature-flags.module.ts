import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PQCFeatureFlagsService } from './pqc-feature-flags.service';

@Module({
  imports: [ConfigModule],
  providers: [PQCFeatureFlagsService],
  exports: [PQCFeatureFlagsService],
})
export class PQCFeatureFlagsModule {}
