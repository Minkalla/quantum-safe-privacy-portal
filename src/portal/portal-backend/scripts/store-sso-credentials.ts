#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SecretsService } from '../src/secrets/secrets.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('SSO-Credentials-Setup');

interface SSOCredentials {
  SSO_IDP_ENTRY_POINT: string;
  SSO_IDP_CERTIFICATE: string;
  SSO_ISSUER: string;
  SSO_CALLBACK_URL: string;
  SSO_ENTITY_ID: string;
  SSO_PRIVATE_KEY?: string;
}

const DEFAULT_SSO_CREDENTIALS: SSOCredentials = {
  SSO_IDP_ENTRY_POINT: 'https://dev-sandbox.okta.com/app/quantum-safe-portal/sso/saml',
  SSO_IDP_CERTIFICATE: `-----BEGIN CERTIFICATE-----
MIICmTCCAYECBgGKqL5wVDANBgkqhkiG9w0BAQsFADAQMQ4wDAYDVQQDDAVkdW1t
eTAeFw0yNDEyMzEwMDAwMDBaFw0zNDEyMzEwMDAwMDBaMBAxDjAMBgNVBAMMBWR1
bW15MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyJdGxepuzmlNiO4D
aY4auAVhAIM1NiHSxgHozjMY4rF2LjFXVm4Bt0HR2hQlY5sSBdxoap+nYfYMUqM5
+ibvyNinqzD8+7AlvCZAs7hUW4LaLv5r6PS0LPiuHiIEBrKMonD07l5gVkMFMTlM
EQGm6Ry2SSDT2ch4HpVhzlUQrABHNcWHAEFRxuRSn+zPjFtmAlQ/9B+txJuBVNdS
aFWqeQDnfFrE6T1LY8aADVMqZ5tjBJopisi+1SLQsNWuP5Q6sBBr6qfVxeXfj1QY
nCqOtX+xkDNcV+HlAcC+EMuOpHRJjn+Eun+zOVBoBNrxqVb3W9NlmHpG7NoGt/hR
nwIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQBvmiGbqkVVQYw5MuNiPzpMRyLs+l5Y
-----END CERTIFICATE-----`,
  SSO_ISSUER: 'http://www.okta.com/quantum-safe-portal',
  SSO_CALLBACK_URL: 'http://localhost:8080/portal/auth/sso/callback',
  SSO_ENTITY_ID: 'quantum-safe-portal-sp',
  SSO_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----
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
-----END PRIVATE KEY-----`
};

async function storeSSOCredentials() {
  try {
    logger.log('Initializing NestJS application for SSO credential storage...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const secretsService = app.get(SecretsService);

    logger.log('Storing SSO credentials in AWS Secrets Manager...');

    const credentials = process.env.NODE_ENV === 'production' 
      ? await getProductionCredentials()
      : DEFAULT_SSO_CREDENTIALS;

    for (const [secretId, secretValue] of Object.entries(credentials)) {
      if (secretValue) {
        logger.log(`Storing secret: ${secretId}`);
        await secretsService.storeSecret(secretId, secretValue);
        logger.log(`✅ Successfully stored: ${secretId}`);
      } else {
        logger.warn(`⚠️  Skipping empty secret: ${secretId}`);
      }
    }

    logger.log('🎉 All SSO credentials stored successfully!');
    await app.close();
  } catch (error) {
    logger.error('❌ Failed to store SSO credentials:', error);
    process.exit(1);
  }
}

async function getProductionCredentials(): Promise<SSOCredentials> {
  logger.log('Production environment detected. Please provide real IdP credentials.');
  
  return {
    SSO_IDP_ENTRY_POINT: process.env.SSO_IDP_ENTRY_POINT || '',
    SSO_IDP_CERTIFICATE: process.env.SSO_IDP_CERTIFICATE || '',
    SSO_ISSUER: process.env.SSO_ISSUER || '',
    SSO_CALLBACK_URL: process.env.SSO_CALLBACK_URL || 'https://portal.quantum-safe.com/portal/auth/sso/callback',
    SSO_ENTITY_ID: process.env.SSO_ENTITY_ID || 'quantum-safe-portal-sp',
    SSO_PRIVATE_KEY: process.env.SSO_PRIVATE_KEY || undefined,
  };
}

if (require.main === module) {
  storeSSOCredentials();
}

export { storeSSOCredentials, DEFAULT_SSO_CREDENTIALS };
