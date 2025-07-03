/**
 * @file branding.controller.spec.ts
 * @description Integration tests for BrandingController.
 * Tests API endpoints for branding configuration management.
 *
 * @module BrandingControllerTests
 * @author Minkalla
 * @license MIT
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BrandingController } from '../branding.controller';
import { BrandingService } from '../branding.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

describe('BrandingController', () => {
  let controller: BrandingController;
  let mockBrandingService: any;

  beforeEach(async () => {
    mockBrandingService = {
      getBrandingConfig: jest.fn(),
      updateBrandingConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandingController],
      providers: [
        {
          provide: BrandingService,
          useValue: mockBrandingService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BrandingController>(BrandingController);
  });

  describe('getBrandingConfig', () => {
    it('should return branding configuration successfully', async () => {
      const mockConfig = {
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        companyName: 'Test Company',
        customCss: null,
      };
      mockBrandingService.getBrandingConfig.mockResolvedValue(mockConfig);

      const mockRequest = {
        user: { userId: 'user123', email: 'test@example.com' },
      };

      const result = await controller.getBrandingConfig(mockRequest as any);

      expect(result).toEqual({
        status: 'success',
        message: 'Branding configuration retrieved successfully',
        data: mockConfig,
      });
      expect(mockBrandingService.getBrandingConfig).toHaveBeenCalledWith('user123');
    });
  });

  describe('updateBrandingConfig', () => {
    it('should update branding configuration successfully', async () => {
      const updateData = {
        logoUrl: 'https://example.com/new-logo.png',
        primaryColor: '#ff0000',
        companyName: 'Updated Company',
      };
      mockBrandingService.updateBrandingConfig.mockResolvedValue(updateData);

      const mockRequest = {
        user: { userId: 'user123', email: 'test@example.com' },
      };

      const result = await controller.updateBrandingConfig(mockRequest as any, updateData);

      expect(result).toEqual({
        status: 'success',
        message: 'Branding configuration updated successfully',
        data: updateData,
      });
      expect(mockBrandingService.updateBrandingConfig).toHaveBeenCalledWith('user123', updateData);
    });
  });
});
