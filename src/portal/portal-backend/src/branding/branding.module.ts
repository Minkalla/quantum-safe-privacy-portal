/**
 * @file branding.module.ts
 * @description NestJS module for branding functionality.
 * This module encapsulates all branding-related services and controllers,
 * providing white-label branding capabilities for the Quantum-Safe Privacy Portal.
 *
 * @module BrandingModule
 * @author Minkalla
 * @license MIT
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';
import { UserSchema } from '../models/User';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
  ],
  controllers: [BrandingController],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}
