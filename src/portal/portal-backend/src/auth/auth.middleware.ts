/**
 * @file auth.middleware.ts
 * @description NestJS middleware for JWT authentication.
 * This middleware validates JWT tokens from Authorization header and ensures
 * only authenticated users can access protected endpoints.
 *
 * @module AuthMiddleware
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Implements NestJS middleware interface to provide route-level authentication.
 * Integrates with the JwtService for token validation and user context extraction.
 * Returns 401 Unauthorized with JSON error response for invalid tokens.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../jwt/jwt.service';
import { DeviceService } from './device.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
  deviceFingerprint?: string;
  deviceTrusted?: boolean;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly deviceService: DeviceService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return this.sendUnauthorizedResponse(res, 'Authorization header is missing');
    }

    if (!authHeader.startsWith('Bearer ')) {
      return this.sendUnauthorizedResponse(res, 'Invalid authorization header format');
    }

    const token = authHeader.substring(7);
    if (!token || token.trim() === '') {
      return this.sendUnauthorizedResponse(res, 'JWT token is missing');
    }

    try {
      const payload = this.jwtService.verifyToken(token, 'access');
      if (!payload) {
        return this.sendUnauthorizedResponse(res, 'Invalid or expired JWT token');
      }

      req.user = {
        userId: payload.userId,
        email: payload.email,
      };

      const deviceFingerprint = req.headers['x-device-fingerprint'] as string;
      req.deviceFingerprint = deviceFingerprint;

      if (deviceFingerprint && this.requiresDeviceTrust(req.path)) {
        const { trusted } = await this.deviceService.validateDeviceTrust(
          payload.userId,
          deviceFingerprint,
        );

        req.deviceTrusted = trusted;

        if (!trusted && this.isSensitiveOperation(req.path)) {
          return this.sendUnauthorizedResponse(res, 'Device not trusted for this operation');
        }
      }

      next();
    } catch (error) {
      return this.sendUnauthorizedResponse(res, 'Invalid or expired JWT token');
    }
  }

  private requiresDeviceTrust(path: string): boolean {
    const deviceTrustPaths = [
      '/portal/auth/device',
      '/portal/pqc',
      '/portal/user/profile',
    ];
    return deviceTrustPaths.some(trustPath => path.startsWith(trustPath));
  }

  private isSensitiveOperation(path: string): boolean {
    const sensitivePaths = [
      '/portal/pqc/generate-keys',
      '/portal/user/profile/update',
      '/portal/auth/device/register',
    ];
    return sensitivePaths.some(sensitivePath => path.startsWith(sensitivePath));
  }

  private sendUnauthorizedResponse(res: Response, message: string): void {
    res.status(401).json({
      statusCode: 401,
      message,
      error: 'Unauthorized',
      timestamp: new Date().toISOString(),
    });
  }
}
