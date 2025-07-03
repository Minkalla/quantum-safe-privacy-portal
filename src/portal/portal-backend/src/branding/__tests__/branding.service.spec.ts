/**
 * @file branding.service.spec.ts
 * @description Unit tests for BrandingService.
 * Tests branding configuration retrieval, updates, and validation logic.
 *
 * @module BrandingServiceTests
 * @author Minkalla
 * @license MIT
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BrandingService } from '../branding.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BrandingService', () => {
  let service: BrandingService;
  let mockUserModel: any;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandingService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<BrandingService>(BrandingService);
  });

  describe('getBrandingConfig', () => {
    it('should return default branding config when user has no custom config', async () => {
      mockUserModel.findById.mockResolvedValue({ brandingConfig: null });

      const result = await service.getBrandingConfig('user123');

      expect(result).toEqual({
        logoUrl: null,
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        companyName: 'Quantum-Safe Privacy Portal',
        customCss: null,
      });
    });

    it('should return custom branding config when user has one', async () => {
      const customConfig = {
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
        companyName: 'Custom Company',
        customCss: '.custom { color: red; }',
      };
      mockUserModel.findById.mockResolvedValue({ brandingConfig: customConfig });

      const result = await service.getBrandingConfig('user123');

      expect(result).toEqual(customConfig);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.getBrandingConfig('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBrandingConfig', () => {
    it('should update branding config successfully', async () => {
      const newConfig = {
        logoUrl: 'https://example.com/new-logo.png',
        primaryColor: '#0000ff',
        secondaryColor: '#ffff00',
        companyName: 'Updated Company',
      };
      mockUserModel.findByIdAndUpdate.mockResolvedValue({ brandingConfig: newConfig });

      const result = await service.updateBrandingConfig('user123', newConfig);

      expect(result).toEqual(newConfig);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        { brandingConfig: newConfig },
        { new: true }
      );
    });

    it('should throw BadRequestException for invalid primary color', async () => {
      const invalidConfig = {
        primaryColor: 'invalid-color',
      };

      await expect(service.updateBrandingConfig('user123', invalidConfig)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid secondary color', async () => {
      const invalidConfig = {
        secondaryColor: 'invalid-color',
      };

      await expect(service.updateBrandingConfig('user123', invalidConfig)).rejects.toThrow(BadRequestException);
    });

    it('should accept valid hex colors', async () => {
      const validConfig = {
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
      };
      mockUserModel.findByIdAndUpdate.mockResolvedValue({ brandingConfig: validConfig });

      const result = await service.updateBrandingConfig('user123', validConfig);

      expect(result).toEqual(validConfig);
    });

    it('should accept valid named colors', async () => {
      const validConfig = {
        primaryColor: 'red',
        secondaryColor: 'blue',
      };
      mockUserModel.findByIdAndUpdate.mockResolvedValue({ brandingConfig: validConfig });

      const result = await service.updateBrandingConfig('user123', validConfig);

      expect(result).toEqual(validConfig);
    });

    it('should throw NotFoundException when user not found during update', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.updateBrandingConfig('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });
});
