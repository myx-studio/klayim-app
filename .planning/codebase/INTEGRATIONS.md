# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**Firebase Services:**
- Firebase (Google Cloud) - Core infrastructure platform
  - SDK: `firebase` (client), `firebase-admin` (server)
  - Auth: Environment variables with `NEXT_PUBLIC_FIREBASE_*` prefix
  - Region: asia-southeast1
  - Multiple Firebase services integrated (see Data Storage section)

## Data Storage

**Databases:**
- Firestore (Firebase Cloud Firestore)
  - Connection: Initialized via `firebase-admin/firestore`
  - Client: `firebase-admin` SDK at `apps/api/src/lib/firebase.ts`
  - Usage: User data stored in "users" collection
  - Repository pattern: `apps/api/src/repositories/user.repository.ts`
  - Features:
    - CRUD operations (Create, Read, Update, Delete)
    - Query by ID and email
    - Pagination with cursor-based navigation
    - Timestamp tracking (createdAt, updatedAt)

- Firebase Realtime Database (RTDB)
  - Connection: Initialized via `firebase-admin/database`
  - Client: `firebase-admin` SDK

**File Storage:**
- Firebase Cloud Storage
  - Client: `firebase-admin/storage`
  - Implementation: `apps/api/src/services/storage.service.ts`
  - Features:
    - File upload with metadata (content type)
    - Public URL generation
    - Signed URL generation (customizable expiration)
    - File deletion
    - File existence checking

**Caching:**
- None detected - TanStack React Query used for client-side data caching

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication (primary backend)
  - Implementation: `apps/api/src/services/auth.service.ts`
  - Client: `firebase-admin/auth`
  - Features:
    - User creation with email/password
    - ID token verification
    - User metadata management (displayName, photoURL)
    - User deletion
    - Credentials-based authentication

- NextAuth (client-side session wrapper)
  - Implementation: `apps/web/src/lib/auth/config.ts`
  - Provider: Credentials (email/password)
  - Endpoints:
    - Sign in: `/login`
    - Session management via JWT tokens
    - Route: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
  - Integration:
    - Calls backend API endpoint `/auth/login` for credential validation
    - Stores user session with NextAuth
    - SessionProvider wraps app at `apps/web/src/components/providers/session-provider.tsx`

**Login Flow:**
1. User submits credentials via web form
2. NextAuth Credentials provider validates via `api/v1/auth/login` endpoint
3. Backend calls Firebase Authentication to verify credentials
4. Session stored client-side via NextAuth JWT
5. Protected routes checked via `authorized()` callback (e.g., `/dashboard` requires login)

## Monitoring & Observability

**Error Tracking:**
- Not configured - Basic error handling via try/catch

**Logs:**
- Console logging in development
- Hono logger middleware: `apps/api/src/index.ts` (logger from "hono/logger")
- Firebase Cloud Logging (available but not explicitly configured)

## CI/CD & Deployment

**Hosting:**
- Google Firebase Hosting (for web app)
- Google Firebase Cloud Functions (for API backend)
- Region: asia-southeast1

**CI Pipeline:**
- Not detected in codebase (no GitHub Actions, GitLab CI, etc.)
- Manual deployment via `firebase deploy` command
- Build scripts defined in `apps/api/package.json`:
  - `pnpm run build && firebase deploy --only functions`

**Deploy Commands:**
- Web: Deployed to Firebase Hosting (automatic via Turbo)
- API: `pnpm --filter api run deploy` (builds and deploys Cloud Functions)

## Environment Configuration

**Required env vars (Web - `apps/web/.env.local.example`):**

Client-side (NEXT_PUBLIC_*):
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain (e.g., project.firebaseapp.com)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - GCP project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Cloud Storage bucket (e.g., project.firebasestorage.app)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - FCM sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` - Google Analytics ID
- `NEXT_PUBLIC_API_URL` - Backend API endpoint (e.g., http://localhost:5001/project-id/asia-southeast1/api)

Server-side (NextAuth):
- `AUTH_SECRET` - Generated via `openssl rand -base64 32`
- `AUTH_URL` - Application URL (e.g., http://localhost:3000)

**API Configuration:**
- Firebase Admin SDK uses Application Default Credentials (ADC) from environment
- Development: Firebase Emulators Suite (local emulation)
- Production: GCP service account credentials

**Secrets location:**
- Development: `.env.local` files (NOT committed)
- Production: Firebase Environment Configuration or GCP Secret Manager

## Webhooks & Callbacks

**Incoming:**
- `/auth/login` - Credentials validation endpoint (called by NextAuth)
  - Location: `apps/api/src/routes/` (auth route not visible in routes, likely in user routes or separate)
  - Actually: Appears to be registered in main Hono app or user routes
  - **Note:** Auth login route not explicitly found in visible routes - check usage in auth.service.ts

**Outgoing:**
- Firebase Cloud Messaging (FCM) available via Firebase SDK but not actively used
- Firebase Analytics events sent from client

## Architecture Summary

**Data Flow:**
1. **Client (Next.js Web App)**
   - User authenticates via NextAuth credentials provider
   - NextAuth calls backend `/auth/login` endpoint
   - Stores session JWT locally
   - Sends authenticated requests to API

2. **Backend (Firebase Cloud Functions + Hono)**
   - Receives HTTP requests via Hono router
   - Routes requests to handlers (users, health, etc.)
   - Handlers interact with Firebase services
   - Firestore for persistent user data
   - Firebase Auth for authentication verification
   - Cloud Storage for file uploads

3. **Database (Firestore)**
   - User collection: User profiles and metadata
   - Auto-generated timestamps
   - Email-based queries for login validation

4. **Storage (Cloud Storage)**
   - File uploads for user avatars or documents
   - Public and signed URL generation

---

*Integration audit: 2026-02-25*
