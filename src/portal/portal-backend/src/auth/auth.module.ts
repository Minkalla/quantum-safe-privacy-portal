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
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from '../entities/user.entity';
import { JwtModule } from '../jwt/jwt.module';
import { PQCFeatureFlagsModule } from '../pqc/pqc-feature-flags.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule,
    PQCFeatureFlagsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
