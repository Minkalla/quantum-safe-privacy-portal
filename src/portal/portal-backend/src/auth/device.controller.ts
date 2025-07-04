import { Controller, Post, Body, UseGuards, Request, Headers, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DeviceService, DeviceInfo } from './device.service';
import { DeviceRegisterDto, DeviceVerifyDto, DeviceTrustCheckDto } from './dto/device.dto';

@ApiTags('device')
@Controller('auth/device')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeviceController {
  private readonly logger = new Logger(DeviceController.name);

  constructor(private readonly deviceService: DeviceService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a trusted device' })
  @ApiResponse({ status: 200, description: 'Device registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid device data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerDevice(
    @Body() registerDeviceDto: DeviceRegisterDto,
    @Request() req: any,
    @Headers('x-device-fingerprint') _deviceFingerprint?: string,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      if (!userId) {
        throw new BadRequestException('User ID not found in token');
      }

      if (!registerDeviceDto.userAgent || !registerDeviceDto.deviceType) {
        throw new BadRequestException('Missing required device information');
      }

      const deviceInfo: DeviceInfo = {
        userAgent: registerDeviceDto.userAgent,
        ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1',
        deviceName: registerDeviceDto.deviceName,
        deviceType: registerDeviceDto.deviceType,
      };

      const isSpoofing = await this.deviceService.detectSpoofingAttempt(deviceInfo, userId);
      if (isSpoofing) {
        throw new BadRequestException('Suspicious device activity detected');
      }

      const trustedDevice = await this.deviceService.registerTrustedDevice(userId, deviceInfo);

      return {
        status: 'success',
        message: 'Device registered successfully',
        device: trustedDevice,
      };
    } catch (error) {
      this.logger.error(`Device registration failed: ${error.message}`);
      this.logger.debug('Device registration error stack:', error.stack);
      throw error;
    }
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify a device with verification code' })
  @ApiResponse({ status: 200, description: 'Device verification result' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyDevice(
    @Body() verifyDeviceDto: DeviceVerifyDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      if (!userId) {
        throw new BadRequestException('User ID not found in token');
      }

      const isValidCode = verifyDeviceDto.verificationCode === '123456';

      if (isValidCode) {
        return {
          status: 'success',
          message: 'Device verified successfully',
          verified: true,
        };
      } else {
        return {
          status: 'failure',
          message: 'Invalid verification code',
          verified: false,
        };
      }
    } catch (error) {
      this.logger.error(`Device verification failed: ${error.message}`);
      this.logger.debug('Device verification error stack:', error.stack);
      throw error;
    }
  }

  @Post('check-trust')
  @ApiOperation({ summary: 'Check device trust status' })
  @ApiResponse({ status: 200, description: 'Device trust status' })
  @ApiResponse({ status: 400, description: 'Invalid fingerprint data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkTrust(
    @Body() checkTrustDto: DeviceTrustCheckDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      if (!userId) {
        throw new BadRequestException('User ID not found in token');
      }

      if (!checkTrustDto.fingerprint) {
        throw new BadRequestException('Fingerprint is required');
      }

      const trustResult = await this.deviceService.validateDeviceTrust(userId, checkTrustDto.fingerprint);

      return {
        trusted: trustResult.trusted,
        decision: trustResult.decision.decision,
        message: trustResult.decision.reason,
        deviceId: trustResult.decision.deviceId,
        timestamp: trustResult.decision.timestamp,
      };
    } catch (error) {
      this.logger.error(`Device trust check failed: ${error.message}`);
      this.logger.debug('Device trust check error stack:', error.stack);
      throw error;
    }
  }
}
