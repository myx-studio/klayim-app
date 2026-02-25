# Codebase Structure

**Analysis Date:** 2026-02-25

## Directory Layout

```
klayim/
├── apps/                               # Monorepo workspaces
│   ├── api/                            # Firebase Functions backend
│   │   ├── src/
│   │   │   ├── index.ts                # Firebase Function entrypoint
│   │   │   ├── routes/                 # HTTP route handlers
│   │   │   ├── usecases/               # Business logic (use cases)
│   │   │   ├── repositories/           # Data access layer
│   │   │   ├── models/                 # Domain entities
│   │   │   ├── services/               # Firebase service wrappers
│   │   │   ├── middleware/             # Request processing middleware
│   │   │   ├── types/                  # TypeScript types and interfaces
│   │   │   └── lib/                    # Utilities and SDK initialization
│   │   ├── lib/                        # Compiled JavaScript output
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                            # Next.js frontend app
│       ├── src/
│       │   ├── app/                    # Next.js App Router pages
│       │   ├── components/             # React components (UI + providers)
│       │   ├── hooks/                  # Custom React hooks
│       │   ├── lib/                    # Utilities, API client, auth config
│       │   └── middleware.ts           # Next.js middleware
│       ├── public/                     # Static assets
│       ├── package.json
│       └── tsconfig.json
├── packages/                           # Shared packages (reserved)
├── package.json                        # Root workspace config
├── turbo.json                          # Turbo build orchestration
└── .planning/
    └── codebase/                       # Architecture documentation
```

## Directory Purposes

**apps/api/src/routes/:**
- Purpose: Define HTTP endpoints and request/response handling
- Contains: Route handlers using Hono framework
- Key files: `user.route.ts` (CRUD for users), `health.route.ts` (health check)
- Pattern: Each route file exports a Hono router instance

**apps/api/src/usecases/:**
- Purpose: Implement business logic for specific operations
- Contains: Use case classes with execute() method
- Key files: `user/create-user.usecase.ts`, `user/get-user.usecase.ts`, `user/update-user.usecase.ts`, `user/delete-user.usecase.ts`, `user/list-users.usecase.ts`
- Pattern: One use case per business operation, dependency injection via imports

**apps/api/src/repositories/:**
- Purpose: Abstract data access and Firestore interaction
- Contains: UserRepository implementing IRepository interface
- Key files: `user.repository.ts` (Firestore CRUD), `base.repository.ts` (interface definition)
- Pattern: Singleton pattern with firestore collection reference, private mapping methods

**apps/api/src/models/:**
- Purpose: Define domain entities with business methods
- Contains: Entity classes with initialization and transformation logic
- Key files: `user.model.ts` (UserEntity class)
- Pattern: Constructor takes interface, static create() factory, instance methods for mutations

**apps/api/src/services/:**
- Purpose: Wrap Firebase SDK and external services
- Contains: Auth and Storage service classes
- Key files: `auth.service.ts` (Firebase Auth operations), `storage.service.ts`
- Pattern: Singleton pattern with try-catch error handling

**apps/api/src/middleware/:**
- Purpose: Handle cross-cutting concerns (auth, logging, CORS)
- Contains: Middleware functions for Hono
- Key files: `auth.middleware.ts` (verify Bearer tokens)
- Pattern: Hono middleware signature (Context, Next) → Promise

**apps/api/src/types/:**
- Purpose: Define shared TypeScript interfaces and DTOs
- Contains: Type definitions for models, requests, responses
- Key files: `user.ts` (User, CreateUserDTO, UpdateUserDTO), `common.ts` (ApiResponse, PaginationParams)
- Pattern: Interfaces for domain types, DTO suffixes for request/input types

**apps/api/src/lib/:**
- Purpose: Utilities and SDK initialization
- Contains: Firebase initialization, helper functions
- Key files: `firebase.ts` (initialize Admin SDK), `index.ts` (exports)

**apps/web/src/app/:**
- Purpose: Next.js App Router pages and API routes
- Contains: Layout, pages, and API route handlers
- Key files: `layout.tsx` (root layout with providers), `page.tsx` (home page), `api/auth/[...nextauth]/route.ts` (NextAuth handler)
- Pattern: File-based routing, `route.ts` for API endpoints, `layout.tsx` for page layouts

**apps/web/src/components/:**
- Purpose: Reusable React components
- Contains: Providers and UI components
- Key files: `providers/query-provider.tsx` (React Query setup), `providers/session-provider.tsx` (NextAuth), `ui/` (shadcn/ui components)
- Pattern: Provider components for context setup, UI folder for styled base components

**apps/web/src/hooks/:**
- Purpose: Custom React hooks for business logic
- Contains: Auth mutations, mobile detection
- Key files: `use-auth.ts` (login, logout, register mutations)
- Pattern: Hooks return useMutation objects with typed mutationFn

**apps/web/src/lib/:**
- Purpose: Utilities, API client, auth configuration
- Contains: Fetch wrapper, Firebase client, NextAuth config
- Key files: `api.ts` (fetch wrapper with ApiError), `auth/config.ts` (NextAuth configuration), `fetcher.ts` (typed fetch helper), `firebase.ts` (Firebase client init)

## Key File Locations

**Entry Points:**
- `apps/api/src/index.ts`: Firebase Function main export, Hono app initialization, global middleware setup
- `apps/web/src/app/layout.tsx`: Root React component, provider nesting, global metadata
- `apps/web/src/middleware.ts`: Next.js request middleware (auth, redirects)

**Configuration:**
- `apps/api/tsconfig.json`: TypeScript config targeting ES2022, outputs to `./lib/`
- `apps/web/tsconfig.json`: Next.js TypeScript config with path alias `@/*` → `./src/*`
- `turbo.json`: Monorepo build configuration
- `apps/web/src/lib/auth/config.ts`: NextAuth provider and callback setup

**Core Logic:**
- `apps/api/src/repositories/user.repository.ts`: Firestore CRUD operations and data mapping
- `apps/api/src/usecases/user/`: Business logic for user operations
- `apps/api/src/routes/user.route.ts`: HTTP endpoints for user resource
- `apps/web/src/hooks/use-auth.ts`: Authentication mutations and state

**Testing:**
- Not detected - no test files present

## Naming Conventions

**Files:**
- Route files: `{entity}.route.ts` (e.g., `user.route.ts`)
- Use case files: `{operation}-{entity}.usecase.ts` (e.g., `create-user.usecase.ts`)
- Repository files: `{entity}.repository.ts` (e.g., `user.repository.ts`)
- Service files: `{service}.service.ts` (e.g., `auth.service.ts`)
- Hook files: `use-{name}.ts` (e.g., `use-auth.ts`)
- Component files: `{component}.tsx` (e.g., `query-provider.tsx`)
- Type files: `{entity}.ts` for domain types, `common.ts` for shared types
- Middleware files: `{name}.middleware.ts` (e.g., `auth.middleware.ts`)

**Directories:**
- Lowercase plural for collections: `routes`, `usecases`, `repositories`, `models`, `services`, `middleware`, `types`
- Entity-specific subdirectories: `usecases/user/`, `components/ui/`, `components/providers/`

**Functions:**
- camelCase for all functions
- Hooks start with `use` prefix (e.g., `useLogin`, `useRegister`)
- Use case classes: PascalCase (e.g., `CreateUserUseCase`)
- Service classes: PascalCase (e.g., `AuthService`)
- Repository classes: PascalCase (e.g., `UserRepository`)
- Entity classes: PascalCase with Entity suffix (e.g., `UserEntity`)

**Variables:**
- camelCase for const/let variables
- UPPERCASE with underscore for constants (e.g., `COLLECTION = "users"`)

**Types:**
- PascalCase for interfaces and types (e.g., `User`, `ApiResponse`, `CreateUserDTO`)
- DTO suffix for request/input types (e.g., `CreateUserDTO`, `UpdateUserDTO`)
- Result/Response suffix for output types (e.g., `CreateUserResult`)

## Where to Add New Code

**New Feature (e.g., Products CRUD):**
- API Routes: `apps/api/src/routes/product.route.ts`
- Business Logic: `apps/api/src/usecases/product/{operation}.usecase.ts`
- Data Access: `apps/api/src/repositories/product.repository.ts`
- Domain Model: `apps/api/src/models/product.model.ts`
- Types: Add `product.ts` to `apps/api/src/types/`
- Frontend Hook: `apps/web/src/hooks/use-products.ts` (if mutations needed)

**New Component/Module:**
- Reusable UI: `apps/web/src/components/ui/{name}.tsx`
- Feature Component: `apps/web/src/components/{feature}/{name}.tsx`
- Page/Route: `apps/web/src/app/{path}/page.tsx`
- API Handler: `apps/web/src/app/api/{path}/route.ts`

**Utilities:**
- Shared fetch/API logic: `apps/web/src/lib/{name}.ts`
- Custom hooks: `apps/web/src/hooks/use-{name}.ts`
- Middleware: `apps/api/src/middleware/{name}.middleware.ts`
- Services: `apps/api/src/services/{name}.service.ts`

## Special Directories

**apps/api/lib/:**
- Purpose: Compiled JavaScript output from TypeScript
- Generated: Yes (via `tsc` build command)
- Committed: No (in .gitignore)

**apps/web/.next/:**
- Purpose: Next.js build cache and compiled output
- Generated: Yes (via `next build` command)
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (via `pnpm install`)
- Committed: No (in .gitignore)

**packages/:**
- Purpose: Reserved for shared internal packages (monorepo feature)
- Generated: No
- Committed: Yes (reserved structure)

