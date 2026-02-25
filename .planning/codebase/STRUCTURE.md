# Codebase Structure

**Analysis Date:** 2026-02-25

## Directory Layout

```
klayim/
├── apps/
│   ├── api/                    # Backend API (Hono + Firebase Functions)
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point, Hono app setup, routes registration
│   │   │   ├── middleware/     # Cross-cutting concerns
│   │   │   ├── types/          # API-specific types (extends shared types)
│   │   │   ├── models/         # Domain entities (UserEntity)
│   │   │   ├── repositories/   # Data access layer
│   │   │   ├── services/       # Business logic (AuthService, StorageService)
│   │   │   ├── usecases/       # Application workflows
│   │   │   │   └── user/       # User CRUD use cases
│   │   │   ├── routes/         # HTTP route handlers
│   │   │   └── lib/            # Infrastructure (Firebase, utilities)
│   │   ├── lib/                # Compiled JavaScript output
│   │   ├── package.json        # Hono, Firebase Functions, bcryptjs
│   │   ├── tsconfig.json       # TypeScript config with path aliases (@/*)
│   │   └── firebase.json       # Firebase project config
│   │
│   └── web/                    # Frontend (Next.js 16 + React 19)
│       ├── src/
│       │   ├── app/            # Next.js App Router pages and layouts
│       │   │   ├── page.tsx    # Home/landing page
│       │   │   ├── layout.tsx  # Root layout with providers
│       │   │   └── api/v1/     # Backend-for-frontend routes
│       │   │       └── auth/   # Auth endpoints (login, register, etc.)
│       │   ├── components/     # React components
│       │   │   ├── ui/         # Shadcn UI component library
│       │   │   └── providers/  # Context providers
│       │   ├── hooks/          # Custom React hooks (useAuth, useMobile)
│       │   ├── lib/
│       │   │   ├── api.ts      # Direct backend API client
│       │   │   ├── fetcher.ts  # BFF proxy fetcher (calls /api/v1)
│       │   │   ├── auth/       # NextAuth configuration
│       │   │   │   ├── config.ts  # Auth provider setup
│       │   │   │   └── index.ts   # Auth export
│       │   │   ├── firebase.ts # Firebase client SDK
│       │   │   └── utils.ts    # Utility functions
│       │   ├── middleware.ts   # NextAuth middleware for route protection
│       │   └── app/            # Global providers, layout
│       ├── public/             # Static assets
│       ├── .next/              # Next.js build output (not committed)
│       ├── package.json        # Next.js, React, React Query, NextAuth
│       ├── tsconfig.json       # TypeScript config with @/* alias
│       └── next.config.ts      # Next.js configuration
│
├── packages/
│   └── shared/                 # Shared types and schemas (published as @klayim/shared)
│       ├── src/
│       │   ├── types/
│       │   │   ├── index.ts       # Re-exports all types
│       │   │   ├── common.ts      # ApiResponse, PaginationParams, Timestamps
│       │   │   ├── user.ts        # User, UserProfile, CreateUserInput, UpdateUserInput
│       │   │   ├── organization.ts # Organization, OrganizationMember, OnboardingStatus
│       │   │   ├── auth.ts        # LoginInput, RegisterInput, AuthSession
│       │   │   └── subscription.ts # Subscription types (if present)
│       │   │
│       │   ├── schemas/
│       │   │   ├── index.ts       # Re-exports all schemas
│       │   │   ├── common.ts      # Common validation schemas
│       │   │   ├── user.ts        # Zod schemas for user validation
│       │   │   ├── organization.ts # Organization schemas
│       │   │   ├── auth.ts        # Auth schemas (loginSchema, registerSchema)
│       │   │   └── subscription.ts # Subscription schemas (if present)
│       │   │
│       │   └── index.ts        # Main export (types and schemas)
│       ├── package.json        # Zod dependency
│       └── tsconfig.json       # Shared TypeScript config
│
├── .planning/
│   └── codebase/              # GSD analysis documents
│       ├── ARCHITECTURE.md    # This file: patterns, layers, data flow
│       ├── STRUCTURE.md       # File organization, key locations
│       ├── CONVENTIONS.md     # Coding style, naming
│       ├── TESTING.md         # Test patterns and frameworks
│       ├── CONCERNS.md        # Tech debt, known issues
│       ├── STACK.md           # Tech stack and versions
│       └── INTEGRATIONS.md    # External services
│
├── .firebase/
├── .git/
├── .github/                   # CI/CD workflows (if present)
├── node_modules/              # Workspace root dependencies
├── pnpm-lock.yaml            # Lockfile for all workspaces
├── pnpm-workspace.yaml       # Workspace configuration
├── package.json              # Root workspace config
├── tsconfig.json             # Root TypeScript base config
├── turbo.json                # Turborepo configuration
├── README.md                 # Project documentation
└── .env*, .firebaserc        # Configuration files (never commit secrets)
```

## Directory Purposes

**`apps/api/src/`:**
- Purpose: Backend API source code using Clean Architecture
- Contains: All layers (models, repositories, services, usecases, routes, middleware)
- Key files: `index.ts` (entry), `routes/*` (HTTP handlers), `services/*` (business logic)

**`apps/api/src/middleware/`:**
- Purpose: Middleware for cross-cutting concerns
- Contains: `auth.middleware.ts` (Bearer token validation), potentially CORS, logging
- Key files: `index.ts` (barrel export), `auth.middleware.ts` (authentication)

**`apps/api/src/types/`:**
- Purpose: Type definitions specific to backend API
- Contains: Re-exports from `@klayim/shared/types`, API-specific extensions (UserWithPassword, token types)
- Key files: `index.ts` (aggregates all types and re-exports)

**`apps/api/src/repositories/`:**
- Purpose: Data access layer abstraction
- Contains: Repository classes implementing CRUD operations against Firestore
- Key files:
  - `base.repository.ts` - `IRepository<T, CreateDTO, UpdateDTO>` interface
  - `user.repository.ts` - UserRepository with findByEmail, findByIdWithPassword, etc.
  - `token.repository.ts` - Token persistence for email verification and password reset

**`apps/api/src/models/`:**
- Purpose: Domain entities with business logic
- Contains: Entity classes representing core domain objects
- Key files: `user.model.ts` - UserEntity with create, update, setEmailVerified methods

**`apps/api/src/services/`:**
- Purpose: Business logic orchestration and external service interaction
- Contains: Service classes handling application workflows
- Key files:
  - `auth.service.ts` - login, register, password reset, email verification
  - `storage.service.ts` - File storage operations

**`apps/api/src/usecases/user/`:**
- Purpose: Application-specific workflows for User domain
- Contains: Individual use case classes following Single Responsibility Principle
- Key files:
  - `create-user.usecase.ts` - CreateUserUseCase
  - `get-user.usecase.ts` - GetUserUseCase
  - `update-user.usecase.ts` - UpdateUserUseCase
  - `delete-user.usecase.ts` - DeleteUserUseCase
  - `list-users.usecase.ts` - ListUsersUseCase

**`apps/api/src/routes/`:**
- Purpose: HTTP route handlers for Hono framework
- Contains: Route definitions matching Express/REST patterns
- Key files:
  - `auth.route.ts` - POST /login, /register, /forgot-password, /reset-password, /verify-email
  - `user.route.ts` - GET /, GET /:id, POST /, PATCH /:id, DELETE /:id
  - `health.route.ts` - Health check endpoint

**`apps/api/src/lib/`:**
- Purpose: Infrastructure and utilities
- Contains: Firebase Admin SDK initialization, utility functions
- Key files: `firebase.ts` - Firestore, Storage, RTDB, Auth initialization

**`apps/web/src/app/`:**
- Purpose: Next.js App Router pages and layouts
- Contains: Page components, layout components, API routes
- Key files:
  - `layout.tsx` - Root layout with providers
  - `page.tsx` - Home page
  - `api/v1/auth/*` - Backend-for-frontend routes proxying to backend API

**`apps/web/src/components/`:**
- Purpose: Reusable React components
- Contains: UI library components (Shadcn) and feature components
- Key files:
  - `ui/` - Shadcn UI component library (button, card, input, etc.)
  - `providers/` - Context providers (SessionProvider, QueryClientProvider, etc.)

**`apps/web/src/hooks/`:**
- Purpose: Custom React hooks for data fetching and state
- Contains: Hooks using React Query and NextAuth
- Key files:
  - `use-auth.ts` - useLogin, useRegister, useForgotPassword, useResetPassword, useVerifyEmail
  - `use-mobile.ts` - Mobile viewport detection

**`apps/web/src/lib/`:**
- Purpose: Utilities and configuration
- Contains: API clients, authentication setup, Firebase config
- Key files:
  - `api.ts` - Direct backend API client (for NextAuth provider)
  - `fetcher.ts` - BFF proxy fetcher (/api/v1/...)
  - `auth/config.ts` - NextAuth configuration with credentials provider
  - `firebase.ts` - Firebase client SDK initialization

**`packages/shared/src/types/`:**
- Purpose: Shared type definitions across all workspaces
- Contains: Domain types used by backend, frontend, and type safety
- Key files:
  - `user.ts` - User, UserProfile, CreateUserInput, UpdateUserInput
  - `organization.ts` - Organization, OrganizationMember, OnboardingStatus, OrganizationMemberRole
  - `auth.ts` - LoginInput, RegisterInput, AuthSession
  - `common.ts` - ApiResponse<T>, PaginationParams, PaginatedResult<T>

**`packages/shared/src/schemas/`:**
- Purpose: Zod validation schemas (single source of truth)
- Contains: Runtime validation rules for all DTOs
- Key files:
  - `user.ts` - createUserSchema, updateUserSchema with password requirements
  - `auth.ts` - loginSchema, registerSchema, passwordResetSchema
  - Same schemas used in: backend routes (zValidator), frontend NextAuth provider, form validation

## Key File Locations

**Entry Points:**
- Backend API: `apps/api/src/index.ts` - Hono app with Firebase Functions export
- Frontend App: `apps/web/src/app/page.tsx` - Home page
- Frontend Layout: `apps/web/src/app/layout.tsx` - Root layout with providers
- NextAuth Config: `apps/web/src/lib/auth/config.ts` - Credentials provider setup

**Configuration:**
- Backend TypeScript: `apps/api/tsconfig.json` - Path aliases (@/types, @/repositories, etc.)
- Frontend TypeScript: `apps/web/tsconfig.json` - Path alias (@/*)
- Backend Hono: `apps/api/src/index.ts` - CORS, middleware, route registration
- Frontend NextAuth: `apps/web/src/lib/auth/config.ts` - Credentials provider, callbacks, pages
- Firebase: `firebase.json` - Hosting, functions, emulator config

**Core Logic:**
- User Management: `apps/api/src/usecases/user/` (use cases), `apps/api/src/repositories/user.repository.ts` (data access)
- Authentication: `apps/api/src/services/auth.service.ts` (backend logic), `apps/web/src/lib/auth/config.ts` (frontend integration)
- API Contract: `packages/shared/src/types/` (types), `packages/shared/src/schemas/` (validation)

**Testing:**
- Backend tests: Not yet configured (would go in `apps/api/__tests__/` or `apps/api/src/**/*.test.ts`)
- Frontend tests: Not yet configured (would go in `apps/web/__tests__/` or `apps/web/src/**/*.test.tsx`)

## Naming Conventions

**Files:**
- Route handlers: `*.route.ts` (e.g., `user.route.ts`, `auth.route.ts`)
- Use cases: `kebab-case.usecase.ts` (e.g., `create-user.usecase.ts`, `delete-user.usecase.ts`)
- Repositories: `*.repository.ts` (e.g., `user.repository.ts`, `token.repository.ts`)
- Services: `*.service.ts` (e.g., `auth.service.ts`, `storage.service.ts`)
- Models: `*.model.ts` (e.g., `user.model.ts`)
- Middleware: `*.middleware.ts` (e.g., `auth.middleware.ts`)
- Types: `*.ts` in `types/` directory (e.g., `user.ts`, `auth.ts`)
- Schemas: `*.ts` in `schemas/` directory (e.g., `user.ts`, `auth.ts`)
- Components: PascalCase `.tsx` (e.g., `LoginForm.tsx`, `UserProfile.tsx`)
- Hooks: `use*` camelCase `.ts` (e.g., `use-auth.ts`, `use-mobile.ts`)

**Directories:**
- API routes: App Router structure mirrors REST hierarchy (e.g., `api/v1/auth/login/`)
- Use cases organized by domain: `usecases/user/`, would extend to `usecases/organization/`, etc.
- Components grouped by feature: `components/` contains UI library, feature components would go in `components/features/`
- Shared packages use scoped name: `@klayim/shared`

## Where to Add New Code

**New Feature (e.g., Organizations):**

Backend:
- Types: `packages/shared/src/types/organization.ts` (types already exist)
- Schemas: `packages/shared/src/schemas/organization.ts` (schemas already exist)
- Models: `apps/api/src/models/organization.model.ts` (new entity class)
- Repository: `apps/api/src/repositories/organization.repository.ts` (new data access layer)
- Service: `apps/api/src/services/organization.service.ts` (if complex business logic needed)
- Use Cases: `apps/api/src/usecases/organization/` (create, read, update, delete, list)
- Routes: `apps/api/src/routes/organization.route.ts` (HTTP endpoints)

Frontend:
- Hooks: `apps/web/src/hooks/use-organization.ts` (React Query mutations/queries)
- Components: `apps/web/src/components/organization/` (feature components)
- Pages: `apps/web/src/app/organizations/` (App Router pages)
- API Routes: `apps/web/src/app/api/v1/organization/` (BFF proxies if needed)

**New Component/Module:**

Path: `apps/web/src/components/` for reusable components

Naming:
- `components/LoginForm.tsx` - Feature component with clear purpose
- `components/ui/Button.tsx` - UI library component
- `components/providers/QueryProvider.tsx` - Provider components

**Utilities:**

Shared helpers: `apps/web/src/lib/` or `apps/api/src/lib/`

Examples:
- `apps/web/src/lib/utils.ts` - Frontend utilities
- `apps/api/src/lib/helpers.ts` - Backend helpers

## Special Directories

**`apps/api/lib/`:**
- Purpose: Compiled JavaScript output from TypeScript compilation
- Generated: Yes (from `tsc` build)
- Committed: No (in .gitignore)
- Build output of `src/` directory with tsc-alias path resolution

**`apps/web/.next/`:**
- Purpose: Next.js build artifacts and cache
- Generated: Yes (from `next build`)
- Committed: No (in .gitignore)
- Contains: Compiled pages, serverless functions, cache

**`packages/shared/src/`:**
- Purpose: Shared source code published as `@klayim/shared` package
- Generated: No
- Committed: Yes
- Used by: Both `apps/api` and `apps/web` via workspace dependency

**`.planning/codebase/`:**
- Purpose: GSD-generated codebase analysis documents
- Generated: Yes (by gsd:map-codebase orchestrator)
- Committed: Yes
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md, STACK.md, INTEGRATIONS.md

**`node_modules/` at root:**
- Purpose: Monorepo workspace dependencies
- Generated: Yes (from `pnpm install`)
- Committed: No (in .gitignore)
- Installed: All workspace root + app/package dependencies

---

*Structure analysis: 2026-02-25*
