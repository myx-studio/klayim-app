# Codebase Concerns

**Analysis Date:** 2026-02-25

## Tech Debt

**Missing Environment Configuration Documentation:**
- Issue: No `.env.example` or `.env.local.example` file to guide developers on required environment variables
- Files: Root directory, `/apps/web`, `/apps/api`
- Impact: Developers cannot easily bootstrap the project without trial-and-error; CI/CD pipeline setup is unclear
- Fix approach: Create `.env.example` files documenting all required Firebase variables, Next Auth configuration, and API endpoints

**Incomplete Next.js Configuration:**
- Issue: `next.config.ts` in `/apps/web/src` is essentially a stub with no actual configuration
- Files: `/apps/web/next.config.ts`
- Impact: Image optimization, rewrites, redirects, and other Next.js features are not configured; cannot control API proxy behavior
- Fix approach: Add proper Next configuration including image domains, API rewrites, environment handling

**Empty Placeholder Page:**
- Issue: Home page at `/apps/web/src/app/page.tsx` contains boilerplate Next.js template content, not actual application content
- Files: `/apps/web/src/app/page.tsx`
- Impact: Application has no functional landing page; serves as confusing entry point
- Fix approach: Replace with actual Klayim homepage or redirect to authenticated dashboard

**Unimplemented Authentication Flow:**
- Issue: NextAuth is configured with Credentials provider, but the `/auth/login` API endpoint needs backend integration that isn't visible
- Files: `/apps/web/src/lib/auth/config.ts`, `/apps/web/src/app/api/v1/auth/login/route.ts`
- Impact: Login flow may fail in production due to missing password validation, token generation, or backend sync
- Fix approach: Ensure API backend implements full password hashing, token generation, and session management

## Known Bugs

**Silent Error Swallowing in Auth Services:**
- Symptoms: Authentication failures return `null` instead of providing error details
- Files: `/apps/api/src/services/auth.service.ts` (lines 17-19, 25-27)
- Trigger: Invalid token, network failure, or user not found
- Workaround: Add logging before returning null to understand failures locally
- Impact: Production debugging becomes difficult; clients receive generic "Unauthorized" messages

**JSON Body Handling in Hono Adapter:**
- Symptoms: Request body may not be properly parsed if client sends non-JSON content
- Files: `/apps/api/src/index.ts` (lines 81-83)
- Trigger: Sending binary data or form-encoded data to endpoints expecting JSON
- Workaround: Clients must send `Content-Type: application/json`
- Impact: Limited API flexibility; no graceful content-type negotiation

**API CORS Hardcoded to Localhost:**
- Symptoms: Production API calls will fail with CORS errors
- Files: `/apps/api/src/index.ts` (line 17)
- Trigger: Deploy to production without updating allowed origins
- Workaround: Must update CORS configuration before deployment
- Impact: Cannot be deployed to staging/production without code change

## Security Considerations

**Exposed Firebase Client Secrets in Browser:**
- Risk: Firebase API key and project ID are embedded in public browser code via `NEXT_PUBLIC_*` variables
- Files: `/apps/web/src/lib/firebase.ts` (lines 5-12)
- Current mitigation: Firebase security rules should restrict access (assumed but not verified)
- Recommendations: Verify Firestore security rules deny direct client reads/writes; keep credentials in `.env.local`; consider using server-side SDK only where possible

**Plaintext Password Handling in Credentials Provider:**
- Risk: Passwords transmitted over HTTP in dev mode without SSL/TLS verification
- Files: `/apps/web/src/lib/auth/config.ts` (lines 38-42), `/apps/api/src/services/auth.service.ts`
- Current mitigation: None visible - Firebase auth may handle this internally
- Recommendations: Enforce HTTPS in production; use Firebase Security Rules; add rate limiting to login endpoint

**Missing CSRF Protection on Login Endpoint:**
- Risk: POST endpoint at `/api/v1/auth/login` has no CSRF token validation
- Files: `/apps/web/src/app/api/v1/auth/login/route.ts`
- Current mitigation: NextAuth middleware may provide some protection (needs verification)
- Recommendations: Add CSRF token validation; verify SameSite cookie settings

**No Input Validation on User Route Endpoints:**
- Risk: Routes accept any JSON body without schema validation
- Files: `/apps/api/src/routes/user.route.ts` (lines 50-52, 73-74)
- Current mitigation: Database layer checks for duplicate email, but other fields are unchecked
- Recommendations: Add Zod/validation middleware; enforce max string lengths; validate email format on API side

**Storage Service Makes Files Publicly Readable:**
- Risk: All uploaded files become public after `makePublic()` call
- Files: `/apps/api/src/services/storage.service.ts` (line 17)
- Current mitigation: Signed URLs are available (line 31) but not enforced
- Recommendations: Make files private by default; use signed URLs exclusively; implement access control checks

**Storage Paths Not Validated:**
- Risk: No sanitization of file paths - could allow directory traversal
- Files: `/apps/api/src/services/storage.service.ts` (lines 6-8, 22, 31, 43)
- Current mitigation: None
- Recommendations: Validate and sanitize file paths; use UUID-based names; prevent `..` sequences

## Performance Bottlenecks

**Pagination Without Proper Indexing:**
- Problem: Cursor-based pagination queries Firestore with `orderBy("createdAt", "desc")` every time
- Files: `/apps/api/src/repositories/user.repository.ts` (line 45)
- Cause: Firestore queries without composite indexes can be slow at scale
- Improvement path: Create Firestore indexes; consider caching paginated results; implement result set caching

**N+1 Query Risk in User Retrieval:**
- Problem: Each user lookup fetches full document from Firestore without field selection
- Files: `/apps/api/src/repositories/user.repository.ts` (lines 20, 30, 48)
- Cause: No projection to select only needed fields
- Improvement path: Use Firestore projections; refactor repository to accept field list parameter

**No Request Caching in API:**
- Problem: Identical requests hit database every time
- Files: `/apps/api/src/index.ts`
- Cause: No cache headers or in-memory caching layer
- Improvement path: Add Redis caching; implement proper Cache-Control headers; use ETags

**Sidebar Component is Large:**
- Problem: `sidebar.tsx` component is 726 lines - likely contains too much logic
- Files: `/apps/web/src/components/ui/sidebar.tsx`
- Cause: Possible responsibility creep or missing component extraction
- Improvement path: Extract navigation logic; split into smaller presentational components

## Fragile Areas

**Authentication Callback Chain:**
- Files: `/apps/web/src/lib/auth/config.ts` (lines 64-91)
- Why fragile: Multiple callbacks (jwt, session, authorized) manipulate auth state; changes to token structure break sessions
- Safe modification: Add comprehensive tests before modifying token structure; validate callback order doesn't change
- Test coverage: No test files found for auth logic

**Repository Pattern With Single Instances:**
- Files: `/apps/api/src/repositories/user.repository.ts` (line 125), `/apps/api/src/services/auth.service.ts` (line 50)
- Why fragile: Singleton pattern with Firebase connection; no dependency injection makes testing difficult
- Safe modification: Add unit tests with mocked Firebase; consider factory pattern
- Test coverage: Repos and services cannot be easily mocked

**Hono-to-Express Bridge:**
- Files: `/apps/api/src/index.ts` (lines 62-101)
- Why fragile: Custom request/response conversion between Express and Web Request APIs
- Safe modification: Add integration tests; ensure all Express features are properly converted
- Test coverage: No test coverage visible; conversion logic untested

**NextAuth Configuration Callbacks:**
- Files: `/apps/web/src/lib/auth/config.ts` (lines 64-91)
- Why fragile: Token and session callbacks must stay in sync; authorized callback logic is simple but critical
- Safe modification: Centralize token structure; add type safety; test all callback paths
- Test coverage: No tests found

## Scaling Limits

**Firebase Firestore Read/Write Costs:**
- Current capacity: One collection with users; pagination queries do full collection scan
- Limit: Firestore charges per read operation; pagination queries at scale (millions of users) become expensive
- Scaling path: Implement composite indexes; add caching layer; consider data denormalization

**API Function Cold Starts:**
- Current capacity: Single Firebase Function endpoint
- Limit: Serverless cold starts can cause 1-5 second delays on initial requests
- Scaling path: Upgrade to always-warm functions; implement API Gateway; use background workers for heavy operations

**Static Frontend Bundle Size:**
- Current capacity: UI components include shadcn library and Recharts (357 lines)
- Limit: React 19.2.3 + all charting/UI libraries can exceed 500KB uncompressed
- Scaling path: Implement route-based code splitting; lazy load chart components; consider lighter chart library

## Dependencies at Risk

**Next Auth Beta Version:**
- Risk: `next-auth@5.0.0-beta.30` is a beta release - breaking changes possible
- Impact: Production deployment risky; authentication could break on version bumps
- Migration plan: Wait for stable 5.0.0 release; thoroughly test before upgrading; pin exact version

**Multiple Unverified Auth Providers:**
- Risk: Credentials provider alone with no OAuth/social providers limits authentication options
- Impact: Cannot support single sign-on; vendor lock-in to custom auth
- Migration plan: Add OAuth providers (Google, GitHub); refactor auth flow to support multiple providers

**Firebase Admin SDK Version Mismatch:**
- Risk: Client uses `firebase@12.9.0` while admin uses `firebase-admin@12.7.0`
- Impact: Feature discrepancies; potential compatibility issues
- Migration plan: Keep admin and client SDK versions synchronized; update both regularly

## Missing Critical Features

**No Password Reset Flow:**
- Problem: Users cannot reset forgotten passwords
- Blocks: Password recovery UX; account lockout recovery

**No Email Verification:**
- Problem: Any email can be registered without verification
- Blocks: Preventing spam registrations; valid user contact information

**No Logout Implementation:**
- Problem: NextAuth handlers imported but `signOut` function not used anywhere
- Blocks: Users cannot end sessions; security risk for shared devices

**No Error Boundary or Fallback Pages:**
- Problem: No error.tsx or not-found.tsx in Next.js app layout
- Blocks: Unhandled errors show raw React error pages; 404s show generic Hono response

**No Request Validation Middleware:**
- Problem: API routes accept any JSON without schema validation
- Blocks: Garbage data can corrupt database; no protection against malformed requests

## Test Coverage Gaps

**Zero Test Files Found:**
- What's not tested: All business logic, API routes, auth flows, database operations
- Files: All source files lack corresponding `.test.ts` or `.spec.ts` files
- Risk: Medium+ risk - breaking changes go undetected; refactoring is unsafe
- Priority: High

**Auth Flow Untested:**
- What's not tested: NextAuth callbacks (jwt, session, authorized), Credentials provider flow, token validation
- Files: `/apps/web/src/lib/auth/`, `/apps/api/src/services/auth.service.ts`
- Risk: High - authentication failure in production would be critical
- Priority: High

**Repository Layer Untested:**
- What's not tested: Firestore queries, pagination, entity mapping, error handling
- Files: `/apps/api/src/repositories/`, `/apps/api/src/models/`
- Risk: Medium - data corruption or data access bugs could go unnoticed
- Priority: High

**API Endpoint Integration Untested:**
- What's not tested: Request/response serialization, error responses, HTTP status codes, CORS
- Files: `/apps/api/src/routes/`, `/apps/api/src/index.ts`
- Risk: Medium - endpoint behavior could differ from spec
- Priority: Medium

**Frontend Component Tests Missing:**
- What's not tested: React components, form submissions, error states
- Files: `/apps/web/src/components/`, `/apps/web/src/app/`
- Risk: Low-Medium - UI regressions would be caught in manual testing
- Priority: Medium

---

*Concerns audit: 2026-02-25*
