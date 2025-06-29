import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HybridCryptoService } from '../services/hybrid-crypto.service';
import { PQCMigrationService } from '../services/pqc-migration.service';

@ApiTags('PQC Security')
@Controller('pqc-security')
export class PQCSecurityController {
  private readonly logger = new Logger(PQCSecurityController.name);

  constructor(
    private readonly hybridCrypto: HybridCryptoService,
    private readonly migrationService: PQCMigrationService,
  ) {}

  @Get('circuit-breaker/status')
  @ApiOperation({ summary: 'Get circuit breaker status' })
  @ApiResponse({ status: 200, description: 'Circuit breaker status retrieved' })
  getCircuitBreakerStatus() {
    return this.hybridCrypto.getCircuitBreakerStatus();
  }

  @Post('circuit-breaker/reset')
  @ApiOperation({ summary: 'Reset circuit breaker' })
  @ApiResponse({ status: 200, description: 'Circuit breaker reset successfully' })
  resetCircuitBreaker() {
    this.hybridCrypto.resetCircuitBreaker();
    return { message: 'Circuit breaker reset successfully' };
  }

  @Get('migration/status')
  @ApiOperation({ summary: 'Get migration service status' })
  @ApiResponse({ status: 200, description: 'Migration status retrieved' })
  async getMigrationStatus() {
    return await this.migrationService.getMigrationStatus();
  }

  @Get('migration/compatibility')
  @ApiOperation({ summary: 'Check migration compatibility' })
  @ApiResponse({ status: 200, description: 'Migration compatibility checked' })
  async checkMigrationCompatibility() {
    return await this.migrationService.validateMigrationCompatibility();
  }

  @Post('migration/user/:userId')
  @ApiOperation({ summary: 'Migrate specific user data' })
  @ApiResponse({ status: 200, description: 'User migration completed' })
  async migrateUser(@Param('userId') userId: string) {
    try {
      const result = await this.migrationService.migrateUserData(userId);
      return result;
    } catch (error) {
      this.logger.error(`Migration failed for user ${userId}: ${error.message}`);
      return {
        success: false,
        algorithm: 'unknown',
        errors: [error.message],
      };
    }
  }

  @Post('migration/batch')
  @ApiOperation({ summary: 'Migrate batch of users' })
  @ApiResponse({ status: 200, description: 'Batch migration completed' })
  async migrateBatch(@Body() body: { userIds: string[] }) {
    try {
      const result = await this.migrationService.migrateBatchUsers(body.userIds);
      return result;
    } catch (error) {
      this.logger.error(`Batch migration failed: ${error.message}`);
      return {
        success: false,
        algorithm: 'unknown',
        errors: [error.message],
      };
    }
  }

  @Post('test/encryption')
  @ApiOperation({ summary: 'Test hybrid encryption with fallback' })
  @ApiResponse({ status: 200, description: 'Encryption test completed' })
  async testEncryption(@Body() body: { data: string; publicKey?: string }) {
    try {
      const result = await this.hybridCrypto.encryptWithFallback(body.data, body.publicKey);
      return {
        success: true,
        result,
      };
    } catch (error) {
      this.logger.error(`Encryption test failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('test/token-generation')
  @ApiOperation({ summary: 'Test hybrid token generation with fallback' })
  @ApiResponse({ status: 200, description: 'Token generation test completed' })
  async testTokenGeneration(@Body() body: { userId: string; payload?: Record<string, any> }) {
    try {
      const result = await this.hybridCrypto.generateTokenWithFallback(
        body.userId,
        body.payload || {},
      );
      return result;
    } catch (error) {
      this.logger.error(`Token generation test failed: ${error.message}`);
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }
}
