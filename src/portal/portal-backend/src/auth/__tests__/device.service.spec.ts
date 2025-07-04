import { TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DeviceService } from '../device.service';
import { createTestModule } from '../../test-utils/createTestModule';

describe('DeviceService', () => {
  let service: DeviceService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await createTestModule({
      providers: [DeviceService],
      configOverrides: {
        'device.trust.enabled': true,
        'device.trust.expiry_days': 30,
      },
    });

    service = module.get<DeviceService>(DeviceService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate consistent fingerprint for same device info', () => {
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 Test',
        ipAddress: '192.168.1.1',
      };

      const fingerprint1 = service.generateDeviceFingerprint(deviceInfo);
      const fingerprint2 = service.generateDeviceFingerprint(deviceInfo);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(64);
      expect(typeof fingerprint1).toBe('string');
    });

    it('should generate different fingerprints for different device info', () => {
      const deviceInfo1 = {
        userAgent: 'Mozilla/5.0 Test',
        ipAddress: '192.168.1.1',
      };

      const deviceInfo2 = {
        userAgent: 'Chrome/91.0 Test',
        ipAddress: '192.168.1.2',
      };

      const fingerprint1 = service.generateDeviceFingerprint(deviceInfo1);
      const fingerprint2 = service.generateDeviceFingerprint(deviceInfo2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('generateDeviceId', () => {
    it('should generate unique device IDs', () => {
      const deviceId1 = service.generateDeviceId();
      const deviceId2 = service.generateDeviceId();

      expect(deviceId1).not.toBe(deviceId2);
      expect(typeof deviceId1).toBe('string');
      expect(deviceId1.length).toBeGreaterThan(0);
    });
  });

  describe('registerTrustedDevice', () => {
    it('should register a new trusted device successfully', async () => {
      const userId = 'user123';
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 Test',
        ipAddress: '192.168.1.1',
        deviceName: 'Test Device',
        deviceType: 'desktop' as const,
      };

      const userModel = module.get(getModelToken('User'));
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        trustedDevices: [],
        save: () => Promise.resolve(true),
      };
      userModel.findById.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...mockUser,
        trustedDevices: [expect.any(Object)],
      });

      const result = await service.registerTrustedDevice(userId, deviceInfo);

      expect(result).toHaveProperty('deviceId');
      expect(result).toHaveProperty('fingerprint');
      expect(result.deviceName).toBe('Test Device');
      expect(result.deviceType).toBe('desktop');
      expect(result).toHaveProperty('lastUsed');
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('validateDeviceTrust', () => {
    it('should return trusted=true for valid trusted device', async () => {
      const userId = 'user123';
      const deviceFingerprint = 'abc123fingerprint';
      const trustedDevice = {
        deviceId: 'device123',
        fingerprint: deviceFingerprint,
        lastUsed: new Date(),
        createdAt: new Date(),
      };

      const userModel = module.get(getModelToken('User'));
      const userWithTrustedDevices = {
        _id: userId,
        email: 'test@example.com',
        trustedDevices: [trustedDevice],
      };

      userModel.findById.mockResolvedValue(userWithTrustedDevices);
      userModel.findByIdAndUpdate.mockResolvedValue(userWithTrustedDevices);

      const result = await service.validateDeviceTrust(userId, deviceFingerprint);

      expect(result.trusted).toBe(true);
      expect(result.decision.decision).toBe('trusted');
      expect(result.decision.deviceId).toBe('device123');
    });

    it('should return trusted=false for unknown device', async () => {
      const userId = 'user123';
      const deviceFingerprint = 'unknown-fingerprint';

      const userModel = module.get(getModelToken('User'));
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        trustedDevices: [],
      };
      userModel.findById.mockResolvedValue(mockUser);

      const result = await service.validateDeviceTrust(userId, deviceFingerprint);

      expect(result.trusted).toBe(false);
      expect(result.decision.decision).toBe('blocked');
      expect(result.decision.reason).toBe('Device not found in trusted devices');
    });

    it('should return trusted=false for expired device (older than 30 days)', async () => {
      const userId = 'user123';
      const deviceFingerprint = 'expired-fingerprint';
      const expiredDevice = {
        deviceId: 'device123',
        fingerprint: deviceFingerprint,
        lastUsed: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const userModel = module.get(getModelToken('User'));
      const userWithExpiredDevice = {
        _id: userId,
        email: 'test@example.com',
        trustedDevices: [expiredDevice],
      };

      userModel.findById.mockResolvedValue(userWithExpiredDevice);

      const result = await service.validateDeviceTrust(userId, deviceFingerprint);

      expect(result.trusted).toBe(false);
      expect(result.decision.decision).toBe('blocked');
    });
  });

  describe('detectSpoofingAttempt', () => {
    it('should detect potential spoofing when same fingerprint used within 5 seconds', async () => {
      const userId = 'user123';
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 Suspicious Browser',
        ipAddress: '192.168.1.100',
      };

      const currentFingerprint = service.generateDeviceFingerprint(deviceInfo);
      const recentDevice = {
        deviceId: 'device123',
        fingerprint: currentFingerprint, // Same fingerprint
        lastUsed: new Date(Date.now() - 2 * 1000), // 2 seconds ago
        createdAt: new Date(Date.now() - 2 * 1000), // 2 seconds ago (within 5 second window)
      };

      const userModel = module.get(getModelToken('User'));
      const userWithRecentDevices = {
        _id: userId,
        email: 'test@example.com',
        trustedDevices: [recentDevice],
      };

      userModel.findById.mockResolvedValue(userWithRecentDevices);

      const result = await service.detectSpoofingAttempt(deviceInfo, userId);

      expect(result).toBe(true);
    });

    it('should not detect spoofing for legitimate different devices', async () => {
      const userId = 'user123';
      const deviceInfo = {
        userAgent: 'Chrome/91.0 Legitimate Browser',
        ipAddress: '192.168.1.100',
      };

      const recentDevice = {
        deviceId: 'device123',
        fingerprint: 'Mozilla/5.0 Different Browser:192.168.1.1',
        lastUsed: new Date(Date.now() - 30 * 60 * 1000),
        createdAt: new Date(),
      };

      const userModel = module.get(getModelToken('User'));
      const userWithRecentDevices = {
        _id: userId,
        email: 'test@example.com',
        trustedDevices: [recentDevice],
      };

      userModel.findById.mockResolvedValue(userWithRecentDevices);

      const result = await service.detectSpoofingAttempt(deviceInfo, userId);

      expect(result).toBe(false);
    });

    it('should return false when user has no trusted devices', async () => {
      const userId = 'user123';
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 Test',
        ipAddress: '192.168.1.1',
      };

      const userModel = module.get(getModelToken('User'));
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        trustedDevices: [],
      };

      userModel.findById.mockResolvedValue(mockUser);

      const result = await service.detectSpoofingAttempt(deviceInfo, userId);

      expect(result).toBe(false);
    });
  });
});
