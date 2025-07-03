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
    if (!fingerprint || typeof fingerprint !== 'string') {
      return 'invalid...';
    }
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
    return this.registerTrustedDeviceWithFingerprint(userId, deviceInfo, fingerprint);
  }

  async registerTrustedDeviceWithFingerprint(userId: string, deviceInfo: DeviceInfo, fingerprint: string): Promise<TrustedDevice> {
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
    const currentFingerprint = this.generateDeviceFingerprint(deviceInfo);
    return this.detectSpoofingAttemptWithFingerprint(deviceInfo, currentFingerprint, userId);
  }

  async detectSpoofingAttemptWithFingerprint(deviceInfo: DeviceInfo, fingerprint: string, userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user?.trustedDevices) {
      this.logger.debug(`No trusted devices found for user ${userId}`);
      return false;
    }

    this.logger.debug(`Checking spoofing for fingerprint: ${this.sanitizeFingerprintForLogging(fingerprint)}, userAgent: ${deviceInfo.userAgent}`);
    
    const suspiciousPattern = user.trustedDevices.some(device => {
      if (!device.fingerprint || !deviceInfo.userAgent) {
        return false;
      }
      
      const isExactMatch = device.fingerprint === fingerprint;
      const isVeryRecent = device.createdAt && device.createdAt > new Date(Date.now() - 5 * 1000); // 5 seconds for exact matches only
      
      this.logger.debug(`Comparing with existing device: fingerprint=${this.sanitizeFingerprintForLogging(device.fingerprint)}, exactMatch=${isExactMatch}, veryRecent=${isVeryRecent}`);
      
      return isExactMatch && isVeryRecent;
    });

    if (suspiciousPattern) {
      const reason = 'Potential spoofing detected - duplicate fingerprint within 5 seconds';
        
      this.logger.warn(`Spoofing detected for user ${userId}: ${reason}`);
      this.logDeviceDecision(userId, {
        decision: 'blocked',
        fingerprintHash: fingerprint,
        timestamp: new Date(),
        reason,
      });
    }

    return suspiciousPattern;
  }
}
