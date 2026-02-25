# Codebase Concerns

**Analysis Date:** 2026-02-25

## Tech Debt

**Incomplete JWT Authentication Implementation:**
- Issue: Auth middleware uses simple Base64 encoding of userId instead of proper JWT tokens
- Files: `apps/api/src/middleware/auth.middleware.ts` (lines 20-26), `apps/api/src/routes/auth.route.ts`
- Impact: No token expiration, no signature validation, security vulnerability - tokens can be forged by any client. Login response doesn't return tokens as specified in type definitions (`LoginResponse` expects `accessToken` and `refreshToken`)
- Fix approach: Implement proper JWT library (jsonwebtoken), sign tokens with secret key, verify tokens in middleware, add token expiration, return tokens from login endpoint, implement refresh token mechanism

**Missing Email Service Integration:**
- Issue: Email verification and password reset emails are not being sent despite token generation
- Files: `apps/api/src/services/auth.service.ts` (lines 73, 89)
- Impact: Users cannot verify email addresses or reset passwords; password reset tokens only logged to console
- Fix approach: Integrate email service (SendGrid, AWS SES, etc.), create email templates, implement async email sending, add retry logic for failed sends

**Missing Organization Routes:**
- Issue: Organization module is defined in schemas but no routes, repositories, or services exist
- Files: Schema defined in `packages/shared/src/schemas/organization.ts`, but no implementation in `apps/api/src/routes/`, `apps/api/src/repositories/`, `apps/api/src/services/`, `apps/api/src/usecases/`
- Impact: Multi-tenant functionality completely missing; users cannot create or manage organizations
- Fix approach: Create organization repository with Firestore queries, implement organization service layer, add CRUD routes for organizations and members, implement invitation token system, add authorization checks

**Missing Stripe Payment Integration:**
- Issue: Subscription schema defines payment flows but no Stripe integration exists
- Files: Schema defined in `packages/shared/src/schemas/subscription.ts`, no service or route implementation
- Impact: Cannot process payments or manage subscription plans; no way to create checkout sessions or handle webhooks
- Fix approach: Install Stripe SDK, create subscription service, implement checkout endpoint, add webhook handler for payment events, implement plan change logic, add price management

## Known Bugs

**Password Plaintext Exposed in Create User Endpoint:**
- Symptoms: Plain password is passed through creation flow alongside hashed password
- Files: `apps/api/src/usecases/user/create-user.usecase.ts` (line 28), `apps/api/src/repositories/user.repository.ts` (line 92)
- Trigger: Creating user through POST /users endpoint
- Issue: `input.password` is spread into user object then discarded; this is inefficient but not a direct leak
- Workaround: Password is bcrypt hashed before storage but sensitive field should be explicitly omitted

**Login Response Mismatch:**
- Symptoms: Login endpoint returns user object only, not tokens specified in `LoginResponse` interface
- Files: `apps/api/src/routes/auth.route.ts` (lines 32-35), `apps/api/src/services/auth.service.ts` (lines 40-48)
- Trigger: POST /auth/login
- Impact: Client cannot authenticate subsequent requests; frontend must work around missing tokens
- Workaround: Currently using Base64 userId as token in middleware

**User Route Missing Authentication:**
- Symptoms: All user endpoints (GET /users, POST /users) are unprotected
- Files: `apps/api/src/routes/user.route.ts`
- Trigger: Any client can list all users or create users
- Impact: No authorization; endpoints allow unauthorized access
- Workaround: None currently implemented

## Security Considerations

**JWT Secret Management:**
- Risk: No JWT secret key defined or configuration for signing tokens
- Files: `apps/api/src/middleware/auth.middleware.ts`
- Current mitigation: None - currently not using JWT at all
- Recommendations: Store JWT secret in Firebase environment variables or Google Cloud Secret Manager, rotate secrets regularly, never commit secrets to git

**Password Reset Token Exposed in Logs:**
- Risk: Password reset token printed to console in production
- Files: `apps/api/src/services/auth.service.ts` (line 90)
- Current mitigation: Only in console.log, not stored elsewhere
- Recommendations: Remove console.log before production deploy, use structured logging, never log sensitive tokens

**CORS Configuration Too Restrictive:**
- Risk: CORS only allows localhost:3000, will fail in production
- Files: `apps/api/src/index.ts` (lines 14-20)
- Current mitigation: None
- Recommendations: Configure CORS based on environment variable, support multiple origins for staging/prod, validate origin header

**SQL Injection / Firestore Query Injection:**
- Risk: User input in list users cursor parameter not validated
- Files: `apps/api/src/routes/user.route.ts` (line 16), `apps/api/src/repositories/user.repository.ts` (lines 69-74)
- Current mitigation: Firestore uses parameter binding (safe), but cursor could be any string
- Recommendations: Validate cursor format (should be valid Firestore document ID), add cursor validation schema

**Password Requirements Not Enforced:**
- Risk: No minimum length, complexity, or format validation on password input
- Files: `packages/shared/src/schemas/auth.ts`, `apps/api/src/services/auth.service.ts`
- Current mitigation: None
- Recommendations: Add Zod validation for minimum 8 chars, require uppercase/lowercase/number/special char, validate in both registration and password change

**Missing Rate Limiting:**
- Risk: No protection against brute force attacks on login/registration/password reset
- Files: `apps/api/src/routes/auth.route.ts`
- Current mitigation: None
- Recommendations: Add rate limiting middleware (e.g., HONO rate limiter), limit login attempts per IP, implement exponential backoff for reset endpoints

**Unverified Email Access:**
- Risk: Users with unverified emails can still login and access protected endpoints
- Files: `apps/api/src/services/auth.service.ts` (lines 29-35)
- Current mitigation: Status checks exist but login still succeeds for pending users
- Recommendations: Enforce email verification before full access, return 403 for unverified emails, allow read-only access if needed

## Performance Bottlenecks

**Firestore Cursor Pagination Inefficient:**
- Problem: Cursor pagination fetches limit+1 documents on every request to check hasMore
- Files: `apps/api/src/repositories/user.repository.ts` (lines 65-86)
- Cause: startAfter() requires document reference, forces extra document fetch
- Improvement path: Implement keyset pagination or offset-based with total count, cache hot cursor values, consider offset pagination for small result sets

**No Database Indexing Strategy:**
- Problem: Query by email runs without indexes; will slow down as user base grows
- Files: `apps/api/src/repositories/user.repository.ts` (lines 37-63)
- Cause: Firestore queries may auto-index small collections but explicit indexes needed for scale
- Improvement path: Create Firestore composite index on (email, status), add index for (createdAt, status) pagination, document required indexes in README

**Token Cleanup Not Implemented:**
- Problem: Expired tokens accumulate in Firestore collections forever
- Files: `apps/api/src/repositories/token.repository.ts`
- Cause: Only tokens marked as used are updated, expired tokens remain
- Improvement path: Implement scheduled cleanup function (Cloud Tasks or Cloud Scheduler), delete tokens older than 24 hours, batch delete operations

## Fragile Areas

**Auth Service Token Generation Logic:**
- Files: `apps/api/src/services/auth.service.ts` (lines 70-71, 86-87)
- Why fragile: Creates tokens but relies on caller to send emails; if email sending fails silently, user cannot verify or reset password
- Safe modification: Add error handling and retry logic in email service layer before marking tokens as committed, implement transaction pattern
- Test coverage: No tests for token creation; email sending integration untested

**User Creation with Password:**
- Files: `apps/api/src/usecases/user/create-user.usecase.ts`, `apps/api/src/repositories/user.repository.ts`
- Why fragile: Plain password passed through create flow before hashing; if error occurs between hash and storage, inconsistent state possible
- Safe modification: Hash password before repository call, pass only passwordHash, never pass plaintext through layers
- Test coverage: No tests for password hashing or duplicate email detection

**Base64 Token Parsing:**
- Files: `apps/api/src/middleware/auth.middleware.ts` (lines 25, 46)
- Why fragile: Blindly decodes Base64 without validation; any Base64 string is accepted as valid userId
- Safe modification: Add format validation (UUID, length checks), implement proper JWT with signature verification
- Test coverage: No tests for invalid token formats or expired tokens

**Firestore Document Reference Chain:**
- Files: `apps/api/src/repositories/user.repository.ts` (lines 100-117), `apps/api/src/repositories/token.repository.ts` (lines 67-81)
- Why fragile: Batch operations and multi-step updates can fail partially; no transaction wrapper
- Safe modification: Use Firestore transactions for multi-document updates, wrap in try-catch with rollback
- Test coverage: No tests for failed batch writes or partial update scenarios

## Scaling Limits

**Firestore Collection Unbounded Growth:**
- Current capacity: Token collections will grow indefinitely
- Limit: Firestore has no hard limits but cleanup will become needed at 10k+ expired tokens per collection
- Scaling path: Implement TTL-based deletion (Cloud Firestore TTL policy when available), or scheduled cleanup Cloud Function

**No Session Management:**
- Current capacity: Each client maintains token independently
- Limit: Cannot invalidate sessions server-side (e.g., logout doesn't actually invalidate token)
- Scaling path: Implement Redis/Memorystore for session blacklist, add logout endpoint that invalidates tokens, implement token revocation list

**Single Firebase Instance:**
- Current capacity: Monolithic Firebase app for entire system
- Limit: All auth, users, organizations will share single database; no data isolation
- Scaling path: Multi-tenant data model with organization-scoped queries, consider separate Firestore databases per organization if isolation needed

## Dependencies at Risk

**bcryptjs No Longer Actively Maintained:**
- Risk: bcryptjs is well-tested but uses slower bcrypt algorithm; no security issues known but newer alternatives exist
- Impact: Password hashing works correctly, no immediate threat
- Migration plan: Consider crypto.subtle.deriveKey() (native) or argon2 (more secure) in future; bcryptjs is safe to use currently

**Firebase Admin SDK Version Lag:**
- Risk: firebase-admin@12.7.0 may have security patches in newer versions
- Impact: Current version is recent (Jan 2025 era), minimal risk
- Migration plan: Regular dependency updates through pnpm, subscribe to Firebase security advisories

## Missing Critical Features

**Email Verification System:**
- Problem: Tokens are created but never sent; users cannot verify accounts
- Blocks: Production deployment requires email verification for compliance and deliverability

**Password Reset Flow:**
- Problem: Tokens generated but reset emails never sent; users cannot recover accounts
- Blocks: Production deployment requires working password recovery

**Token Generation Missing Access/Refresh Tokens:**
- Problem: Login returns user object only, no tokens for authenticated requests
- Blocks: All protected endpoints cannot be accessed; frontend cannot authorize requests

**Organization Management:**
- Problem: No multi-tenant support; every user shares single namespace
- Blocks: Team/workspace features cannot be implemented

**Subscription/Payment:**
- Problem: Stripe integration not started; payment processing impossible
- Blocks: Revenue model and premium tier features cannot be launched

**User Authentication on Protected Routes:**
- Problem: User and auth routes not protected with authMiddleware
- Blocks: Anyone can create/list/delete users; no authorization boundaries

## Test Coverage Gaps

**No Unit Tests for Auth Service:**
- What's not tested: Password verification, token creation, email verification flow, password reset logic
- Files: `apps/api/src/services/auth.service.ts`
- Risk: Changes to authentication logic could introduce security bugs undetected
- Priority: HIGH - authentication is critical path

**No Tests for Auth Middleware:**
- What's not tested: Invalid tokens, expired tokens, missing authorization header, Base64 decoding edge cases
- Files: `apps/api/src/middleware/auth.middleware.ts`
- Risk: Unauthorized requests could bypass authentication
- Priority: HIGH - authentication critical

**No Tests for User Repository:**
- What's not tested: Email uniqueness enforcement, pagination with cursors, password hashing in storage
- Files: `apps/api/src/repositories/user.repository.ts`
- Risk: Data integrity issues could develop (duplicate emails, corrupt passwords)
- Priority: HIGH - data layer

**No Integration Tests:**
- What's not tested: Full auth flow (register -> verify email -> login), password reset flow, cross-endpoint data consistency
- Files: All route handlers
- Risk: Endpoints might work in isolation but fail when used together
- Priority: MEDIUM - integration scenarios

**No E2E Tests:**
- What's not tested: Complete user journeys, multiple sequential requests, token lifecycle
- Risk: Frontend integration could fail despite backend tests passing
- Priority: MEDIUM - user journeys

**No Tests for Zod Schemas:**
- What's not tested: Input validation, rejection of invalid data, schema completeness
- Files: `packages/shared/src/schemas/`
- Risk: Invalid data could reach service layer
- Priority: MEDIUM - data validation

---

*Concerns audit: 2026-02-25*
