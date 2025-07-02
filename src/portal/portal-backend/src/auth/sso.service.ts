import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Strategy as SamlStrategy, Profile, VerifyWithoutRequest, VerifiedCallback } from 'passport-saml';
import { SecretsService } from '../secrets/secrets.service';
import { JwtService, SSOTokenPayload } from '../jwt/jwt.service';
import { randomBytes } from 'crypto';

export interface SamlConfig {
  entryPoint: string;
  cert: string;
  issuer: string;
  callbackUrl: string;
  entityId: string;
  privateKey?: string | null;
  signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
  digestAlgorithm?: string;
}

export interface SamlUser {
  nameID: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  attributes?: Record<string, any>;
}

export interface SamlValidationResult {
  isValid: boolean;
  user?: SamlUser;
  error?: string;
  jwtTokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);
  private samlStrategy: SamlStrategy;
  private pendingRequests = new Map<string, { timestamp: number; relayState?: string }>();
  private readonly REQUEST_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly secretsService: SecretsService,
    private readonly jwtService: JwtService,
  ) {}

  async initializeSamlStrategy(): Promise<void> {
    try {
      const config = await this.getSamlConfig();

      this.samlStrategy = new SamlStrategy(
        {
          entryPoint: config.entryPoint,
          cert: config.cert,
          issuer: config.issuer,
          callbackUrl: config.callbackUrl,
          identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress',
          signatureAlgorithm: (config.signatureAlgorithm as 'sha1' | 'sha256' | 'sha512') || 'sha256',
          digestAlgorithm: config.digestAlgorithm || 'sha256',
          privateKey: config.privateKey || undefined,
          decryptionPvk: config.privateKey || undefined,
          validateInResponseTo: false,
          requestIdExpirationPeriodMs: this.REQUEST_TIMEOUT,
        },
        this.verifyCallback.bind(this),
      );

      this.logger.log('SAML strategy initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SAML strategy', error);
      throw new Error('SSO configuration failed');
    }
  }

  private async getSamlConfig(): Promise<SamlConfig> {
    try {
      const [entryPoint, cert, issuer, callbackUrl, entityId, privateKey] = await Promise.all([
        this.secretsService.getSecret('SSO_IDP_ENTRY_POINT'),
        this.secretsService.getSecret('SSO_IDP_CERTIFICATE'),
        this.secretsService.getSecret('SSO_ISSUER'),
        this.secretsService.getSecret('SSO_CALLBACK_URL'),
        this.secretsService.getSecret('SSO_ENTITY_ID'),
        this.secretsService.getSecret('SSO_PRIVATE_KEY').catch(() => null), // Optional
      ]);

      return {
        entryPoint,
        cert,
        issuer,
        callbackUrl,
        entityId,
        privateKey: privateKey || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve SAML configuration from secrets', error);
      throw new Error('SSO configuration retrieval failed');
    }
  }

  private async verifyCallback(
    profile: Profile,
    done: VerifiedCallback,
  ): Promise<void> {
    try {
      this.logger.debug('SAML verification callback triggered', {
        nameID: profile.nameID,
        issuer: profile.issuer,
      });

      const user = this.extractUserFromProfile(profile);
      const validationResult = await this.validateSamlUser(user);

      if (!validationResult.isValid) {
        return done(new Error(validationResult.error), undefined);
      }

      const ssoTokenPayload: SSOTokenPayload = {
        userId: user.nameID,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        authMethod: 'sso',
        idpIssuer: profile.issuer,
        sessionId: this.generateRequestId(),
      };

      const tokens = this.jwtService.generateSSOTokens(ssoTokenPayload);

      const userRecord = {
        id: user.nameID,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };

      return done(null, userRecord);
    } catch (error) {
      this.logger.error('SAML verification failed', error);
      return done(new Error('SAML verification failed'), undefined);
    }
  }

  private extractUserFromProfile(profile: Profile): SamlUser {
    const attributes = (profile.attributes as Record<string, any>) || {};

    return {
      nameID: profile.nameID || '',
      email: profile.email || attributes.email || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '',
      firstName: profile.firstName || attributes.firstName || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
      lastName: profile.lastName || attributes.lastName || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'],
      roles: this.extractRoles(attributes),
      attributes,
    };
  }

  private extractRoles(attributes: Record<string, any>): string[] {
    const roleFields = [
      'roles',
      'role',
      'groups',
      'group',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
      'http://schemas.xmlsoap.org/claims/Group',
    ];

    for (const field of roleFields) {
      if (attributes[field]) {
        const roles = Array.isArray(attributes[field])
          ? attributes[field]
          : [attributes[field]];
        return roles.map((role: any) => String(role).toLowerCase());
      }
    }

    return ['user']; // Default role
  }

  private async validateSamlUser(user: SamlUser): Promise<SamlValidationResult> {
    if (!user.nameID || !user.email) {
      return {
        isValid: false,
        error: 'Missing required user attributes (nameID or email)',
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      return {
        isValid: false,
        error: 'Invalid email format',
      };
    }

    return { isValid: true, user };
  }

  async generateSamlRequest(relayState?: string): Promise<{ requestId: string; samlRequest: string; relayState?: string }> {
    if (!this.samlStrategy) {
      await this.initializeSamlStrategy();
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();

      this.pendingRequests.set(requestId, {
        timestamp: Date.now(),
        relayState,
      });

      try {
        const mockReq = {
          query: { RelayState: relayState },
          body: {},
          method: 'GET',
        } as any;

        this.samlStrategy.authenticate(mockReq, {});

        resolve({
          requestId,
          samlRequest: '', // This will be populated by the strategy redirect
          relayState,
        });
      } catch (error) {
        reject(new Error('Failed to generate SAML request'));
      }
    });
  }

  async processSamlResponse(samlResponse: string, relayState?: string): Promise<SamlValidationResult> {
    if (!this.samlStrategy) {
      await this.initializeSamlStrategy();
    }

    return new Promise((resolve, reject) => {
      const req = {
        body: { SAMLResponse: samlResponse, RelayState: relayState },
        method: 'POST',
        url: '/portal/auth/sso/callback',
      };

      try {
        this.samlStrategy.authenticate(req as any, {});

        resolve({
          isValid: true,
          user: undefined,
          jwtTokens: undefined,
        });
      } catch (error) {
        this.logger.error('SAML response processing failed', error);
        resolve({
          isValid: false,
          error: error.message || 'SAML response processing failed',
        });
      }
    });
  }

  private generateRequestId(): string {
    return `_${randomBytes(16).toString('hex')}`;
  }

  async getMetadata(): Promise<string> {
    if (!this.samlStrategy) {
      await this.initializeSamlStrategy();
    }

    return new Promise((resolve, reject) => {
      try {
        const metadata = this.samlStrategy.generateServiceProviderMetadata(
          null, // No decryption cert
          null,  // No signing cert
        );
        resolve(metadata);
      } catch (error) {
        this.logger.error('Failed to generate SP metadata', error);
        reject(new Error('Metadata generation failed'));
      }
    });
  }

  private cleanupExpiredRequests(): void {
    const now = Date.now();
    const entries = Array.from(this.pendingRequests.entries());
    for (const [requestId, request] of entries) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        this.pendingRequests.delete(requestId);
      }
    }
  }

  onModuleInit(): void {
    setInterval(() => this.cleanupExpiredRequests(), 5 * 60 * 1000); // Every 5 minutes
  }
}
