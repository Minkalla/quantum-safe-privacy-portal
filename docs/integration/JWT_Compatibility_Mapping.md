# JWT Compatibility Mapping for NIST PQC Integration
*Token Interoperability Strategy Between QynAuth and Portal Backend Services*

**Document Version**: v1.0  
**Date**: June 25, 2025  
**Status**: Draft  
**Authors**: Integration Team  

## Executive Summary

This document defines the comprehensive JWT token compatibility mapping strategy to ensure seamless token interoperability between QynAuth (FastAPI with PQC signatures) and Portal Backend (NestJS with classical JWT) while maintaining security, performance, and the existing 57/57 E2E test success rate during NIST Post-Quantum Cryptography implementation.

## Current JWT Architecture Analysis

### Portal Backend JWT Implementation
**Location**: `src/portal/portal-backend/src/jwt/jwt.service.ts`
**Current Strategy**: Dual-token approach with AWS Secrets Manager integration

```typescript
export class JwtService {
  private jwtAccessSecret!: string;
  private jwtRefreshSecret!: string;

  async generateTokens(payload: any): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = jwt.sign(payload, this.jwtAccessSecret, {
      expiresIn: '1h',
      algorithm: 'HS256'
    });

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: '7d',
      algorithm: 'HS256'
    });

    return { accessToken, refreshToken };
  }

  async verifyToken(token: string, type: 'access' | 'refresh'): Promise<any> {
    const secret = type === 'access' ? this.jwtAccessSecret : this.jwtRefreshSecret;
    return jwt.verify(token, secret);
  }
}
```

### QynAuth JWT Requirements
- **Algorithm**: PQC-DILITHIUM3 for quantum-safe signatures
- **Fallback**: Classical RS256/HS256 when PQC unavailable
- **Key Management**: Shared secret strategy with Portal Backend
- **Token Format**: Enhanced payload with PQC metadata

## JWT Compatibility Strategy

### Unified Token Structure Design

#### Enhanced JWT Header Format
```json
{
  "alg": "PQC-DILITHIUM3",
  "typ": "JWT",
  "kid": "pqc-key-id-2025",
  "pqc": {
    "enabled": true,
    "version": "1.0",
    "fallback_alg": "HS256"
  }
}
```

#### Classical Fallback Header
```json
{
  "alg": "HS256",
  "typ": "JWT",
  "kid": "classical-key-id",
  "pqc": {
    "enabled": false,
    "fallback_reason": "pqc_unavailable"
  }
}
```

#### Unified Payload Structure
```json
{
  "sub": "user-uuid-v4",
  "email": "user@example.com",
  "iat": 1735110023,
  "exp": 1735113623,
  "iss": "qynauth-service",
  "aud": ["portal-backend", "frontend-app"],
  "scope": ["consent:read", "consent:write", "profile:read"],
  
  "user_metadata": {
    "user_id": "60d5ec49f1a23c001c8a4d7d",
    "email": "user@example.com",
    "pqc_enabled": true,
    "classical_fallback": true,
    "account_status": "active"
  },
  
  "pqc_metadata": {
    "algorithm": "KYBER-768",
    "signature_algorithm": "DILITHIUM-3",
    "key_id": "pqc-key-id-2025",
    "key_generated_at": "2025-06-25T05:20:23Z",
    "key_expires_at": "2025-09-25T05:20:23Z"
  },
  
  "session_metadata": {
    "session_id": "session-uuid-v4",
    "source_service": "qynauth",
    "auth_method": "pqc_password",
    "ip_address": "192.168.1.100",
    "user_agent_hash": "sha256-hash-of-user-agent"
  },
  
  "security_metadata": {
    "mfa_verified": false,
    "risk_score": "low",
    "device_trusted": true,
    "geo_location": "US-CA"
  }
}
```

### Token Validation Strategy

#### QynAuth Token Generation Service
**File**: `qynauth/src/python_app/app/jwt_service.py`

```python
"""
Enhanced JWT service for QynAuth with PQC signature support
Provides both PQC and classical token generation with Portal Backend compatibility
"""
import jwt
import json
import base64
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
import os
import logging

logger = logging.getLogger(__name__)

class QynAuthJWTService:
    def __init__(self):
        self.pqc_enabled = os.getenv('PQC_ENABLED', 'true').lower() == 'true'
        self.jwt_secret = os.getenv('JWT_SECRET_KEY', 'fallback-secret-key')
        self.access_token_expire_minutes = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '60'))
        self.refresh_token_expire_days = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '7'))
        
        # Initialize PQC and classical key pairs
        self.pqc_private_key = None
        self.pqc_public_key = None
        self.classical_private_key = None
        self.classical_public_key = None
        
        self._initialize_keys()

    def _initialize_keys(self):
        """Initialize both PQC and classical key pairs"""
        try:
            if self.pqc_enabled:
                # Initialize PQC keys (Dilithium-3)
                self.pqc_private_key, self.pqc_public_key = self._generate_pqc_keypair()
                logger.info("PQC keys initialized successfully")
            
            # Always initialize classical keys for fallback
            self.classical_private_key, self.classical_public_key = self._generate_classical_keypair()
            logger.info("Classical keys initialized successfully")
            
        except Exception as e:
            logger.error(f"Key initialization failed: {e}")
            self.pqc_enabled = False  # Disable PQC on key failure

    def _generate_pqc_keypair(self) -> Tuple[bytes, bytes]:
        """Generate Dilithium-3 key pair for PQC signatures"""
        # This would integrate with the Rust FFI for actual PQC operations
        # For now, return mock keys for development
        return (
            b"mock-dilithium3-private-key",
            b"mock-dilithium3-public-key"
        )

    def _generate_classical_keypair(self) -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
        """Generate RSA key pair for classical signatures"""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        public_key = private_key.public_key()
        return private_key, public_key

    def generate_tokens(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate access and refresh tokens with PQC or classical signatures"""
        try:
            # Determine token generation strategy
            use_pqc = (
                self.pqc_enabled and 
                user_data.get('pqc_enabled', False) and 
                self.pqc_private_key is not None
            )

            # Generate access token
            access_token = self._generate_access_token(user_data, use_pqc)
            
            # Generate refresh token (always classical for compatibility)
            refresh_token = self._generate_refresh_token(user_data)

            return {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'token_type': 'Bearer',
                'expires_in': self.access_token_expire_minutes * 60,
                'pqc_enabled': use_pqc,
                'algorithm': 'PQC-DILITHIUM3' if use_pqc else 'HS256'
            }

        except Exception as e:
            logger.error(f"Token generation failed: {e}")
            # Fallback to classical token generation
            return self._generate_classical_tokens(user_data)

    def _generate_access_token(self, user_data: Dict[str, Any], use_pqc: bool) -> str:
        """Generate access token with PQC or classical signature"""
        now = datetime.utcnow()
        exp = now + timedelta(minutes=self.access_token_expire_minutes)

        # Build unified payload
        payload = {
            'sub': user_data['user_id'],
            'email': user_data['email'],
            'iat': int(now.timestamp()),
            'exp': int(exp.timestamp()),
            'iss': 'qynauth-service',
            'aud': ['portal-backend', 'frontend-app'],
            'scope': ['consent:read', 'consent:write', 'profile:read'],
            
            'user_metadata': {
                'user_id': user_data['user_id'],
                'email': user_data['email'],
                'pqc_enabled': user_data.get('pqc_enabled', False),
                'classical_fallback': user_data.get('classical_fallback', True),
                'account_status': 'active'
            },
            
            'session_metadata': {
                'session_id': user_data.get('session_id', f"session-{int(now.timestamp())}"),
                'source_service': 'qynauth',
                'auth_method': 'pqc_password' if use_pqc else 'classical_password',
                'ip_address': user_data.get('ip_address', '127.0.0.1'),
                'user_agent_hash': user_data.get('user_agent_hash', 'unknown')
            },
            
            'security_metadata': {
                'mfa_verified': user_data.get('mfa_verified', False),
                'risk_score': user_data.get('risk_score', 'low'),
                'device_trusted': user_data.get('device_trusted', True),
                'geo_location': user_data.get('geo_location', 'unknown')
            }
        }

        if use_pqc:
            # Add PQC metadata
            payload['pqc_metadata'] = {
                'algorithm': 'KYBER-768',
                'signature_algorithm': 'DILITHIUM-3',
                'key_id': user_data.get('pqc_key_id', 'pqc-key-id-2025'),
                'key_generated_at': user_data.get('pqc_key_generated_at', now.isoformat()),
                'key_expires_at': user_data.get('pqc_key_expires_at', (now + timedelta(days=90)).isoformat())
            }

            # Generate PQC signature
            return self._sign_token_pqc(payload)
        else:
            # Generate classical signature
            return jwt.encode(payload, self.jwt_secret, algorithm='HS256')

    def _generate_refresh_token(self, user_data: Dict[str, Any]) -> str:
        """Generate refresh token (always classical for Portal Backend compatibility)"""
        now = datetime.utcnow()
        exp = now + timedelta(days=self.refresh_token_expire_days)

        payload = {
            'sub': user_data['user_id'],
            'email': user_data['email'],
            'iat': int(now.timestamp()),
            'exp': int(exp.timestamp()),
            'iss': 'qynauth-service',
            'aud': ['portal-backend'],
            'type': 'refresh',
            'session_id': user_data.get('session_id', f"session-{int(now.timestamp())}")
        }

        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')

    def _sign_token_pqc(self, payload: Dict[str, Any]) -> str:
        """Sign token using PQC Dilithium-3 algorithm"""
        # Create PQC header
        header = {
            'alg': 'PQC-DILITHIUM3',
            'typ': 'JWT',
            'kid': payload.get('pqc_metadata', {}).get('key_id', 'pqc-key-id-2025'),
            'pqc': {
                'enabled': True,
                'version': '1.0',
                'fallback_alg': 'HS256'
            }
        }

        # Encode header and payload
        header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
        
        # Create signing input
        signing_input = f"{header_b64}.{payload_b64}"
        
        # Generate PQC signature using Rust FFI
        signature = self._generate_pqc_signature(signing_input.encode())
        signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip('=')
        
        return f"{signing_input}.{signature_b64}"

    def _generate_pqc_signature(self, data: bytes) -> bytes:
        """Generate Dilithium-3 signature using Rust FFI"""
        # This would call the Rust library for actual PQC signature
        # For development, return mock signature
        return b"mock-dilithium3-signature-bytes"

    def _generate_classical_tokens(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback classical token generation"""
        now = datetime.utcnow()
        exp = now + timedelta(minutes=self.access_token_expire_minutes)

        payload = {
            'sub': user_data['user_id'],
            'email': user_data['email'],
            'iat': int(now.timestamp()),
            'exp': int(exp.timestamp()),
            'iss': 'qynauth-service',
            'aud': ['portal-backend'],
            'pqc_enabled': False,
            'fallback_reason': 'pqc_unavailable'
        }

        access_token = jwt.encode(payload, self.jwt_secret, algorithm='HS256')
        refresh_token = self._generate_refresh_token(user_data)

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': self.access_token_expire_minutes * 60,
            'pqc_enabled': False,
            'algorithm': 'HS256'
        }

    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify both PQC and classical JWT tokens"""
        try:
            # Detect token type by header
            header_b64 = token.split('.')[0]
            header_padded = header_b64 + '=' * (4 - len(header_b64) % 4)
            header = json.loads(base64.urlsafe_b64decode(header_padded))

            if header.get('alg') == 'PQC-DILITHIUM3':
                return self._verify_pqc_token(token)
            else:
                return self._verify_classical_token(token)

        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise ValueError("Invalid token format")

    def _verify_pqc_token(self, token: str) -> Dict[str, Any]:
        """Verify PQC-signed JWT token"""
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid PQC token format")

        header_b64, payload_b64, signature_b64 = parts
        
        # Decode components
        header = json.loads(base64.urlsafe_b64decode(header_b64 + '=' * (4 - len(header_b64) % 4)))
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + '=' * (4 - len(payload_b64) % 4)))
        signature = base64.urlsafe_b64decode(signature_b64 + '=' * (4 - len(signature_b64) % 4))

        # Verify PQC signature
        signing_input = f"{header_b64}.{payload_b64}"
        if not self._verify_pqc_signature(signing_input.encode(), signature):
            raise ValueError("Invalid PQC signature")

        # Check expiration
        if payload.get('exp', 0) < datetime.utcnow().timestamp():
            raise ValueError("Token expired")

        return payload

    def _verify_classical_token(self, token: str) -> Dict[str, Any]:
        """Verify classical JWT token"""
        return jwt.decode(token, self.jwt_secret, algorithms=['HS256'])

    def _verify_pqc_signature(self, data: bytes, signature: bytes) -> bool:
        """Verify Dilithium-3 signature using Rust FFI"""
        # This would call the Rust library for actual PQC verification
        # For development, return True for mock signatures
        return signature == b"mock-dilithium3-signature-bytes"
```

### Portal Backend JWT Integration

#### Enhanced JWT Service for Portal Backend
**File**: `src/portal/portal-backend/src/jwt/pqc-jwt.service.ts`

```typescript
/**
 * Enhanced JWT service with PQC token support
 * Extends existing Portal Backend JWT service for QynAuth integration
 */
import { Injectable, Logger } from '@nestjs/common';
import { JwtService as BaseJwtService } from './jwt.service';
import { ConfigService } from '../config/config.service';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export interface PQCTokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string[];
  scope: string[];
  
  user_metadata: {
    user_id: string;
    email: string;
    pqc_enabled: boolean;
    classical_fallback: boolean;
    account_status: string;
  };
  
  pqc_metadata?: {
    algorithm: string;
    signature_algorithm: string;
    key_id: string;
    key_generated_at: string;
    key_expires_at: string;
  };
  
  session_metadata: {
    session_id: string;
    source_service: string;
    auth_method: string;
    ip_address: string;
    user_agent_hash: string;
  };
  
  security_metadata: {
    mfa_verified: boolean;
    risk_score: string;
    device_trusted: boolean;
    geo_location: string;
  };
}

@Injectable()
export class PQCJwtService extends BaseJwtService {
  private readonly logger = new Logger(PQCJwtService.name);
  private readonly qynAuthPublicKey: string;
  private readonly pqcEnabled: boolean;

  constructor(configService: ConfigService) {
    super(configService);
    this.qynAuthPublicKey = process.env.QYNAUTH_PUBLIC_KEY || '';
    this.pqcEnabled = process.env.PQC_ENABLED === 'true';
  }

  async verifyQynAuthToken(token: string): Promise<PQCTokenPayload> {
    try {
      // Detect token type
      const header = this.decodeTokenHeader(token);
      
      if (header.alg === 'PQC-DILITHIUM3') {
        return await this.verifyPQCToken(token);
      } else {
        return await this.verifyClassicalToken(token);
      }
    } catch (error) {
      this.logger.error(`QynAuth token verification failed: ${error.message}`);
      throw new Error('Invalid QynAuth token');
    }
  }

  private decodeTokenHeader(token: string): any {
    const headerB64 = token.split('.')[0];
    const headerPadded = headerB64 + '='.repeat(4 - (headerB64.length % 4));
    return JSON.parse(Buffer.from(headerPadded, 'base64url').toString());
  }

  private async verifyPQCToken(token: string): Promise<PQCTokenPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid PQC token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Decode payload
    const payloadPadded = payloadB64 + '='.repeat(4 - (payloadB64.length % 4));
    const payload = JSON.parse(Buffer.from(payloadPadded, 'base64url').toString());

    // Verify token expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    // Verify issuer
    if (payload.iss !== 'qynauth-service') {
      throw new Error('Invalid token issuer');
    }

    // Verify audience
    if (!payload.aud.includes('portal-backend')) {
      throw new Error('Invalid token audience');
    }

    // Verify PQC signature (would integrate with actual PQC verification)
    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64 + '='.repeat(4 - (signatureB64.length % 4)), 'base64url');
    
    if (!await this.verifyPQCSignature(signingInput, signature, payload.pqc_metadata?.key_id)) {
      throw new Error('Invalid PQC signature');
    }

    return payload as PQCTokenPayload;
  }

  private async verifyClassicalToken(token: string): Promise<PQCTokenPayload> {
    // Use shared secret for classical token verification
    const sharedSecret = process.env.QYNAUTH_SHARED_SECRET || this.jwtAccessSecret;
    const payload = jwt.verify(token, sharedSecret) as any;

    // Validate required fields
    if (!payload.sub || !payload.email || !payload.user_metadata) {
      throw new Error('Invalid token payload structure');
    }

    return payload as PQCTokenPayload;
  }

  private async verifyPQCSignature(signingInput: string, signature: Buffer, keyId?: string): Promise<boolean> {
    // This would integrate with actual PQC signature verification
    // For development, implement mock verification
    this.logger.debug(`Verifying PQC signature for key ID: ${keyId}`);
    
    // Mock verification - in production, this would call PQC verification library
    return signature.toString() === 'mock-dilithium3-signature-bytes';
  }

  async generatePortalBackendToken(qynAuthPayload: PQCTokenPayload): Promise<{ accessToken: string; refreshToken: string }> {
    // Convert QynAuth token payload to Portal Backend format
    const portalPayload = {
      sub: qynAuthPayload.user_metadata.user_id,
      email: qynAuthPayload.user_metadata.email,
      pqc_enabled: qynAuthPayload.user_metadata.pqc_enabled,
      session_id: qynAuthPayload.session_metadata.session_id,
      source_service: 'qynauth',
      original_token_type: qynAuthPayload.pqc_metadata ? 'pqc' : 'classical'
    };

    // Generate Portal Backend tokens using existing service
    return await this.generateTokens(portalPayload);
  }

  async validateTokenCompatibility(token: string): Promise<{
    valid: boolean;
    tokenType: 'pqc' | 'classical';
    payload?: PQCTokenPayload;
    errors?: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const payload = await this.verifyQynAuthToken(token);
      const header = this.decodeTokenHeader(token);
      
      // Validate token structure
      if (!payload.user_metadata || !payload.session_metadata) {
        errors.push('Missing required metadata sections');
      }
      
      // Validate PQC-specific fields
      if (header.alg === 'PQC-DILITHIUM3' && !payload.pqc_metadata) {
        errors.push('Missing PQC metadata for PQC token');
      }
      
      // Validate audience compatibility
      if (!payload.aud.includes('portal-backend')) {
        errors.push('Token not intended for Portal Backend');
      }

      return {
        valid: errors.length === 0,
        tokenType: header.alg === 'PQC-DILITHIUM3' ? 'pqc' : 'classical',
        payload: errors.length === 0 ? payload : undefined,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      return {
        valid: false,
        tokenType: 'classical',
        errors: [error.message]
      };
    }
  }
}
```

## Key Management Strategy

### Shared Secret Configuration
**File**: `config/jwt-keys.yml`

```yaml
# JWT key management configuration for QynAuth-Portal Backend integration
jwt_configuration:
  shared_secrets:
    access_token_secret: "${JWT_ACCESS_SECRET_ID}"
    refresh_token_secret: "${JWT_REFRESH_SECRET_ID}"
    qynauth_shared_secret: "${QYNAUTH_SHARED_SECRET}"
  
  pqc_keys:
    dilithium3_public_key: "${PQC_PUBLIC_KEY_PATH}"
    key_rotation_interval_days: 90
    key_backup_location: "${PQC_KEY_BACKUP_PATH}"
  
  token_settings:
    access_token_expire_minutes: 60
    refresh_token_expire_days: 7
    pqc_token_expire_minutes: 60
    classical_fallback_enabled: true
  
  validation_rules:
    require_audience_validation: true
    require_issuer_validation: true
    allow_clock_skew_seconds: 30
    require_pqc_metadata: true
```

### AWS Secrets Manager Integration
**File**: `src/integration/shared-schemas/jwt-secrets.ts`

```typescript
/**
 * Shared JWT secrets management for QynAuth-Portal Backend integration
 */
export interface JWTSecrets {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  qynAuthSharedSecret: string;
  pqcPublicKey?: string;
  pqcPrivateKey?: string;
}

export class JWTSecretsManager {
  private secrets: JWTSecrets | null = null;

  async initializeSecrets(): Promise<void> {
    // Load from AWS Secrets Manager or environment variables
    this.secrets = {
      accessTokenSecret: await this.getSecret('JWT_ACCESS_SECRET_ID'),
      refreshTokenSecret: await this.getSecret('JWT_REFRESH_SECRET_ID'),
      qynAuthSharedSecret: await this.getSecret('QYNAUTH_SHARED_SECRET'),
      pqcPublicKey: await this.getSecret('PQC_PUBLIC_KEY', true),
      pqcPrivateKey: await this.getSecret('PQC_PRIVATE_KEY', true)
    };
  }

  private async getSecret(secretId: string, optional: boolean = false): Promise<string> {
    try {
      // Implementation would use AWS SDK or environment variables
      return process.env[secretId] || '';
    } catch (error) {
      if (!optional) {
        throw new Error(`Failed to load required secret: ${secretId}`);
      }
      return '';
    }
  }

  getSecrets(): JWTSecrets {
    if (!this.secrets) {
      throw new Error('Secrets not initialized');
    }
    return this.secrets;
  }
}
```

## Token Validation Middleware

### Portal Backend Middleware
**File**: `src/portal/portal-backend/src/auth/pqc-auth.guard.ts`

```typescript
/**
 * Enhanced authentication guard supporting both PQC and classical JWT tokens
 */
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PQCJwtService } from '../jwt/pqc-jwt.service';
import { Request } from 'express';

@Injectable()
export class PQCAuthGuard implements CanActivate {
  constructor(private readonly pqcJwtService: PQCJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Validate token compatibility
      const validation = await this.pqcJwtService.validateTokenCompatibility(token);
      
      if (!validation.valid) {
        throw new UnauthorizedException(`Token validation failed: ${validation.errors?.join(', ')}`);
      }

      // Attach user information to request
      request['user'] = validation.payload?.user_metadata;
      request['session'] = validation.payload?.session_metadata;
      request['tokenType'] = validation.tokenType;
      request['pqcEnabled'] = validation.payload?.user_metadata.pqc_enabled || false;

      return true;
    } catch (error) {
      throw new UnauthorizedException(`Authentication failed: ${error.message}`);
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

## Migration and Rollback Procedures

### Token Migration Strategy
**File**: `src/integration/migration-scripts/jwt-migration.ts`

```typescript
/**
 * JWT token migration utilities for PQC integration
 */
export class JWTMigrationService {
  async migrateExistingTokens(): Promise<void> {
    // Phase 1: Dual token support
    await this.enableDualTokenSupport();
    
    // Phase 2: Gradual PQC rollout
    await this.enablePQCForPercentageOfUsers(10); // Start with 10%
    
    // Phase 3: Monitor and scale
    await this.monitorTokenPerformance();
  }

  private async enableDualTokenSupport(): Promise<void> {
    // Update Portal Backend to accept both token types
    // Configure QynAuth to generate appropriate tokens
  }

  private async enablePQCForPercentageOfUsers(percentage: number): Promise<void> {
    // Implement feature flag-based PQC rollout
    // Monitor performance and error rates
  }

  async rollbackToPQC(): Promise<void> {
    // Emergency rollback to classical tokens only
    await this.disablePQCTokenGeneration();
    await this.invalidateExistingPQCTokens();
    await this.notifyServicesOfRollback();
  }
}
```

## Performance Optimization

### Token Caching Strategy
**File**: `src/integration/shared-schemas/token-cache.ts`

```typescript
/**
 * Token caching and performance optimization
 */
export class TokenCacheService {
  private cache = new Map<string, any>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async cacheTokenValidation(token: string, payload: any): Promise<void> {
    const tokenHash = this.hashToken(token);
    this.cache.set(tokenHash, {
      payload,
      timestamp: Date.now()
    });

    // Clean up expired entries
    setTimeout(() => this.cache.delete(tokenHash), this.cacheTimeout);
  }

  async getCachedValidation(token: string): Promise<any | null> {
    const tokenHash = this.hashToken(token);
    const cached = this.cache.get(tokenHash);

    if (!cached || Date.now() - cached.timestamp > this.cacheTimeout) {
      return null;
    }

    return cached.payload;
  }

  private hashToken(token: string): string {
    return require('crypto').createHash('sha256').update(token).digest('hex');
  }
}
```

## Testing Strategy

### JWT Compatibility Tests
**File**: `src/portal/portal-backend/test/jwt/pqc-jwt.spec.ts`

```typescript
describe('PQC JWT Compatibility', () => {
  let pqcJwtService: PQCJwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PQCJwtService, ConfigService]
    }).compile();

    pqcJwtService = module.get<PQCJwtService>(PQCJwtService);
  });

  describe('Token Validation', () => {
    it('should validate PQC tokens correctly', async () => {
      const mockPQCToken = 'eyJhbGciOiJQUUMtRElMSVRISVVNMyIsInR5cCI6IkpXVCJ9...';
      
      const result = await pqcJwtService.validateTokenCompatibility(mockPQCToken);
      
      expect(result.valid).toBe(true);
      expect(result.tokenType).toBe('pqc');
      expect(result.payload?.user_metadata).toBeDefined();
    });

    it('should validate classical tokens correctly', async () => {
      const mockClassicalToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      
      const result = await pqcJwtService.validateTokenCompatibility(mockClassicalToken);
      
      expect(result.valid).toBe(true);
      expect(result.tokenType).toBe('classical');
    });

    it('should handle token validation failures gracefully', async () => {
      const invalidToken = 'invalid.token.here';
      
      const result = await pqcJwtService.validateTokenCompatibility(invalidToken);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Cross-Service Token Exchange', () => {
    it('should convert QynAuth tokens to Portal Backend format', async () => {
      const qynAuthPayload = {
        user_metadata: { user_id: '123', email: 'test@example.com', pqc_enabled: true },
        session_metadata: { session_id: 'session-123' }
      } as any;

      const portalTokens = await pqcJwtService.generatePortalBackendToken(qynAuthPayload);
      
      expect(portalTokens.accessToken).toBeDefined();
      expect(portalTokens.refreshToken).toBeDefined();
    });
  });
});
```

## Security Considerations

### Token Security Measures
- **Signature Validation**: Both PQC and classical signatures properly validated
- **Expiration Enforcement**: Strict token expiration checking
- **Audience Validation**: Tokens validated for intended service
- **Key Rotation**: Regular rotation of PQC and classical keys
- **Secure Storage**: Keys stored in AWS Secrets Manager
- **Audit Logging**: All token operations logged for security monitoring

### Threat Mitigation
- **Token Replay**: Unique session IDs and timestamps prevent replay attacks
- **Man-in-the-Middle**: TLS encryption for all token transmission
- **Key Compromise**: Rapid key rotation and revocation capabilities
- **Quantum Attacks**: PQC algorithms resistant to quantum cryptanalysis
- **Classical Attacks**: Fallback tokens use proven classical algorithms

## Compliance Mappings

### GDPR Compliance
- **Article 25**: Data protection by design in token structure
- **Article 32**: Security of processing through PQC implementation
- **Article 30**: Records of processing in token audit logs

### NIST SP 800-53 Controls
- **IA-5**: Authenticator Management through key rotation
- **SC-8**: Transmission Confidentiality via token encryption
- **AU-12**: Audit Generation for all token operations

### ISO/IEC 27701 Controls
- **7.2.1**: Legal basis identification in token metadata
- **7.3.2**: Data minimization in token payload design
- **7.4.1**: Consent management integration

## Implementation Timeline

### Week 1: Token Structure Design
- Define unified JWT payload structure
- Implement QynAuth token generation service
- Create Portal Backend token validation service

### Week 2: Service Integration
- Implement cross-service token validation
- Create authentication middleware
- Set up key management infrastructure

### Week 3: Testing and Validation
- Comprehensive JWT compatibility testing
- Performance validation and optimization
- Security testing and penetration testing

### Week 4: Deployment and Monitoring
- Production deployment with feature flags
- Monitoring and alerting setup
- Documentation and team training

## Success Criteria

### Technical Success
- [ ] Both PQC and classical tokens validated correctly
- [ ] Cross-service authentication working seamlessly
- [ ] Token performance within acceptable limits
- [ ] Key management and rotation functioning properly

### Security Success
- [ ] No security vulnerabilities in token handling
- [ ] Proper signature validation for both token types
- [ ] Secure key storage and management
- [ ] Comprehensive audit logging implemented

### Operational Success
- [ ] 57/57 E2E tests continue passing
- [ ] No service disruptions during implementation
- [ ] Monitoring and alerting operational
- [ ] Team trained and confident with new system

## Conclusion

This JWT compatibility mapping provides a comprehensive strategy for seamless token interoperability between QynAuth and Portal Backend services during NIST PQC implementation. The unified token structure, robust validation mechanisms, and comprehensive security measures ensure successful integration while maintaining existing functionality and security standards.

**Next Steps**:
1. Review and approve JWT compatibility strategy
2. Implement token generation and validation services
3. Set up key management infrastructure
4. Execute comprehensive testing plan
5. Deploy with monitoring and rollback capabilities

---

**Document Status**: Ready for Review  
**Approval Required**: Security Team, Backend Team, DevOps Team  
**Implementation Timeline**: Weeks 2-3 of WBS execution plan
