// src/portal/portal-backend/types/jsonwebtoken.d.ts
// This custom declaration file overrides problematic type definitions for jsonwebtoken,
// resolving TS2769 errors and ensuring compatibility with strict TypeScript environments.

declare module "jsonwebtoken" {
  export type Secret = string | Buffer | { key: string | Buffer; passphrase?: string };

  export interface JwtPayload {
    [key: string]: any;
  }

  export interface SignOptions {
    expiresIn?: string | number;
    algorithm?: Algorithm;
    audience?: string | string[];
    issuer?: string;
    subject?: string;
    jwtid?: string;
    noTimestamp?: boolean;
    header?: object;
  }

  export interface VerifyOptions {
    algorithms?: Algorithm[];
    audience?: string | string[];
    issuer?: string | string[];
    subject?: string;
    maxAge?: string | number;
    clockTolerance?: number;
  }

  export type Algorithm =
    | "HS256" | "HS384" | "HS512"
    | "RS256" | "RS384" | "RS512"
    | "ES256" | "ES384" | "ES512"
    | "PS256" | "PS384" | "PS512"
    | "none";

  function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: Secret,
    options?: SignOptions
  ): string;

  function verify(
    token: string,
    secretOrPublicKey: Secret,
    options?: VerifyOptions
  ): string | JwtPayload;

  function decode(
    token: string,
    options?: { complete?: boolean; json?: boolean }
  ): null | { [key: string]: any } | string;

  class TokenExpiredError extends Error {}
  class JsonWebTokenError extends Error {}
}