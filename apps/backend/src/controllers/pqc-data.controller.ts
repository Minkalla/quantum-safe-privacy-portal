import { Controller, Post, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataMigrationService } from '../services/data-migration.service';
import { IntegrityCheckerService } from '../services/integrity-checker.service';
import { DataAccessPerformanceService } from '../services/data-access-performance.service';

@ApiTags('PQC Data Management')
@Controller('pqc-data')
export class PQCDataController {
  constructor(
    private readonly migrationService: DataMigrationService,
    private readonly integrityService: IntegrityCheckerService,
    private readonly performanceService: DataAccessPerformanceService,
  ) {}

  @Post('migrate')
  @ApiOperation({ summary: 'Migrate data to PQC protection' })
  @ApiResponse({ status: 200, description: 'Migration completed successfully' })
  async migrateToPQC() {
    return await this.migrationService.migrateToPQC();
  }

  @Post('rollback')
  @ApiOperation({ summary: 'Rollback PQC protection' })
  @ApiResponse({ status: 200, description: 'Rollback completed successfully' })
  async rollbackPQC() {
    return await this.migrationService.rollbackPQC();
  }

  @Post('integrity-check')
  @ApiOperation({ summary: 'Perform integrity check' })
  @ApiResponse({ status: 200, description: 'Integrity check completed' })
  async performIntegrityCheck() {
    await this.integrityService.performDailyIntegrityCheck();
    return { message: 'Integrity check completed' };
  }

  @Get('performance/:userId')
  @ApiOperation({ summary: 'Get performance metrics for user data' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
  async getPerformanceMetrics(@Param('userId') userId: string) {
    return await this.performanceService.getPerformanceMetrics(userId);
  }
}
