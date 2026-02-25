# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**
- PascalCase for React components: `useAuth.ts`, `UserRepository.ts`
- kebab-case for routes and feature directories: `user.route.ts`, `auth.middleware.ts`
- camelCase for utility files and hooks: `fetcher.ts`, `use-auth.ts`
- Use descriptive suffixes for domain objects:
  - `.route.ts` for Hono routes (`user.route.ts`, `health.route.ts`)
  - `.service.ts` for service classes (`auth.service.ts`, `storage.service.ts`)
  - `.repository.ts` for data access objects (`user.repository.ts`)
  - `.usecase.ts` for business logic use cases (`create-user.usecase.ts`)
  - `.model.ts` for domain entities (`user.model.ts`)
  - `.middleware.ts` for middleware functions (`auth.middleware.ts`)
  - `.tsx` for React components, `.ts` for non-component files

**Functions:**
- camelCase for function names: `verifyToken()`, `findByEmail()`, `mapToEntity()`
- PascalCase for class names: `CreateUserUseCase`, `UserRepository`, `AuthService`
- Use verb prefixes for functions: `get`, `find`, `create`, `update`, `delete`, `list`, `verify`
- Use descriptive names for React hooks: `useAuth()`, `useLogin()`, `useRegister()`, `useForgotPassword()`

**Variables:**
- camelCase for variables: `userRepository`, `authService`, `createUserUseCase`
- Singleton instances exported from modules use lowercase: `userRepository`, `authService`
- Use descriptive variable names, avoid single letters except in loops
- Interface instances: `const userRepository = new UserRepository();`

**Types:**
- PascalCase for interfaces: `User`, `CreateUserDTO`, `ApiResponse`, `AuthUser`
- Use `DTO` suffix for Data Transfer Objects: `CreateUserDTO`, `UpdateUserDTO`
- Use generic naming for common patterns: `IRepository<T, CreateDTO, UpdateDTO>`
- Add `Result` suffix for operation result types: `CreateUserResult`, `UpdateUserResult`

## Code Style

**Formatting:**
- ESLint with Next.js config for web app (`eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`)
- ESLint ^9.0.0 for API
- Default spacing: 2 spaces indentation (inferred from file structure)
- No explicit Prettier config detected; formatting relies on ESLint

**Linting:**
- Web app uses `eslint` ^9 with Next.js configuration
- API uses `eslint` ^9.0.0
- Run linting with `npm run lint` (or `pnpm --filter <app> run lint`)

## Import Organization

**Order:**
1. External library imports (React, Next.js, third-party packages)
2. Type imports from external libraries
3. Internal project imports from `./` or `@/`
4. Type imports from internal modules

**Pattern:**
```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context, Next } from "hono";

import { userRepository } from "../../repositories/index.js";
import type { CreateUserDTO, User } from "../../types/index.js";
```

**Path Aliases:**
- Web app: `@/*` → `./src/*` (via `tsconfig.json` paths)
- Use alias imports for cleaner paths: `import { cn } from "@/lib/utils"`

**Module Extensions:**
- Include `.js` extension in relative imports for ESM compatibility: `from "../../types/index.js"`
- Use barrel files (`index.ts`) for clean exports from modules

## Error Handling

**Patterns:**
- Try-catch for async operations in services, returning null or error states
- No exceptions thrown directly; use result objects with `success: boolean`
- Result types encapsulate success/error state:
```typescript
export interface CreateUserResult {
  success: boolean;
  user?: User;
  error?: string;
}
```

- Routes check result.success and return appropriate HTTP status codes
- Null returns indicate resource not found; services return `null` on catch
- Global error handler in Hono app logs errors and returns generic 500 response

## Logging

**Framework:** `console` for basic logging, Hono's built-in `logger()` middleware

**Patterns:**
- Use `console.error()` for errors in error handlers
- Hono middleware automatically logs HTTP requests/responses
- No structured logging or custom logging service; use console where needed
- Error context: `console.error("Error:", err)` in global error handler

## Comments

**When to Comment:**
- Comment non-obvious logic or business rules
- Use comments for explaining Hono context extensions (see `auth.middleware.ts` line 4-7)
- Avoid commenting obvious code; code should be self-documenting through naming

**JSDoc/TSDoc:**
- Interfaces are self-documenting through property names
- No JSDoc requirements observed; TypeScript types provide sufficient documentation
- Add JSDoc if function behavior is non-obvious

## Function Design

**Size:** Keep functions focused on single responsibility (50-100 lines typical)

**Parameters:**
- Use single object parameter for functions with multiple arguments
- DTOs for data transfer: `execute(dto: CreateUserDTO): Promise<...>`
- Use generic type parameters for reusable patterns: `IRepository<T, CreateDTO, UpdateDTO>`

**Return Values:**
- Async functions return Promise with typed result
- Use result objects with success flag instead of throwing exceptions
- Return null for "not found" scenarios
- Service methods may throw (wrapped in try-catch by caller)

## Module Design

**Exports:**
- Barrel files (`index.ts`) export grouped functionality: `export * from "./user.js";`
- Export both class and singleton instance from service files:
```typescript
export class AuthService { ... }
export const authService = new AuthService();
```
- Routes exported as `export { userRoute };` (named export)

**Barrel Files:**
- Use barrel files in `repositories/`, `services/`, `usecases/user/` directories
- Simplifies imports: `import { userRepository } from "../../repositories/index.js"`
- Group related exports together

**Dependency Pattern:**
- Services and repositories are singletons instantiated in module
- Usecases depend on repositories, routes depend on usecases
- Factories create instances, exported as singletons for DI-like behavior

## TypeScript Configuration

**Compiler Options:**
- API: `target: ES2022`, `module: NodeNext` (Firebase Functions environment)
- Web: `target: ES2017`, `module: esnext` (browser and bundler)
- Both: `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`
- Declarations enabled on API (`declaration: true`) for lib output

---

*Convention analysis: 2026-02-25*
