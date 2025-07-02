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

import { Module, NestModule, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EnhancedAuthService } from './enhanced-auth.service';
import { AuthMiddleware } from './auth.middleware';
import { MFAService } from './mfa.service';
import { SsoService } from './sso.service';
import { DeviceService } from './device.service';
import { QuantumSafeJWTService } from '../services/quantum-safe-jwt.service';
import { QuantumSafeCryptoIdentityService } from '../services/quantum-safe-crypto-identity.service';
import { PQCBridgeService } from '../services/pqc-bridge.service';
import { UserSchema } from '../models/User';
import { JwtModule } from '../jwt/jwt.module';
import { PQCFeatureFlagsModule } from '../pqc/pqc-feature-flags.module';
import { CryptoServicesModule } from '../services/crypto-services.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { SecretsModule } from '../secrets/secrets.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    JwtModule,
    PQCFeatureFlagsModule,
    forwardRef(() => CryptoServicesModule),
    MonitoringModule,
    SecretsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, EnhancedAuthService, AuthMiddleware, MFAService, SsoService, DeviceService, QuantumSafeJWTService, QuantumSafeCryptoIdentityService, PQCBridgeService],
  exports: [AuthService, EnhancedAuthService, AuthMiddleware, MFAService, SsoService, DeviceService, QuantumSafeJWTService, QuantumSafeCryptoIdentityService, PQCBridgeService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('portal/user/*', 'portal/pqc/*');
  }
}
