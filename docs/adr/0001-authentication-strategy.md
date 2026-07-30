# ADR 0001: Authentication Strategy

## Context and Problem Statement
The E-Shop Aggregator requires a robust, secure authentication strategy to allow Users (and in the future, internal staff via different roles) to securely interact with the platform. Authentication previously relied on an incomplete and inconsistent token strategy. We needed to standardize our approach to tokens, define security requirements for authentication, and protect endpoints appropriately.

## Decision Drivers
- Need for high security: tokens should not be perpetually valid.
- Minimize state on the backend where possible, but allow revoking access immediately if compromised.
- Protect against refresh token theft and replay attacks.
- Ensure clear boundary between Users and external entities (e.g., Sellers, which are managed separately).

## Considered Options
1. **Stateful Sessions**: Storing session data centrally (e.g., Redis).
2. **Stateless JWTs only**: Standard access tokens with long expiration.
3. **Short-Lived Access Tokens + Rotated Refresh Tokens**: Combining stateless JWTs for performance with stateful, rotating refresh tokens for security.

## Decision Outcome
Chosen option: **Short-Lived Access Tokens + Rotated Refresh Tokens**

### Implementation Details
- **Access Tokens**: Short-lived (15 minutes) JWTs. These are sent in the `Authorization` header as `Bearer <token>`.
- **Refresh Tokens**: Opaque string tokens (UUIDs) mapped in the database (`RefreshToken` table). They are sent strictly via an `HttpOnly`, `SameSite=Lax` cookie (`refreshtoken`).
- **Rotation & Reuse Detection**: Every time a refresh token is used, a new one is issued and the old one is marked as revoked. If a revoked token is ever presented, it triggers "Reuse Detection" which immediately revokes the entire token family (all refresh tokens descended from the original login), forcing the user to re-authenticate.
- **Token Hashing**: Refresh tokens are stored in the database hashed via SHA-256 to protect against database leaks.
- **Unified Identifier**: The system strictly uses `email` for user identification (lowercased). `username` has been completely eliminated to simplify the data model.
- **Passwords**: Hashed with `bcrypt`. Max length enforced at 72 bytes.

## Consequences
- **Positive**: High security posture, resilience against XSS (for refresh tokens), automatic detection of token theft.
- **Negative**: Increased database load (one write per token refresh), complexity in handling token families.

## Validation
- We have introduced end-to-end (E2E) and unit tests to ensure that token rotation and family revocation behave exactly as specified.
