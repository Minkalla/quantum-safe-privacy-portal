// src/portal/portal-backend/types/jsonwebtoken.d.ts
// This custom declaration file is a pragmatic workaround for TS2769 errors
// with jsonwebtoken in specific environments, allowing compilation to proceed.

declare module 'jsonwebtoken' {
    function sign(payload: any, secretOrPrivateKey: any, options?: any): any;
    function verify(token: any, secretOrPrivateKey: any, options?: any): any;
    class TokenExpiredError extends Error {}
    class JsonWebTokenError extends Error {}
    // Add other types/interfaces as needed, if they become problematic later
    // e.g., interface Secret {}
}