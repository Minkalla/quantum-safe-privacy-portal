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
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../models/User';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  providers: [],
  exports: [
    TypeOrmModule.forFeature([User]),
  ],
})
export class UserModule {}
