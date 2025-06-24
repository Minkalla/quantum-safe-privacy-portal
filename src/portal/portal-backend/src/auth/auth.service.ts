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

import { Injectable, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IUser } from '../models/User';
import { JwtService } from '../jwt/jwt.service';
import { ObjectId } from 'mongodb'; // ADDED: Import ObjectId type

// Brute-force protection settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 60; // 1 hour

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>,
    private readonly jwtService: JwtService,
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

    // CHANGED: Explicitly cast savedUser._id to ObjectId for .toString() method
    return { userId: (savedUser._id as ObjectId).toString(), email: savedUser.email };
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

    console.log('🔐 AuthService.login - Starting authentication for:', email);
    console.log('🔐 AuthService.login - RememberMe flag:', rememberMe);

    const user = await this.userModel
      .findOne({ email })
      .select('+password +failedLoginAttempts +lockUntil +refreshTokenHash');

    console.log('🔍 AuthService.login - User found:', user ? 'YES' : 'NO');
    if (user) {
      const userObj = user.toObject ? user.toObject() : user;
      console.log('🔍 AuthService.login - User fields present:', Object.keys(userObj));
      console.log('🔍 AuthService.login - Password field exists:', !!user.password);
      console.log('🔍 AuthService.login - FailedLoginAttempts:', user.failedLoginAttempts);
      console.log('🔍 AuthService.login - LockUntil:', user.lockUntil);
    }

    if (!user) {
      console.log('❌ AuthService.login - User not found, throwing UnauthorizedException');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingLockTime = Math.ceil((user.lockUntil.getTime() - new Date().getTime()) / (60 * 1000));
      throw new ForbiddenException(`Account locked. Please try again in ${remainingLockTime} minutes.`);
    }

    console.log('🔐 AuthService.login - Starting password comparison');
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    console.log('🔐 AuthService.login - Password correct:', isPasswordCorrect);

    if (!isPasswordCorrect) {
      console.log('❌ AuthService.login - Password incorrect, updating failed attempts');
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
        console.log('🔒 AuthService.login - Account locked due to failed attempts');
      }
      await user.save();
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('✅ AuthService.login - Password correct, proceeding with login');
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();

    // CHANGED: Explicitly cast user._id to ObjectId for .toString() method
    const tokenPayload = { userId: (user._id as ObjectId).toString(), email: user.email };
    console.log('🎫 AuthService.login - Generating tokens for user:', tokenPayload.userId);

    const { accessToken, refreshToken } = this.jwtService.generateTokens(tokenPayload, rememberMe);
    console.log('🎫 AuthService.login - Tokens generated successfully');

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenHash = hashedRefreshToken;

    console.log('💾 AuthService.login - Saving user with updated login info');
    await user.save();
    console.log('💾 AuthService.login - User saved successfully');

    const response: any = {
      accessToken,
      user: {
        id: (user._id as ObjectId).toString(), // CHANGED: Explicitly cast user._id to ObjectId for .toString() method
        email: user.email,
      },
    };

    if (rememberMe) {
      response.refreshToken = refreshToken;
      console.log('🎫 AuthService.login - Including refreshToken in response (rememberMe=true)');
    } else {
      console.log('🎫 AuthService.login - Not including refreshToken in response (rememberMe=false)');
    }

    console.log('✅ AuthService.login - Login successful, returning response');
    return response;
  }
}
