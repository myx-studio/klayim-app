# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**Email Services:**
- Email verification and password reset - Planned integration (TODO comments in `apps/api/src/services/auth.service.ts` lines 73, 89)
  - Not yet implemented
  - Needs: Email provider SDK (SendGrid, Resend, Mailgun, etc.)

**Stripe (Subscription Management):**
- Integration planned for subscription and payment handling
- Data models prepared: `packages/shared/src/types/subscription.ts` defines PaymentRecord with `stripePaymentIntentId`, `stripeInvoiceId`
- Organization model includes `stripeCustomerId` and `stripeSubscriptionId` fields
- Endpoints needed for: checkout session creation, subscription management, payment history
- Status: Schema defined, implementation not yet started

## Data Storage

**Databases:**
- Firestore (Document Database) - Cloud Firestore
  - Connection: Initialized via Firebase Admin SDK in `apps/api/src/lib/firebase.ts`
  - Client: firebase-admin/firestore v12.7.0
  - Exported as: `firestore` constant in firebase.ts

- Realtime Database (RTDB) - Firebase Realtime Database
  - Connection: Initialized via Firebase Admin SDK
  - Client: firebase-admin/database v12.7.0
  - Exported as: `rtdb` constant in firebase.ts
  - Purpose: Not yet utilized in current codebase (schema prepared for future use)

**File Storage:**
- Cloud Storage - Firebase Storage
  - Connection: Initialized via Firebase Admin SDK
  - Client: firebase-admin/storage v12.7.0
  - Exported as: `storage` constant in `apps/api/src/lib/firebase.ts`
  - Service: `apps/api/src/services/storage.service.ts` provides abstraction
  - Use cases: User avatars, organization logos, media storage

**Caching:**
- TanStack React Query - Client-side query caching for API responses
- No server-side caching layer (Redis/Memcached) currently configured

## Authentication & Identity

**Auth Provider:**
- Custom email/password with NextAuth.js
  - Implementation: `apps/web/src/lib/auth/config.ts`
  - Provider: Credentials provider (custom email/password)
  - Session: JWT-based tokens via NextAuth
  - Callbacks: Custom JWT and session callbacks for user context
  - Protected routes: Dashboard pages require authentication via middleware

**Password Security:**
- Password hashing: bcryptjs v3.0.3 with SALT_ROUNDS = 12
- Location: `apps/api/src/services/auth.service.ts` handles hashing/verification
- Token-based password reset: Reset tokens stored in database with expiration

**Email Verification:**
- Token-based verification flow prepared
- Tokens stored in database with expiration
- Verification endpoint: POST `/auth/verify-email` (prepared in routes)

**Firebase Auth (Planned):**
- Firebase Auth client initialized in `apps/web/src/lib/firebase.ts`
- Purpose: Analytics and Functions emulator connection (not primary auth)
- Connection: `functions` object connects to asia-southeast1 region
- Emulator: Connects to localhost:5001 in development

## Monitoring & Observability

**Error Tracking:**
- Not configured
- Opportunity for: Sentry, Error Reporting, Cloud Logging

**Logs:**
- Client-side: Console logs only (browser dev tools)
- Server-side: Hono logger middleware in `apps/api/src/index.ts`
  - Built-in request logging via `hono/logger`
  - Firebase Cloud Logging receives Cloud Functions stderr/stdout

**Analytics:**
- Firebase Analytics initialized in `apps/web/src/components/providers/analytics-provider.tsx`
- Client: firebase/analytics v12.9.0
- Initialization: `initAnalytics()` called during app load (browser only)
- Status: Connected but event tracking not yet implemented

## CI/CD & Deployment

**Hosting:**
- Frontend: Firebase App Hosting (Next.js)
  - Configuration: `apps/web/apphosting.yaml`
  - Region: asia-southeast1
  - Resources: 1 CPU, 512MB RAM, 100 concurrent connections, 0-10 instances
  - Build: `next build` then `next start`

- Backend: Google Cloud Functions (Firebase Functions)
  - Runtime: Node.js 20
  - Region: asia-southeast1
  - Entry point: `api.ts` exports `api` function
  - Build command: `tsc && tsc-alias` (TypeScript compilation with path alias resolution)
  - Pre-deploy: `pnpm --filter api run build`

**CI Pipeline:**
- Not detected (No GitHub Actions, GitLab CI, or similar configured)
- Manual deployment via Firebase CLI:
  - Deploy API: `pnpm deploy:api`
  - Deploy Web: `pnpm deploy:web`
  - Root scripts in `package.json`

## Environment Configuration

**Required env vars for App Hosting (`apps/web/apphosting.yaml`):**
```
Frontend:
  - NEXT_PUBLIC_FIREBASE_API_KEY
  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  - NEXT_PUBLIC_FIREBASE_PROJECT_ID
  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  - NEXT_PUBLIC_FIREBASE_APP_ID
  - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  - NEXT_PUBLIC_API_URL (e.g., https://asia-southeast1-PROJECT_ID.cloudfunctions.net/api)
  - AUTH_SECRET (NextAuth encryption key)
  - AUTH_URL (e.g., https://yourdomain.com)
  - API_URL (internal API endpoint for server-side requests)
```

**Secrets location:**
- Firebase Console → App Hosting → Environmental variables (for production)
- `.env.local` pattern for local development (not committed)
- Firebase emulators use default hardcoded credentials in dev mode

**CORS Configuration:**
- API CORS: Hardcoded to `origin: ["http://localhost:3000"]` in `apps/api/src/index.ts`
- Needs: Environment-based CORS for production environments

## Webhooks & Callbacks

**Incoming Webhooks:**
- Not detected
- Planned (Stripe webhooks for subscription events):
  - `POST /webhooks/stripe` - Handle payment.intent.succeeded, customer.subscription.updated, etc.
  - Endpoint not yet implemented

**Outgoing Webhooks:**
- Email verification links - Future integration
- Password reset links - Future integration
- Stripe webhook callbacks - External service callbacks (not outgoing webhooks)

## API Communication

**Frontend to Backend:**
- Base URL: `process.env.NEXT_PUBLIC_API_URL` (defaults to `process.env.API_URL`)
- Client: Custom `api()` function in `apps/web/src/lib/api.ts`
- Error handling: `ApiError` class with status, statusText, and response data
- Serialization: JSON with Content-Type application/json

**Endpoints Implemented:**
- `GET /` - Health/info endpoint
- `GET /health` - Health check route
- `POST /auth/login` - Credentials authentication
- `POST /auth/register` - User registration
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Password reset completion
- `POST /auth/verify-email` - Email verification
- `POST /auth/change-password` - Authenticated password change
- `GET/POST/PUT/DELETE /users` - User CRUD operations (schema in repositories)

**Request/Response Format:**
```typescript
// Success response
{
  success: true,
  data: T
}

// Error response
{
  success: false,
  error: string
}
```

---

*Integration audit: 2026-02-25*
