// src/portal/portal-backend/src/auth/auth.service.ts
/**
 * @file auth.service.ts
 * @description NestJS service for handling authentication business logic.
 * This service encapsulates user registration, login, password hashing,
 * and token generation, ensuring a clean separation of concerns.
 *
 * @module AuthService
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Adheres to "no regrets" quality by centralizing core authentication logic,
 * integrating with the User model and JwtService. It implements brute-force
 * protection and secure password management.
 */

import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IUser } from '../models/User';
import { JwtService } from '../jwt/jwt.service';
import { PQCFeatureFlagsService } from '../pqc/pqc-feature-flags.service';
import { ObjectId } from 'mongodb';

// Brute-force protection settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 60; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>,
    private readonly jwtService: JwtService,
    private readonly pqcFeatureFlags: PQCFeatureFlagsService,
  ) {}

  /**
   * Registers a new user.
   * @param registerDto Data for user registration (email, password).
   * @returns Newly created user's ID and email.
   * @throws ConflictException if email already registered.
   */
  async register(registerDto: RegisterDto): Promise<{ userId: string; email: string }> {
    const { email, password } = registerDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      email,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();
    const userId = (savedUser._id as ObjectId).toString();

    const usePQC = this.pqcFeatureFlags.isEnabled('pqc_user_registration', userId);
    if (usePQC) {
      await this.generatePQCKeys(userId);
    }

    return { userId, email: savedUser.email };
  }

  private async generatePQCKeys(userId: string): Promise<void> {
    try {
      const pqcPublicKey = this.generatePlaceholderKey('kyber768_public', userId);
      const pqcSigningKey = this.generatePlaceholderKey('dilithium3_private', userId);
      
      await this.userModel.findByIdAndUpdate(userId, {
        pqcPublicKey,
        pqcSigningKey,
        pqcKeyGeneratedAt: new Date(),
        usePQC: true,
      });

      this.logger.log(`PQC keys generated and stored for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to generate PQC keys for user ${userId}:`, error);
      throw error;
    }
  }

  private generatePlaceholderKey(keyType: string, userId: string): string {
    const timestamp = Date.now();
    const hash = require('crypto').createHash('sha256').update(`${keyType}_${userId}_${timestamp}`).digest('hex');
    return `${keyType}_${hash.substring(0, 32)}`;
  }

  /**
   * Authenticates a user and generates JWT tokens.
   * @param loginDto Data for user login (email, password, rememberMe).
   * @returns Access token, refresh token, and user details.
   * @throws UnauthorizedException for invalid credentials.
   * @throws ForbiddenException if account is locked.
   */
  async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken?: string; user: { id: string; email: string } }> {
    const { email, password, rememberMe } = loginDto;

    const user = await this.userModel
      .findOne({ email })
      .select('+password +failedLoginAttempts +lockUntil +refreshTokenHash');

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingLockTime = Math.ceil((user.lockUntil.getTime() - new Date().getTime()) / (60 * 1000));
      throw new ForbiddenException(`Account locked. Please try again in ${remainingLockTime} minutes.`);
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      throw new UnauthorizedException('Invalid credentials');
    }
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();

    // CHANGED: Explicitly cast user._id to ObjectId for .toString() method
    const tokenPayload = { userId: (user._id as ObjectId).toString(), email: user.email };

    const { accessToken, refreshToken } = this.jwtService.generateTokens(tokenPayload, rememberMe);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenHash = hashedRefreshToken;

    await user.save();

    const response: any = {
      accessToken,
      user: {
        id: (user._id as ObjectId).toString(), // CHANGED: Explicitly cast user._id to ObjectId for .toString() method
        email: user.email,
      },
    };

    if (rememberMe) {
      response.refreshToken = refreshToken;
    }

    return response;
  }
}
