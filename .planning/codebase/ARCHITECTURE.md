# Architecture

**Analysis Date:** 2026-02-25

## Pattern Overview

**Overall:** Monorepo with Clean Architecture (layers + use cases) on backend, Next.js app architecture on frontend

**Key Characteristics:**
- Separation of concerns through distinct layers (routes → use cases → repositories → models)
- Repository pattern for data abstraction
- Firebase backend integration (Firestore, Auth, Functions)
- Client-server authentication via NextAuth
- API-driven communication with typed responses

## Layers

**Routes Layer:**
- Purpose: HTTP endpoint definitions and request/response handling
- Location: `apps/api/src/routes/` and `apps/web/src/app/api/`
- Contains: Route handlers with Hono framework endpoints
- Depends on: Use cases, types
- Used by: HTTP clients, API consumers

**Use Cases Layer:**
- Purpose: Business logic and application workflows
- Location: `apps/api/src/usecases/`
- Contains: Classes implementing specific operations (e.g., CreateUserUseCase)
- Depends on: Repositories, models, types
- Used by: Routes layer

**Repository Layer:**
- Purpose: Data access abstraction and Firestore queries
- Location: `apps/api/src/repositories/`
- Contains: UserRepository implementing IRepository interface, data mapping
- Depends on: Firebase SDK, models, types
- Used by: Use cases

**Models Layer:**
- Purpose: Entity definitions with business logic
- Location: `apps/api/src/models/`
- Contains: UserEntity with create/update/toJSON methods
- Depends on: Types
- Used by: Repositories

**Types Layer:**
- Purpose: Shared TypeScript interfaces and DTOs
- Location: `apps/api/src/types/`
- Contains: User, CreateUserDTO, UpdateUserDTO, ApiResponse, PaginationParams
- Depends on: Nothing
- Used by: All layers

**Middleware Layer:**
- Purpose: Cross-cutting concerns (logging, CORS, auth)
- Location: `apps/api/src/middleware/`
- Contains: Auth verification, request processing
- Depends on: Services, types
- Used by: Routes via Hono middleware chain

**Services Layer:**
- Purpose: Firebase integration and external service wrappers
- Location: `apps/api/src/services/`
- Contains: AuthService (Firebase Auth), StorageService (Firebase Storage)
- Depends on: Firebase Admin SDK
- Used by: Middleware, use cases

**Libraries Layer:**
- Purpose: Utility functions and SDK initialization
- Location: `apps/api/src/lib/` and `apps/web/src/lib/`
- Contains: Firebase initialization, API client, auth config, fetcher utilities
- Depends on: External SDKs
- Used by: All other layers

## Data Flow

**User Registration (from Web to API):**

1. User enters credentials on frontend
2. `useRegister()` hook calls `/auth/register` endpoint
3. NextAuth credential provider sends POST to backend API
4. API route handler receives request at `/auth/register`
5. Route calls `createUserUseCase.execute(body)`
6. Use case checks for duplicate email via `userRepository.findByEmail()`
7. Repository queries Firestore collection "users"
8. If unique, use case calls `userRepository.create(dto)`
9. Repository uses `UserEntity.create()` to instantiate entity
10. Entity saves to Firestore via `docRef.set()`
11. Repository returns mapped User response
12. Route returns ApiResponse with User data
13. NextAuth token callback stores user ID in session
14. Session persists to client

**User Authentication Flow:**

1. User logs in on `/login` page
2. `useLogin()` hook calls `signIn("credentials", ...)`
3. NextAuth calls `authConfig.authorize()` callback
4. Authorize makes POST to API `/auth/login`
5. API verifies credentials via Firebase Auth
6. API returns user data
7. NextAuth stores JWT token and creates session
8. Protected routes check `authorized()` callback
9. Routes starting with `/dashboard` require isLoggedIn

**State Management:**

- **Client State:** React Query (TanStack) for server state, React hooks for UI state
- **Server State:** Firestore for persistent data, Firebase Auth for identity
- **Session State:** NextAuth JWT tokens stored in session cookie
- **Query Cache:** React Query with 1-minute stale time, no auto-refetch on focus

## Key Abstractions

**IRepository Interface:**
- Purpose: Define CRUD contract for data access
- Examples: `apps/api/src/repositories/base.repository.ts`
- Pattern: Generic interface with findById, findAll, create, update, delete methods
- Implementations: UserRepository

**UserEntity Class:**
- Purpose: Encapsulate user domain logic with type safety
- Examples: `apps/api/src/models/user.model.ts`
- Pattern: Constructor takes User interface, static create() for initialization, update() for modifications, toJSON() for serialization

**ApiResponse Generic:**
- Purpose: Standardize all API responses with consistent shape
- Examples: `apps/api/src/types/common.ts`
- Pattern: `{ success: boolean; data?: T; error?: string; message?: string }`

**Use Case Classes:**
- Purpose: Encapsulate single business operations
- Examples: `GetUserUseCase`, `CreateUserUseCase`, `ListUsersUseCase`
- Pattern: Single async execute() method, dependency injection via imports

**PaginatedResult Generic:**
- Purpose: Standardize paginated list responses
- Examples: `apps/api/src/types/common.ts`
- Pattern: `{ data: T[]; nextCursor?: string; hasMore: boolean }`

## Entry Points

**Backend (Firebase Functions):**
- Location: `apps/api/src/index.ts`
- Triggers: HTTP requests to Firebase Functions endpoint
- Responsibilities: Convert Express requests to Web Request format, route to Hono app, handle global middleware (CORS, logging)
- Exports: `api` HttpsFunction for firebase deploy

**Frontend (Next.js App):**
- Location: `apps/web/src/app/layout.tsx` and `apps/web/src/app/page.tsx`
- Triggers: Browser navigation to localhost:3000
- Responsibilities: Initialize providers (session, query, analytics), render root layout, serve pages
- Root layout nests SessionProvider → QueryProvider → AnalyticsProvider → TooltipProvider

**API Routes (Next.js):**
- Location: `apps/web/src/app/api/auth/[...nextauth]/route.ts` and `apps/web/src/app/api/v1/auth/login/route.ts`
- Triggers: HTTP POST/GET from client
- Responsibilities: NextAuth integration, login delegation

## Error Handling

**Strategy:** Typed error responses with HTTP status codes, try-catch blocks returning null/false on failure

**Patterns:**
- **404 Errors:** Route returns `{ success: false, error: "Not found" }` with status 404
- **Validation Errors:** Use case returns `{ success: false, error: "Email already exists" }` with status 400
- **Auth Errors:** Middleware returns `{ success: false, error: "Unauthorized" }` with status 401
- **Null Safety:** Repository methods return null on missing entities, routes check null and return 404
- **ApiError Class:** `apps/web/src/lib/api.ts` extends Error with status and statusText for fetch errors
- **FetchError:** Custom error in fetcher for typed error handling

## Cross-Cutting Concerns

**Logging:**
- Hono logger middleware logs all requests at `app.use("*", logger())`
- Browser console logging via `console.log()` and `console.error()`

**Validation:**
- Zod schemas for form data (e.g., loginSchema in `apps/web/src/lib/auth/config.ts`)
- DTO validation at use case entry points
- Type safety via TypeScript interfaces

**Authentication:**
- NextAuth with Credentials provider for session management
- Firebase Admin Auth for backend token verification
- Bearer token in Authorization header for API calls
- JWT stored in httpOnly cookie by NextAuth

