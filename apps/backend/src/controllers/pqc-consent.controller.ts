import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConsentPQCRepository } from '../repositories/consent-pqc.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PQCDataValidationService } from '../services/pqc-data-validation.service';
import { CreatePQCConsentDto } from '../dto/pqc-api.dto';

@ApiTags('pqc-consent')
@Controller('api/v1/pqc/consent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PQCConsentController {
  private readonly logger = new Logger(PQCConsentController.name);

  constructor(
    private readonly consentRepository: ConsentPQCRepository,
    private readonly validationService: PQCDataValidationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create PQC-protected consent' })
  @ApiResponse({ status: 201, description: 'Consent created successfully' })
  async createConsent(@Body() createConsentDto: CreatePQCConsentDto) {
    try {
      this.logger.log(`Creating PQC consent for user: ${createConsentDto.userId}`);

      const integrity = await this.validationService.createDataIntegrity(
        createConsentDto.consentData,
        createConsentDto.userId,
      );

      const consentData = {
        ...createConsentDto.consentData,
        dataIntegrity: integrity,
        isPQCProtected: true,
        protectionMode: 'pqc',
      };

      const consent = await this.consentRepository.createConsent(
        consentData,
        createConsentDto.userId,
      );

      this.logger.log(`PQC consent created successfully: ${consent._id}`);
      return {
        success: true,
        consentId: consent._id,
        algorithm: 'ML-KEM-768',
        signed: true,
      };
    } catch (error) {
      this.logger.error(`PQC consent creation failed: ${error.message}`);
      throw error;
    }
  }

  @Get(':consentId')
  @ApiOperation({ summary: 'Retrieve PQC-protected consent' })
  @ApiResponse({ status: 200, description: 'Consent retrieved successfully' })
  async getConsent(@Param('consentId') consentId: string, @Query('userId') userId: string) {
    try {
      const consent = await this.consentRepository.findByIdAndUserId(consentId, userId);

      if (!consent) {
        return { success: false, error: 'Consent not found' };
      }

      if (consent.dataIntegrity) {
        try {
          const validationResult = await this.validationService.validateDataIntegrity(
            consent.consentData,
            consent.dataIntegrity,
          );

          return {
            success: true,
            consent,
            integrity: {
              isValid: validationResult.isValid,
              verifiedAt: new Date(),
              algorithm: consent.dataIntegrity.signature?.algorithm || 'ML-DSA-65',
            },
          };
        } catch (validationError) {
          this.logger.warn(`Integrity validation failed: ${validationError.message}`);
          return {
            success: true,
            consent,
            integrity: {
              isValid: false,
              verifiedAt: new Date(),
              algorithm: consent.dataIntegrity.signature?.algorithm || 'ML-DSA-65',
              error: 'Validation failed',
            },
          };
        }
      }

      return {
        success: true,
        consent,
        integrity: {
          isValid: false,
          verifiedAt: new Date(),
          algorithm: 'None',
          error: 'No integrity data available',
        },
      };
    } catch (error) {
      this.logger.error(`PQC consent retrieval failed: ${error.message}`);
      throw error;
    }
  }

  @Put(':consentId')
  @ApiOperation({ summary: 'Update PQC-protected consent' })
  @ApiResponse({ status: 200, description: 'Consent updated successfully' })
  async updateConsent(
    @Param('consentId') consentId: string,
    @Body() updateData: any,
    @Query('userId') userId: string,
  ) {
    try {
      this.logger.log(`Updating PQC consent: ${consentId}`);

      const integrity = await this.validationService.createDataIntegrity(updateData, userId);

      const updatedData = {
        ...updateData,
        dataIntegrity: integrity,
        updatedAt: new Date(),
      };

      const consent = await this.consentRepository.updateByIdAndUserId(
        consentId,
        updatedData,
        userId,
      );

      return {
        success: true,
        consentId: consent._id,
        algorithm: 'ML-KEM-768',
        signed: true,
      };
    } catch (error) {
      this.logger.error(`PQC consent update failed: ${error.message}`);
      throw error;
    }
  }

  @Delete(':consentId')
  @ApiOperation({ summary: 'Delete PQC-protected consent' })
  @ApiResponse({ status: 200, description: 'Consent deleted successfully' })
  async deleteConsent(@Param('consentId') consentId: string, @Query('userId') userId: string) {
    try {
      this.logger.log(`Deleting PQC consent: ${consentId}`);

      await this.consentRepository.deleteByIdAndUserId(consentId, userId);

      return {
        success: true,
        message: 'Consent deleted successfully',
      };
    } catch (error) {
      this.logger.error(`PQC consent deletion failed: ${error.message}`);
      throw error;
    }
  }
}
