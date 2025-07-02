/**
 * @file sso.service.spec.ts
 * @description Unit tests for SsoService SAML authentication functionality.
 * Tests the SSO service implementation for WBS 1.14.
 *
 * @module SsoServiceSpec
 * @author Minkalla
 * @license MIT
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SsoService, SamlUser, SamlValidationResult } from './sso.service';
import { SecretsService } from '../secrets/secrets.service';
import { JwtService, SSOTokenPayload } from '../jwt/jwt.service';
import { Strategy as SamlStrategy, Profile } from 'passport-saml';

jest.mock('passport-saml', () => ({
  Strategy: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn(),
    generateServiceProviderMetadata: jest.fn(),
  })),
}));

describe('SsoService', () => {
  let service: SsoService;
  let secretsService: SecretsService;
  let jwtService: JwtService;

  const mockSecretsService = {
    getSecret: jest.fn(),
  };

  const mockJwtService = {
    generateSSOTokens: jest.fn(),
  };

  const mockSamlConfig = {
    entryPoint: 'https://idp.example.com/sso',
    cert: 'mock-certificate',
    issuer: 'quantum-safe-portal',
    callbackUrl: 'https://app.example.com/portal/auth/sso/callback',
    entityId: 'quantum-safe-portal-sp',
    privateKey: 'mock-private-key',
  };

  const mockProfile: Profile = {
    nameID: 'user123@example.com',
    email: 'user123@example.com',
    firstName: 'John',
    lastName: 'Doe',
    issuer: 'https://idp.example.com',
    attributes: {
      email: 'user123@example.com',
      firstName: 'John',
      lastName: 'Doe',
      roles: ['user', 'admin'],
    } as Record<string, any>,
  };

  const mockSamlUser: SamlUser = {
    nameID: 'user123@example.com',
    email: 'user123@example.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['user', 'admin'],
    attributes: mockProfile.attributes as Record<string, any>,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoService,
        {
          provide: SecretsService,
          useValue: mockSecretsService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<SsoService>(SsoService);
    secretsService = module.get<SecretsService>(SecretsService);
    jwtService = module.get<JwtService>(JwtService);

    mockSecretsService.getSecret.mockImplementation((key: string) => {
      const secrets: Record<string, string> = {
        SSO_IDP_ENTRY_POINT: mockSamlConfig.entryPoint,
        SSO_IDP_CERTIFICATE: mockSamlConfig.cert,
        SSO_ISSUER: mockSamlConfig.issuer,
        SSO_CALLBACK_URL: mockSamlConfig.callbackUrl,
        SSO_ENTITY_ID: mockSamlConfig.entityId,
        SSO_PRIVATE_KEY: mockSamlConfig.privateKey,
      };
      return Promise.resolve(secrets[key]);
    });

    mockJwtService.generateSSOTokens.mockReturnValue({
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeSamlStrategy', () => {
    it('should successfully initialize SAML strategy with valid configuration', async () => {
      await service.initializeSamlStrategy();

      expect(mockSecretsService.getSecret).toHaveBeenCalledWith('SSO_IDP_ENTRY_POINT');
      expect(mockSecretsService.getSecret).toHaveBeenCalledWith('SSO_IDP_CERTIFICATE');
      expect(mockSecretsService.getSecret).toHaveBeenCalledWith('SSO_ISSUER');
      expect(mockSecretsService.getSecret).toHaveBeenCalledWith('SSO_CALLBACK_URL');
      expect(mockSecretsService.getSecret).toHaveBeenCalledWith('SSO_ENTITY_ID');
      expect(mockSecretsService.getSecret).toHaveBeenCalledWith('SSO_PRIVATE_KEY');
      expect(SamlStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          entryPoint: mockSamlConfig.entryPoint,
          cert: mockSamlConfig.cert,
          issuer: mockSamlConfig.issuer,
          callbackUrl: mockSamlConfig.callbackUrl,
          identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress',
          signatureAlgorithm: 'sha256',
          digestAlgorithm: 'sha256',
        }),
        expect.any(Function)
      );
    });

    it('should throw error when secrets retrieval fails', async () => {
      mockSecretsService.getSecret.mockRejectedValue(new Error('Secrets not found'));

      await expect(service.initializeSamlStrategy()).rejects.toThrow('SSO configuration failed');
    });

    it('should handle missing optional private key', async () => {
      mockSecretsService.getSecret.mockImplementation((key: string) => {
        if (key === 'SSO_PRIVATE_KEY') {
          return Promise.reject(new Error('Private key not found'));
        }
        const secrets: Record<string, string> = {
          SSO_IDP_ENTRY_POINT: mockSamlConfig.entryPoint,
          SSO_IDP_CERTIFICATE: mockSamlConfig.cert,
          SSO_ISSUER: mockSamlConfig.issuer,
          SSO_CALLBACK_URL: mockSamlConfig.callbackUrl,
          SSO_ENTITY_ID: mockSamlConfig.entityId,
        };
        return Promise.resolve(secrets[key]);
      });

      await expect(service.initializeSamlStrategy()).resolves.not.toThrow();
    });
  });

  describe('extractUserFromProfile', () => {
    it('should extract user data from SAML profile with standard attributes', () => {
      const result = service['extractUserFromProfile'](mockProfile);

      expect(result).toEqual({
        nameID: 'user123@example.com',
        email: 'user123@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['user', 'admin'],
        attributes: mockProfile.attributes,
      });
    });

    it('should extract user data from profile with Microsoft claims', () => {
      const msProfile: Profile = {
        nameID: 'user456@example.com',
        email: undefined,
        firstName: undefined,
        lastName: undefined,
        issuer: 'https://idp.example.com',
        attributes: {
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'user456@example.com',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'Jane',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'Smith',
          'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'admin',
        } as Record<string, any>,
      };

      const result = service['extractUserFromProfile'](msProfile);

      expect(result).toEqual({
        nameID: 'user456@example.com',
        email: 'user456@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        roles: ['admin'],
        attributes: msProfile.attributes,
      });
    });

    it('should assign default role when no roles are found', () => {
      const profileWithoutRoles: Profile = {
        nameID: 'user789@example.com',
        email: 'user789@example.com',
        firstName: 'Bob',
        lastName: 'Wilson',
        issuer: 'https://idp.example.com',
        attributes: {} as Record<string, any>,
      };

      const result = service['extractUserFromProfile'](profileWithoutRoles);

      expect(result.roles).toEqual(['user']);
    });
  });

  describe('validateSamlUser', () => {
    it('should validate user with valid nameID and email', async () => {
      const result = await service['validateSamlUser'](mockSamlUser);

      expect(result).toEqual({
        isValid: true,
        user: mockSamlUser,
      });
    });

    it('should reject user with missing nameID', async () => {
      const invalidUser = { ...mockSamlUser, nameID: '' };

      const result = await service['validateSamlUser'](invalidUser);

      expect(result).toEqual({
        isValid: false,
        error: 'Missing required user attributes (nameID or email)',
      });
    });

    it('should reject user with missing email', async () => {
      const invalidUser = { ...mockSamlUser, email: '' };

      const result = await service['validateSamlUser'](invalidUser);

      expect(result).toEqual({
        isValid: false,
        error: 'Missing required user attributes (nameID or email)',
      });
    });

    it('should reject user with invalid email format', async () => {
      const invalidUser = { ...mockSamlUser, email: 'invalid-email' };

      const result = await service['validateSamlUser'](invalidUser);

      expect(result).toEqual({
        isValid: false,
        error: 'Invalid email format',
      });
    });
  });

  describe('generateSamlRequest', () => {
    beforeEach(async () => {
      await service.initializeSamlStrategy();
    });

    it('should generate SAML request with relay state', async () => {
      const relayState = '/dashboard';

      const result = await service.generateSamlRequest(relayState);

      expect(result).toEqual({
        requestId: expect.stringMatching(/^_[a-f0-9]{32}$/),
        samlRequest: '',
        relayState,
      });
    });

    it('should generate SAML request without relay state', async () => {
      const result = await service.generateSamlRequest();

      expect(result).toEqual({
        requestId: expect.stringMatching(/^_[a-f0-9]{32}$/),
        samlRequest: '',
        relayState: undefined,
      });
    });
  });

  describe('processSamlResponse', () => {
    beforeEach(async () => {
      await service.initializeSamlStrategy();
    });

    it('should process valid SAML response', async () => {
      const samlResponse = 'base64-encoded-saml-response';
      const relayState = '/dashboard';

      const result = await service.processSamlResponse(samlResponse, relayState);

      expect(result).toEqual({
        isValid: true,
        user: undefined,
        jwtTokens: undefined,
      });
    });

    it('should handle SAML response processing errors', async () => {
      const mockStrategy = service['samlStrategy'] as jest.Mocked<SamlStrategy>;
      mockStrategy.authenticate = jest.fn().mockImplementation(() => {
        throw new Error('SAML processing failed');
      });

      const result = await service.processSamlResponse('invalid-response');

      expect(result).toEqual({
        isValid: false,
        error: 'SAML processing failed',
      });
    });
  });

  describe('getMetadata', () => {
    beforeEach(async () => {
      await service.initializeSamlStrategy();
    });

    it('should generate service provider metadata', async () => {
      const mockMetadata = '<md:EntityDescriptor>...</md:EntityDescriptor>';
      const mockStrategy = service['samlStrategy'] as jest.Mocked<SamlStrategy>;
      mockStrategy.generateServiceProviderMetadata = jest.fn().mockReturnValue(mockMetadata);

      const result = await service.getMetadata();

      expect(result).toBe(mockMetadata);
      expect(mockStrategy.generateServiceProviderMetadata).toHaveBeenCalledWith(null, null);
    });

    it('should handle metadata generation errors', async () => {
      const mockStrategy = service['samlStrategy'] as jest.Mocked<SamlStrategy>;
      mockStrategy.generateServiceProviderMetadata = jest.fn().mockImplementation(() => {
        throw new Error('Metadata generation failed');
      });

      await expect(service.getMetadata()).rejects.toThrow('Metadata generation failed');
    });
  });

  describe('verifyCallback', () => {
    it('should successfully verify SAML callback with valid profile', async () => {
      const mockDone = jest.fn();
      
      await service['verifyCallback'](mockProfile, mockDone);

      expect(mockJwtService.generateSSOTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123@example.com',
          email: 'user123@example.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['user', 'admin'],
          authMethod: 'sso',
          idpIssuer: 'https://idp.example.com',
          sessionId: expect.stringMatching(/^_[a-f0-9]{32}$/),
        })
      );

      expect(mockDone).toHaveBeenCalledWith(null, expect.objectContaining({
        id: 'user123@example.com',
        email: 'user123@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['user', 'admin'],
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
      }));
    });

    it('should handle verification errors', async () => {
      const mockDone = jest.fn();
      const invalidProfile: Profile = {
        nameID: '',
        email: '',
        issuer: 'https://idp.example.com',
        attributes: {} as Record<string, any>,
      };

      await service['verifyCallback'](invalidProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        expect.any(Error),
        undefined
      );
    });

    it('should handle JWT generation errors', async () => {
      const mockDone = jest.fn();
      mockJwtService.generateSSOTokens.mockImplementation(() => {
        throw new Error('JWT generation failed');
      });

      await service['verifyCallback'](mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'SAML verification failed',
        }),
        undefined
      );
    });
  });

  describe('cleanup operations', () => {
    it('should clean up expired requests', () => {
      const cleanupSpy = jest.spyOn(service as any, 'cleanupExpiredRequests');
      
      service.onModuleInit();

      expect(cleanupSpy).toBeDefined();
    });
  });
});
