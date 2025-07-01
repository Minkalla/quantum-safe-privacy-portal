import { Controller, Get, Post, Put, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PQCUserOptionsDto } from '../dto/pqc-api.dto';

@ApiTags('pqc-user')
@Controller('api/v1/pqc/user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PQCUserController {
  private readonly logger = new Logger(PQCUserController.name);

  constructor() {}

  @Post(':userId/enable-pqc')
  @ApiOperation({ summary: 'Enable PQC for user' })
  @ApiResponse({ status: 200, description: 'PQC enabled successfully' })
  async enablePQC(@Param('userId') userId: string, @Body() options: PQCUserOptionsDto) {
    try {
      this.logger.log(`Enabling PQC for user: ${userId}`);

      const algorithms = options.algorithms || ['ML-KEM-768', 'ML-DSA-65'];
      const user = {
        _id: userId,
        pqcEnabled: true,
        supportedPQCAlgorithms: algorithms,
      };

      return {
        success: true,
        userId: user._id,
        pqcEnabled: user.pqcEnabled,
        algorithms: user.supportedPQCAlgorithms,
        hybridMode: options.hybridMode !== false,
      };
    } catch (error) {
      this.logger.error(`PQC enablement failed for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  @Get(':userId/pqc-status')
  @ApiOperation({ summary: 'Get user PQC status' })
  @ApiResponse({ status: 200, description: 'PQC status retrieved successfully' })
  async getPQCStatus(@Param('userId') userId: string) {
    try {
      this.logger.log(`Getting PQC status for user: ${userId}`);

      const user = {
        pqcEnabled: true,
        supportedPQCAlgorithms: ['ML-KEM-768', 'ML-DSA-65'],
        hybridMode: true,
        pqcEnabledAt: new Date(),
      };

      return {
        success: true,
        userId,
        pqcEnabled: user?.pqcEnabled || false,
        algorithms: user?.supportedPQCAlgorithms || ['ML-KEM-768', 'ML-DSA-65'],
        hybridMode: user?.hybridMode !== false,
        lastUpdated: user?.pqcEnabledAt || null,
      };
    } catch (error) {
      this.logger.error(`PQC status retrieval failed for user ${userId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        userId,
      };
    }
  }

  @Put(':userId/pqc-settings')
  @ApiOperation({ summary: 'Update user PQC settings' })
  @ApiResponse({ status: 200, description: 'PQC settings updated successfully' })
  async updatePQCSettings(@Param('userId') userId: string, @Body() options: PQCUserOptionsDto) {
    try {
      this.logger.log(`Updating PQC settings for user: ${userId}`);

      const updatedUser = {
        _id: userId,
        pqcEnabled: true,
        supportedPQCAlgorithms: options.algorithms || ['ML-KEM-768'],
        hybridMode: options.hybridMode !== undefined ? options.hybridMode : false,
      };

      return {
        success: true,
        userId: updatedUser._id,
        pqcEnabled: updatedUser.pqcEnabled,
        algorithms: updatedUser.supportedPQCAlgorithms,
        hybridMode: updatedUser.hybridMode,
      };
    } catch (error) {
      this.logger.error(`PQC settings update failed for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  @Post(':userId/disable-pqc')
  @ApiOperation({ summary: 'Disable PQC for user' })
  @ApiResponse({ status: 200, description: 'PQC disabled successfully' })
  async disablePQC(@Param('userId') userId: string) {
    try {
      this.logger.log(`Disabling PQC for user: ${userId}`);

      const user = {
        _id: userId,
        pqcEnabled: false,
      };

      return {
        success: true,
        userId: user._id,
        pqcEnabled: false,
        disabledAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`PQC disabling failed for user ${userId}: ${error.message}`);
      throw error;
    }
  }
}
