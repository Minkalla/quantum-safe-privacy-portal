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

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '../jwt/jwt.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    this.logger.debug(`JWT Auth Guard - Processing request to: ${request.url}`);
    this.logger.debug(`JWT Auth Guard - Authorization header present: ${!!authHeader}`);

    if (!authHeader) {
      this.logger.error('JWT Auth Guard - Authorization header is missing');
      throw new UnauthorizedException('Authorization header is missing');
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.error(`JWT Auth Guard - Invalid authorization header format: ${authHeader.substring(0, 20)}...`);
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = authHeader.substring(7);
    if (!token || token.trim() === '') {
      this.logger.error('JWT Auth Guard - JWT token is missing after Bearer');
      throw new UnauthorizedException('JWT token is missing');
    }

    this.logger.debug(`JWT Auth Guard - Token extracted, length: ${token.length}, first 20 chars: ${token.substring(0, 20)}...`);

    try {
      this.logger.debug('JWT Auth Guard - Calling jwtService.verifyToken with access type');
      const payload = this.jwtService.verifyToken(token, 'access');
      
      if (!payload) {
        this.logger.error('JWT Auth Guard - verifyToken returned null payload');
        throw new UnauthorizedException('Invalid or expired JWT token');
      }

      this.logger.debug(`JWT Auth Guard - Token verification successful, userId: ${payload.userId}`);
      request.user = payload;
      return true;
    } catch (error) {
      this.logger.error(`JWT Auth Guard - Token verification failed: ${error.message}`);
      this.logger.debug('JWT Auth Guard error stack:', error.stack);
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }
}
