/**
 * @file jwt-auth.guard.ts
 * @description JWT Authentication Guard for protecting NestJS routes.
 * This guard validates JWT tokens and ensures only authenticated users can access protected endpoints.
 *
 * @module JwtAuthGuard
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Implements CanActivate interface to provide route-level authentication.
 * Integrates with the JwtService for token validation and user context extraction.
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '../jwt/jwt.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = authHeader.substring(7);
    if (!token || token.trim() === '') {
      throw new UnauthorizedException('JWT token is missing');
    }

    try {
      const payload = this.jwtService.verifyToken(token, 'access');
      if (!payload) {
        throw new UnauthorizedException('Invalid or expired JWT token');
      }

      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }
}
