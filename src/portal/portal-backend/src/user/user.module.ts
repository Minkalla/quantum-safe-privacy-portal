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
import { UserSchema } from '../models/User'; // Only import UserSchema

@Module({
  imports: [
    // Register the User schema with MongooseModule for this module's context
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // Use string 'User' for model name
  ],
  providers: [],
  exports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // Export MongooseModule.forFeature to make User model available to other modules
  ],
})
export class UserModule {}