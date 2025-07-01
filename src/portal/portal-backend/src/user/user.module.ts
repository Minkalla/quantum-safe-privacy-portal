// src/portal/portal-backend/src/user/user.module.ts
/**
 * @file user.module.ts
 * @description NestJS module for user-related functionalities.
 * This module encapsulates the Mongoose User model, making it available
 * for injection into other modules and services.
 *
 * @module UserModule
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * This module adheres to the "no regrets" architecture by centralizing
 * the User model definition and its interaction layer, promoting
 * modularity and maintainability.
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../models/User';
import { UserController } from './user.controller';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    JwtModule,
  ],
  controllers: [UserController],
  providers: [],
  exports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
  ],
})
export class UserModule {}
