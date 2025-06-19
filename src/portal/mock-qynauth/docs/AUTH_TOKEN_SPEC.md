QynAuth MVP AuthToken Specification
This document provides a basic overview of the authentication token (AuthToken) specification used in the Minkalla QynAuth MVP. This is a simplified specification based on JSON Web Tokens (JWT) for initial functionality. A full, RFC-style specification will be developed in a post-MVP phase.

1. Token Type: JSON Web Token (JWT)
The QynAuth MVP uses JSON Web Tokens (JWTs) as its primary authentication token format. JWTs are compact, URL-safe means of representing claims to be transferred between two parties.

2. Token Structure
A JWT consists of three parts, separated by dots (.):

Header: Contains metadata about the token itself, such as the type of token (JWT) and the signing algorithm used (e.g., HS256).

Payload: Contains the "claims" or statements about an entity (typically the user) and additional data.

Signature: Used to verify the integrity of the token and that it hasn't been tampered with. It is created by taking the encoded header, the encoded payload, a secret, and the algorithm specified in the header.

Example Structure:

<BASE64_ENCODED_HEADER>.<BASE64_ENCODED_PAYLOAD>.<BASE64_ENCODED_SIGNATURE>

3. Claims (Payload)
For the QynAuth MVP, the JWT payload contains the following essential claims:

Claim

Type

Description

Example Value

sub

String

Subject: Identifies the principal (user) that is the subject of the JWT. In QynAuth, this is the unique user_id generated during registration. This is a standard JWT registered claim.

cf6a8d7e-12b3-4c5d-8e9f-0123456789ab

exp

Integer

Expiration Time: Identifies the expiration time on or after which the JWT MUST NOT be accepted for processing. The value is a JSON numeric value representing the number of seconds from 1970-01-01T00:00:00Z UTC until the expiration date/time.

1678886400 (e.g., March 15, 2023)

iat

Integer

Issued At: Identifies the time at which the JWT was issued. The value is a JSON numeric value representing the number of seconds from 1970-01-01T00:00:00Z UTC until the issuance date/time.

1678884600

Example Decoded Payload:

{
  "sub": "cf6a8d7e-12b3-4c5d-8e9f-0123456789ab",
  "exp": 1678886400,
  "iat": 1678884600
}

4. Signing Algorithm
The QynAuth MVP uses HMAC SHA256 (HS256) for signing tokens. This algorithm uses a shared secret key to create the signature.

5. Token Usage
The generated access_token should be included in the Authorization header of subsequent API requests to protected QynAuth endpoints, using the Bearer scheme.

Example Authorization Header:

Authorization: Bearer <YOUR_ACCESS_TOKEN>

This specification is for MVP purposes only. A more comprehensive AuthToken specification will be developed to address advanced features, quantum-resistance considerations, and enterprise-grade requirements in post-MVP phases.