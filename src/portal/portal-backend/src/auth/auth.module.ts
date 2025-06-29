// src/portal/portal-backend/src/auth/auth.module.ts
/**
 * @file auth.module.ts
 * @description NestJS module for authentication-related features.
 * This module encapsulates controllers, services, and other components
 * responsible for user registration, login, and authentication management.
 *
 * @module AuthModule
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This module is a core part of the "no regrets" architecture, promoting
 * modularity and separation of concerns for authentication. It integrates
 * with the User and Jwt modules.
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EnhancedAuthService } from './enhanced-auth.service';
import { UserSchema } from '../models/User';
import { JwtModule } from '../jwt/jwt.module';
import { PQCFeatureFlagsModule } from '../pqc/pqc-feature-flags.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    JwtModule,
    PQCFeatureFlagsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, EnhancedAuthService],
  exports: [AuthService, EnhancedAuthService],
})
export class AuthModule {}
