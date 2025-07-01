/**
 * @file auth.middleware.spec.ts
 * @description Unit tests for AuthMiddleware JWT validation.
 * Tests the middleware implementation for WBS 1.12 protected routes.
 *
 * @module AuthMiddlewareSpec
 * @author Minkalla
 * @license MIT
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { AuthMiddleware } from './auth.middleware';
import { JwtService } from '../jwt/jwt.service';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;
  let jwtService: JwtService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  const mockJwtService = {
    verifyToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthMiddleware,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    middleware = module.get<AuthMiddleware>(AuthMiddleware);
    jwtService = module.get<JwtService>(JwtService);

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should call next() with valid JWT token', () => {
      const payload = { userId: 'user123', email: 'test@example.com' };
      mockRequest.headers = {
        authorization: 'Bearer valid.jwt.token',
      };
      mockJwtService.verifyToken.mockReturnValue(payload);

      middleware.use(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockJwtService.verifyToken).toHaveBeenCalledWith('valid.jwt.token', 'access');
      expect((mockRequest as any).user).toEqual({
        userId: 'user123',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is missing', () => {
      mockRequest.headers = {};

      middleware.use(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        message: 'Authorization header is missing',
        error: 'Unauthorized',
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header format is invalid', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      middleware.use(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        message: 'Invalid authorization header format',
        error: 'Unauthorized',
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is missing', () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      middleware.use(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        message: 'JWT token is missing',
        error: 'Unauthorized',
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.jwt.token',
      };
      mockJwtService.verifyToken.mockReturnValue(null);

      middleware.use(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockJwtService.verifyToken).toHaveBeenCalledWith('invalid.jwt.token', 'access');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        message: 'Invalid or expired JWT token',
        error: 'Unauthorized',
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT verification throws error', () => {
      mockRequest.headers = {
        authorization: 'Bearer malformed.jwt.token',
      };
      mockJwtService.verifyToken.mockImplementation(() => {
        throw new Error('Token verification failed');
      });

      middleware.use(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        message: 'Invalid or expired JWT token',
        error: 'Unauthorized',
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
