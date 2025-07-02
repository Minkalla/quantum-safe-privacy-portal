import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from '../models/User';
import * as crypto from 'crypto';

export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  deviceName?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

export interface TrustedDevice {
  deviceId: string;
  fingerprint: string;
  deviceName?: string;
  deviceType?: string;
  lastUsed: Date;
  createdAt: Date;
}

export interface DeviceDecision {
  decision: 'trusted' | 'pending' | 'blocked';
  deviceId?: string;
  fingerprintHash: string;
  timestamp: Date;
  reason: string;
}

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>,
  ) {}

  generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
    const { userAgent, ipAddress } = deviceInfo;
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${userAgent}:${ipAddress}`)
      .digest('hex');
    return fingerprint;
  }

  generateDeviceId(): string {
    return crypto.randomUUID();
  }

  private sanitizeFingerprintForLogging(fingerprint: string): string {
    return fingerprint.substring(0, 8) + '...';
  }

  private logDeviceDecision(userId: string, decision: DeviceDecision): void {
    this.logger.log({
      message: 'Device trust decision',
      userId,
      deviceDecision: {
        ...decision,
        fingerprintHash: this.sanitizeFingerprintForLogging(decision.fingerprintHash),
      },
    });
  }

  async registerTrustedDevice(userId: string, deviceInfo: DeviceInfo): Promise<TrustedDevice> {
    const fingerprint = this.generateDeviceFingerprint(deviceInfo);
    const deviceId = this.generateDeviceId();

    const trustedDevice: TrustedDevice = {
      deviceId,
      fingerprint,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      lastUsed: new Date(),
      createdAt: new Date(),
    };

    await this.userModel.findByIdAndUpdate(userId, {
      $push: { trustedDevices: trustedDevice },
    });

    this.logDeviceDecision(userId, {
      decision: 'trusted',
      deviceId,
      fingerprintHash: fingerprint,
      timestamp: new Date(),
      reason: 'Device registered successfully',
    });

    return trustedDevice;
  }

  async validateDeviceTrust(userId: string, deviceFingerprint: string): Promise<{ trusted: boolean; decision: DeviceDecision }> {
    const user = await this.userModel.findById(userId);

    const decision: DeviceDecision = {
      decision: 'blocked',
      fingerprintHash: deviceFingerprint,
      timestamp: new Date(),
      reason: 'Device not found in trusted devices',
    };

    if (!user?.trustedDevices) {
      this.logDeviceDecision(userId, decision);
      return { trusted: false, decision };
    }

    const trustedDevice = user.trustedDevices.find(device =>
      device.fingerprint === deviceFingerprint &&
      device.lastUsed &&
      device.lastUsed > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );

    if (trustedDevice) {
      decision.decision = 'trusted';
      decision.deviceId = trustedDevice.deviceId;
      decision.reason = 'Device found in trusted devices list';

      await this.userModel.findByIdAndUpdate(userId, {
        $set: { 'trustedDevices.$.lastUsed': new Date() },
      }, { arrayFilters: [{ 'elem.deviceId': trustedDevice.deviceId }] });
    }

    this.logDeviceDecision(userId, decision);
    return { trusted: trustedDevice !== undefined, decision };
  }

  async detectSpoofingAttempt(deviceInfo: DeviceInfo, userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user?.trustedDevices) return false;

    const recentDevices = user.trustedDevices.filter(device =>
      device.lastUsed > new Date(Date.now() - 60 * 60 * 1000),
    );

    const suspiciousPattern = recentDevices.some(device => {
      const [deviceUA] = device.fingerprint.split(':');
      return deviceUA === deviceInfo.userAgent.substring(0, 50);
    });

    if (suspiciousPattern) {
      this.logDeviceDecision(userId, {
        decision: 'blocked',
        fingerprintHash: this.generateDeviceFingerprint(deviceInfo),
        timestamp: new Date(),
        reason: 'Potential spoofing detected - same userAgent from different context',
      });
    }

    return suspiciousPattern;
  }
}
