# Architecture

**Analysis Date:** 2026-02-25

## Pattern Overview

**Overall:** Clean Architecture with Layered Services (Backend) and Next.js App Router with API Routes (Frontend)

**Key Characteristics:**
- Monorepo structure using pnpm workspaces with `apps/` (web, api) and `packages/shared`
- Backend uses Clean Architecture layers: types → models → repositories → usecases → services → routes
- Frontend uses Next.js 16 with App Router, React Query, and NextAuth for authentication
- Hono.js framework for backend HTTP handling, deployed as Firebase Cloud Functions
- Firestore as primary database with real-time capabilities
- Shared type-safe contracts via `@klayim/shared` package using Zod schemas
- Cross-layer validation: frontend uses Zod schemas, backend validates same schemas

## Layers

**Presentation Layer (Frontend):**
- Purpose: React components, pages, hooks for user interface
- Location: `apps/web/src/`
- Contains: Components (UI library in `/components`), pages (App Router in `/app`), hooks (`/hooks`), middleware (`middleware.ts`)
- Depends on: React Query for data fetching, React Hook Form for forms, NextAuth for session management, shared types/schemas
- Used by: Browser clients

**API Routes Layer (Frontend/BFF):**
- Purpose: Backend-for-frontend proxy layer between frontend and backend API
- Location: `apps/web/src/app/api/v1/`
- Contains: Route handlers that proxy to backend API (e.g., `/auth/login`, `/auth/register`)
- Depends on: Backend API service
- Used by: Frontend components via `fetcher` and custom hooks

**Service Layer (Backend):**
- Purpose: Business logic orchestration and external service interactions
- Location: `apps/api/src/services/`
- Contains: `AuthService` (authentication logic), `StorageService` (file handling)
- Depends on: Repositories, external services (Firebase, bcryptjs)
- Used by: Routes, Use Cases

**Use Case Layer (Backend):**
- Purpose: Application-specific business workflows
- Location: `apps/api/src/usecases/user/`
- Contains: Individual use case classes (CreateUserUseCase, GetUserUseCase, UpdateUserUseCase, DeleteUserUseCase, ListUsersUseCase)
- Depends on: Repositories, shared types
- Used by: Routes (via dependency injection)

**Repository Layer (Backend):**
- Purpose: Data access and persistence abstraction
- Location: `apps/api/src/repositories/`
- Contains: `UserRepository`, `TokenRepository`, base `IRepository<T, CreateDTO, UpdateDTO>` interface
- Depends on: Firestore, models, types
- Used by: Use Cases, Services

**Model/Entity Layer (Backend):**
- Purpose: Domain entities with business logic
- Location: `apps/api/src/models/`
- Contains: `UserEntity` with instance methods (create, update, setLastLogin, setEmailVerified, toJSON, toProfile)
- Depends on: Shared types
- Used by: Repositories

**Type/Schema Layer (Shared):**
- Purpose: Type definitions and runtime validation schemas
- Location: `packages/shared/src/types/` and `packages/shared/src/schemas/`
- Contains: User, Organization, Auth, Common types; Zod schemas for validation
- Depends on: Zod (for schemas)
- Used by: All layers (API, frontend, shared)

**Infrastructure Layer (Backend):**
- Purpose: Firebase initialization and external service configuration
- Location: `apps/api/src/lib/firebase.ts`
- Contains: Firebase Admin SDK initialization (Firestore, Storage, RTDB, Auth)
- Depends on: Firebase Admin SDK
- Used by: Repositories, Services

**Middleware Layer (Backend):**
- Purpose: Cross-cutting concerns (authentication, CORS, logging)
- Location: `apps/api/src/middleware/`
- Contains: `authMiddleware`, `optionalAuthMiddleware` for Bearer token validation
- Depends on: Hono context
- Used by: Routes (as middleware in Hono app)

## Data Flow

**Authentication Flow (Login):**
1. Component (`LoginForm`) calls `useLogin()` hook from `apps/web/src/hooks/use-auth.ts`
2. Hook uses NextAuth's `signIn("credentials", { email, password }, { redirect: false })`
3. NextAuth calls the credentials provider in `apps/web/src/lib/auth/config.ts`
4. Provider calls `api("/auth/login")` from `apps/web/src/lib/api.ts` (direct backend call)
5. Request reaches backend: `apps/api/src/routes/auth.route.ts` POST `/auth/login`
6. Route handler validates input with Zod schema `loginSchema`
7. Calls `authService.login(input)` from `apps/api/src/services/auth.service.ts`
8. Service calls `userRepository.findByEmailWithPassword(email)` to get user with password hash
9. Compares password using bcryptjs
10. Updates `lastLoginAt` via repository
11. Returns `{ user: UserProfile }` to route
12. Route responds with `ApiResponse<{ user: UserProfile }>`
13. NextAuth processes response, creates JWT session
14. Frontend hook returns session to component

**Registration Flow:**
1. Component calls `useRegister()` hook from `apps/web/src/hooks/use-auth.ts`
2. Hook calls `fetcher("/auth/register")` from `apps/web/src/lib/fetcher.ts`
3. This goes through Next.js API route at `apps/web/src/app/api/v1/auth/register/route.ts`
4. Route handler calls `api("/auth/register")` to backend
5. Backend route `apps/api/src/routes/auth.route.ts` POST `/auth/register`
6. Validates input with `registerSchema` (Zod)
7. Calls `authService.register(input)`
8. Service checks email exists via `userRepository.findByEmail(email)`
9. Hashes password with bcryptjs (salt rounds: 12)
10. Creates user via `userRepository.create()` with hash
11. UserEntity is instantiated with status "pending", emailVerified false
12. Creates email verification token via `tokenRepository.createEmailVerificationToken()`
13. Returns user object
14. Frontend receives response and displays success message

**User Data Fetch Flow (List Users):**
1. Component calls `listUsersUseCase.execute({ limit, cursor })`
2. Use case calls `userRepository.findAll(params)`
3. Repository executes Firestore query with cursor-based pagination
4. Returns `PaginatedResult<User>` with next cursor and hasMore flag
5. Response wrapped in `ApiResponse<PaginatedResult<User>>`
6. Sent to client with HTTP 200

**Email Verification Flow:**
1. Backend sends verification token to user's email (via TODO service)
2. User clicks link with token in query parameter
3. Component extracts token from URL
4. Calls `useVerifyEmail()` hook with token
5. Hook calls `fetcher("/auth/verify-email")` with `{ token }`
6. Backend route receives request, calls `authService.verifyEmail(token)`
7. Service finds token via `tokenRepository.findEmailVerificationToken(token)`
8. If valid, calls `userRepository.verifyEmail(userId)`
9. Repository updates user: `emailVerified: true`, `status: "active"`
10. Marks token as used via `tokenRepository.markEmailVerificationTokenUsed()`
11. Returns success response

**State Management:**
- **Backend:** No global state; stateless service layer with dependency injection
- **Frontend (Session):** NextAuth session managed via `next-auth/react` with JWT stored in secure HTTP-only cookies
- **Frontend (Data):** React Query (`@tanstack/react-query`) caches API responses with configurable stale time
- **Frontend (Auth Context):** Custom `useAuth()` hook provides user state from NextAuth session
- **Form State:** React Hook Form handles local form state with Zod validation

## Key Abstractions

**ApiResponse<T> Wrapper:**
- Purpose: Standardized HTTP response envelope across all API calls
- Examples: `apps/api/src/types/index.ts`, `packages/shared/src/types/common.ts`
- Pattern: `{ success: boolean; data?: T; error?: string; message?: string }`
- Used everywhere: auth responses, user CRUD, pagination results

**Repository Interface Pattern:**
- Purpose: Abstract data access behind consistent interface
- Examples: `apps/api/src/repositories/base.repository.ts` defines `IRepository<T, CreateDTO, UpdateDTO>`
- Pattern: Methods like `findById()`, `findAll()`, `create()`, `update()`, `delete()`
- Used by: `UserRepository` and `TokenRepository` implement specialized methods beyond interface (e.g., `findByEmail()`, `findByEmailWithPassword()`)

**Entity Pattern:**
- Purpose: Domain object with encapsulated business logic
- Examples: `apps/api/src/models/user.model.ts` implements `UserEntity`
- Pattern: Constructor accepts data, static `create()` factory, instance methods for state transitions
- Methods: `update()`, `setLastLogin()`, `setEmailVerified()` return new instances (immutable pattern)
- Conversion: `toJSON()` returns public User type, `toProfile()` returns limited UserProfile type

**Use Case Classes:**
- Purpose: Single responsibility pattern - each use case handles one workflow
- Examples: `apps/api/src/usecases/user/` has separate classes for create, read, update, delete, list
- Pattern: Single async `execute()` method, returns result object with `success` flag and `error` field
- Benefits: Testability, reusability across different delivery mechanisms

**Zod Schema Validation:**
- Purpose: Single source of truth for data shape and validation rules
- Examples: `packages/shared/src/schemas/user.ts` has `createUserSchema`, `updateUserSchema`
- Pattern: Defined once in shared, used in:
  - Backend routes via `zValidator` from `@hono/zod-validator`
  - Frontend credentials provider in NextAuth config
  - Frontend hooks for form validation
- Benefits: Type safety (TypeScript inference) + runtime validation

**Service Pattern:**
- Purpose: Orchestrate complex business logic and external dependencies
- Examples: `apps/api/src/services/auth.service.ts` handles login, register, password flows
- Pattern: Methods return discriminated unions (either success with data or error object)
- Dependencies: Repositories, external libraries (bcryptjs), token service

## Entry Points

**Backend API:**
- Location: `apps/api/src/index.ts`
- Triggers: Firebase Cloud Function HTTP request
- Responsibilities: Hono app initialization, global middleware (logger, CORS), route registration, error handling
- Exports: `api` function for Firebase Functions export

**Frontend Web App:**
- Location: `apps/web/src/app/layout.tsx` (root layout)
- Triggers: Browser navigation
- Responsibilities: Global providers (NextAuth session, React Query, theme), layout structure
- Entry page: `apps/web/src/app/page.tsx` (marketing/landing page)
- Protected route: Dashboard at `/dashboard` (requires NextAuth middleware)

**Frontend Middleware:**
- Location: `apps/web/src/middleware.ts`
- Triggers: Every request before route handling
- Responsibilities: NextAuth `auth()` function - checks session, enforces auth for `/dashboard` routes
- Returns: Request proceeds if authorized, otherwise redirects to login

**NextAuth Route:**
- Location: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Triggers: `signIn()`, `signOut()`, session requests
- Responsibilities: NextAuth handler routing (credentials provider, JWT/session callbacks)

**API Route Examples:**
- `apps/web/src/app/api/v1/auth/login/route.ts` - POST login (proxies to backend)
- `apps/web/src/app/api/v1/auth/register/route.ts` - POST register (proxies to backend)
- Similar pattern for: verify-email, forgot-password, reset-password

## Error Handling

**Strategy:** Layered error handling with specific error classes

**Patterns:**

**Backend (Hono):**
- Route handlers try/catch and return `ApiResponse` with `{ success: false, error: string }`
- Service methods return result objects: `{ success: boolean; error?: string }`
- Repositories return null on not found (instead of throwing)
- Global error handler in `apps/api/src/index.ts` catches unhandled errors, logs, responds with 500
- Auth middleware returns 401 with `{ success: false, error: "Unauthorized" }`

**Frontend (React):**
- `ApiError` class in `apps/web/src/lib/api.ts` wraps HTTP errors with status, statusText, data
- `FetchError` class in `apps/web/src/lib/fetcher.ts` similar pattern for BFF calls
- React Query handles errors via `onError` callbacks in `useMutation` hooks
- Hooks throw `FetchError` if response not successful, consumed by components
- Form validation errors caught by React Hook Form + Zod validation

## Cross-Cutting Concerns

**Logging:**
- Backend: Hono's `logger()` middleware logs all HTTP requests
- Frontend: Browser console available; no structured logging configured

**Validation:**
- Backend: Routes use `zValidator("json", schema)` middleware to validate and parse body
- Frontend: React Hook Form + Zod integration for form validation
- Shared: Zod schemas in `packages/shared/src/schemas/` define authoritative validation rules

**Authentication:**
- Backend: `authMiddleware` checks Bearer token in Authorization header (base64-encoded userId)
- Frontend: NextAuth manages session via credentials provider calling backend login
- Frontend Middleware: `auth()` enforces auth state for protected routes (e.g., `/dashboard`)
- Token: Currently base64(userId) - TODO indicates proper JWT should be implemented

**CORS:**
- Backend: Hono `cors()` middleware allows `http://localhost:3000` with credentials
- Hardcoded for local dev - should be configurable by environment

**Type Safety:**
- Entire call stack uses shared types from `@klayim/shared`
- TypeScript strict mode enabled in both apps
- Zod inference creates types from schemas - single source of truth

---

*Architecture analysis: 2026-02-25*
