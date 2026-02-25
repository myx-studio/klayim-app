# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**
- Components: `PascalCase.tsx` (e.g., `Button.tsx`, `Card.tsx`)
- Utilities: `camelCase.ts` (e.g., `cn.ts`, `utils.ts`)
- Hooks: `use[PascalCase].ts` (e.g., `useAuth.ts`, `useMobile.ts`)
- Routes: `camelCase.route.ts` in API (e.g., `auth.route.ts`, `user.route.ts`)
- Services: `camelCase.service.ts` (e.g., `auth.service.ts`)
- Repositories: `camelCase.repository.ts` (e.g., `user.repository.ts`)
- Models/Entities: `PascalCase.model.ts` or `PascalCase.entity.ts` (e.g., `UserEntity.ts`)
- Middleware: `camelCase.middleware.ts` (e.g., `auth.middleware.ts`)
- Schemas: `camelCase.ts` (e.g., `auth.ts`, `user.ts`)

**Functions:**
- Use camelCase for function names
- API route handlers use async arrow functions: `async (c) => {...}`
- Hooks use `use` prefix: `useAuth()`, `useLogin()`, `useForgotPassword()`
- Service methods use descriptive verbs: `login()`, `register()`, `forgotPassword()`, `resetPassword()`
- Repository methods: `findById()`, `findByEmail()`, `create()`, `update()`, `delete()`, `findAll()`

**Variables:**
- Use camelCase for all variable declarations
- Boolean variables/functions prefix with `is`, `has`, `can`: `isValid`, `hasMore`, `canDelete`
- Constants use UPPER_SNAKE_CASE: `SALT_ROUNDS = 12`, `MOBILE_BREAKPOINT = 768`
- React hooks state: `const [isMobile, setIsMobile]`

**Types:**
- Interfaces use PascalCase with `I` prefix for abstractions (optional): `IRepository<T, CreateDTO, UpdateDTO>`
- Type aliases use PascalCase: `type UserProfile = {...}`, `type ApiResponse<T> = {...}`
- Generic type parameters: Single uppercase letter or descriptive (`T`, `U`, `V`) or `CreateDTO`, `UpdateDTO`
- Exported types in shared package: `UserProfile`, `LoginInput`, `RegisterInput`, `ApiResponse`

## Code Style

**Formatting:**
- No specific formatter configured (no .prettierrc found)
- Use standard TypeScript/JavaScript whitespace (2-space indentation observed)
- Async/await preferred over `.then()` chains

**Linting:**
- ESLint v9 with Next.js recommended config (`eslint-config-next`)
- API uses basic ESLint v9 setup
- Shared package uses TypeScript strict mode without explicit ESLint config

**TypeScript Strict Mode:**
- **Web app** (`apps/web/tsconfig.json`): `strict: true`
- **API** (`apps/api/tsconfig.json`): `strict: true`
- **Shared package** (`packages/shared/tsconfig.json`): `strict: true`
- All codebases enforce strict null checking, type inference, and no implicit any

## Import Organization

**Order:**
1. External dependencies: `import { z } from "zod"`
2. Third-party libraries: `import { useMutation } from "@tanstack/react-query"`
3. Project absolute imports: `import { fetcher } from "@/lib/fetcher"`
4. Type imports: `import type { ApiResponse, User } from "@klayim/shared/types"`
5. Relative imports (rarely used due to aliases)

**Path Aliases:**
- Web: `@/*` → `./src/*` (e.g., `@/hooks/useAuth`, `@/lib/fetcher`, `@/components/ui/button`)
- API: Comprehensive aliases:
  - `@/*` → `./src/*`
  - `@/types/*` → `./src/types/*`
  - `@/models/*` → `./src/models/*`
  - `@/repositories/*` → `./src/repositories/*`
  - `@/services/*` → `./src/services/*`
  - `@/usecases/*` → `./src/usecases/*`
  - `@/routes/*` → `./src/routes/*`
  - `@/middleware/*` → `./src/middleware/*`
  - `@/lib/*` → `./src/lib/*`
- Shared package: No alias needed (direct path imports)

## Error Handling

**Patterns:**
- **Custom Error Classes**: `FetchError` extends `Error` with properties for status, statusText, and data
  - Location: `apps/web/src/lib/fetcher.ts`
  - Used for standardized fetch error handling
- **API Route Pattern**: Check result object for error property and return appropriate HTTP status
  ```typescript
  if ("error" in result) {
    return c.json<ApiResponse<null>>(
      { success: false, error: result.error },
      400
    );
  }
  ```
- **Service Layer Pattern**: Return `{ success: boolean; error?: string }` for auth operations
  ```typescript
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }>
  ```
- **Hook Pattern**: Throw `FetchError` on failed requests, caught by TanStack Query mutation error handlers
- **Try-catch**: Used in API route handlers for token validation, generic errors logged to console
- **Middleware Pattern**: Return error response early on auth failure, no throwing

## Logging

**Framework:** `console` (basic logging)

**Patterns:**
- Hono middleware logs requests: `app.use("*", logger())`
- Errors logged to console: `console.error("Error:", err)`
- Debug info logged in service methods: `console.log("Password reset token:", token.token)`
- No structured logging framework (Pino, Winston, etc.) in use

## Comments

**When to Comment:**
- TODO comments for incomplete work: `// TODO: Implement proper JWT verification`, `// TODO: Send verification email`
- Complex logic explanation: Comments added above algorithm sections
- API contract documentation: Response types documented with TypeScript types

**JSDoc/TSDoc:**
- Light usage observed
- Not extensively used throughout codebase
- Type annotations preferred over JSDoc comments

## Function Design

**Size:** Functions generally 10-50 lines per function in services and hooks

**Parameters:**
- Destructuring preferred for object parameters: `{ email, password }`
- Single object argument for complex data structures
- Generic type parameters for repositories: `IRepository<T, CreateDTO, UpdateDTO>`

**Return Values:**
- Promises commonly used: `Promise<T | null>`, `Promise<{ success: boolean; error?: string }>`
- Union types for success/error: `Promise<{ user: User } | { error: string }>`
- Async functions return wrapped data structure for error handling

## Module Design

**Exports:**
- Named exports preferred: `export const authService = new AuthService()`
- Re-exports in index files: `export * from "./types"`, `export { auth as authRoutes }`
- Type-only imports: `import type { User } from "@klayim/shared/types"`
- Single default export for routes: `export { auth as authRoutes }`

**Barrel Files:**
- Used for organizing exports: `/src/types/index.ts`, `/src/repositories/index.ts`
- Centralize dependencies: `/src/services/index.ts` exports `authService`, `storageService`
- Shared package uses barrel: `/packages/shared/src/index.ts` re-exports types and schemas

## Zod Validation Patterns

**Location:** `packages/shared/src/schemas/`

**Pattern:**
- Define reusable atoms: `emailSchema`, `passwordSchema`
- Compose into request schemas: `loginSchema`, `registerSchema`
- Use `.refine()` for cross-field validation: `confirmPassword` matches `newPassword`
- Export both schema and inferred type:
  ```typescript
  export const loginSchema = z.object({...});
  export type LoginInput = z.infer<typeof loginSchema>;
  ```

**API Validation:**
- Hono's `zValidator` middleware: `zValidator("json", loginSchema)`
- Validates incoming JSON and provides type-safe `c.req.valid("json")`
- Location: `apps/api/src/routes/auth.route.ts`

**Web Validation:**
- NextAuth config uses `loginSchema.safeParse(credentials)` for provider auth
- Hooks may validate data before sending
- Location: `apps/web/src/lib/auth/config.ts`

## API Response Format

**Standard Structure:** `ApiResponse<T>`

**Interface:**
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

**Error Response:**
```typescript
interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}
```

**Usage Patterns:**
- Success: `{ success: true, data: { user: UserProfile } }`
- Error: `{ success: false, error: "Invalid email or password" }`
- Info messages: `{ success: true, message: "Email verified successfully" }`
- All endpoints return typed `ApiResponse<T>` with appropriate HTTP status codes

## NextAuth Configuration

**Location:** `apps/web/src/lib/auth/config.ts`

**Pattern:**
- Single Credentials provider calling API login endpoint
- Uses shared `loginSchema` for validation
- Maps API response to NextAuth user object
- JWT and session callbacks to manage user data
- Route middleware defined in `authorized()` callback for dashboard protection
- Configuration exported for handler setup in route: `apps/web/src/app/api/auth/[...nextauth]/route.ts`

## TanStack Query Hook Pattern

**Location:** `apps/web/src/hooks/useAuth.ts`

**Pattern:**
```typescript
export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginInput) => {
      // Implementation
    },
  });
}
```

**Characteristics:**
- Each operation (login, register, forgot password, reset password, verify email) has dedicated hook
- Hooks return `useMutation` object with `.mutate()` and `.mutateAsync()` methods
- Error handling via throwing `FetchError` (caught by React Query)
- Data passed from hook to component for rendering
- No caching/query hooks observed yet (focused on mutations)

---

*Convention analysis: 2026-02-25*
