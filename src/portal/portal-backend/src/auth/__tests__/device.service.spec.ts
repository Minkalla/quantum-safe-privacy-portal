import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DeviceService } from '../device.service';
import { Model } from 'mongoose';
import { IUser } from '../../models/User';

describe('DeviceService', () => {
  let service: DeviceService;
  let userModel: Model<IUser>;

  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    trustedDevices: [],
    save: () => Promise.resolve(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        {
          provide: getModelToken('User'),
          useValue: (() => {
            function MockUserModel(userData) {
              Object.assign(this, { ...mockUser, ...userData });
              
              this.save = function() {
                const result = { 
                  ...this, 
                  _id: '507f1f77bcf86cd799439011'
                };
                return Promise.resolve(result);
              };
            }
            
            MockUserModel.findById = function(id) {
              if (id === 'user123') {
                return Promise.resolve(mockUser);
              }
              return Promise.resolve(null);
            };
            
            MockUserModel.findByIdAndUpdate = function(id, update) {
              if (id === 'user123') {
                const updatedUser = { ...mockUser };
                if (update.$push && update.$push.trustedDevices) {
                  updatedUser.trustedDevices = [...mockUser.trustedDevices, update.$push.trustedDevices];
                }
                return Promise.resolve(updatedUser);
              }
              return Promise.resolve(null);
            };
            
            return MockUserModel;
          })(),
        },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
    userModel = module.get(getModelToken('User'));
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

      const userWithTrustedDevices = {
        ...mockUser,
        trustedDevices: [trustedDevice],
      };

      (userModel as any).findById = () => Promise.resolve(userWithTrustedDevices);
      (userModel as any).findByIdAndUpdate = () => Promise.resolve(userWithTrustedDevices);

      const result = await service.validateDeviceTrust(userId, deviceFingerprint);

      expect(result.trusted).toBe(true);
      expect(result.decision.decision).toBe('trusted');
      expect(result.decision.deviceId).toBe('device123');
    });

    it('should return trusted=false for unknown device', async () => {
      const userId = 'user123';
      const deviceFingerprint = 'unknown-fingerprint';

      userModel.findById = () => Promise.resolve(mockUser);

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
        lastUsed: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
        createdAt: new Date(),
      };

      const userWithExpiredDevice = {
        ...mockUser,
        trustedDevices: [expiredDevice],
      };

      (userModel as any).findById = () => Promise.resolve(userWithExpiredDevice);

      const result = await service.validateDeviceTrust(userId, deviceFingerprint);

      expect(result.trusted).toBe(false);
      expect(result.decision.decision).toBe('blocked');
    });
  });

  describe('detectSpoofingAttempt', () => {
    it('should detect potential spoofing when same userAgent used recently', async () => {
      const userId = 'user123';
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 Suspicious Browser',
        ipAddress: '192.168.1.100',
      };

      const recentDevice = {
        deviceId: 'device123',
        fingerprint: 'Mozilla/5.0 Suspicious Browser:192.168.1.1',
        lastUsed: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        createdAt: new Date(),
      };

      const userWithRecentDevices = {
        ...mockUser,
        trustedDevices: [recentDevice],
      };

      userModel.findById = () => Promise.resolve(userWithRecentDevices);

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

      const userWithRecentDevices = {
        ...mockUser,
        trustedDevices: [recentDevice],
      };

      userModel.findById = () => Promise.resolve(userWithRecentDevices);

      const result = await service.detectSpoofingAttempt(deviceInfo, userId);

      expect(result).toBe(false);
    });

    it('should return false when user has no trusted devices', async () => {
      const userId = 'user123';
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 Test',
        ipAddress: '192.168.1.1',
      };

      userModel.findById = () => Promise.resolve(mockUser);

      const result = await service.detectSpoofingAttempt(deviceInfo, userId);

      expect(result).toBe(false);
    });
  });
});
