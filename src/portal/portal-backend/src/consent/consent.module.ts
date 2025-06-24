/**
 * @file consent.module.ts
 * @description NestJS module for consent-related features.
 * This module encapsulates controllers, services, and other components
 * responsible for consent management and GDPR compliance.
 *
 * @module ConsentModule
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This module is a core part of the "no regrets" architecture, promoting
 * modularity and separation of concerns for consent management. It integrates
 * with the Consent model and JWT authentication.
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { ConsentSchema } from '../models/Consent';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Consent', schema: ConsentSchema }]),
    JwtModule,
  ],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
