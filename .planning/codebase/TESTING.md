# Testing Patterns

**Analysis Date:** 2026-02-25

## Test Framework

**Runner:**
- Not detected - No jest.config.*, vitest.config.*, or test framework dependency found
- No test runner configured in either `apps/web` or `apps/api`

**Assertion Library:**
- Not applicable - No testing framework installed

**Run Commands:**
```bash
# No test commands configured
# Testing infrastructure not yet implemented
```

## Test File Organization

**Location:**
- No test files exist in source directories (`apps/web/src/`, `apps/api/src/`)
- No test framework discovered in package.json dependencies

**Naming:**
- Convention would be `.test.ts`, `.test.tsx`, or `.spec.ts` (inferred from industry standard)
- Not currently applied - no test files present

**Structure:**
```
# No test structure currently exists
# Recommended pattern (not yet implemented):
# src/
#   ├── features/
#   │   ├── feature.ts
#   │   └── feature.test.ts  (co-located tests)
```

## Test Structure

**Suite Organization:**
- Not yet established - testing framework not installed

**Patterns:**
- Would typically use describe blocks for test suites
- Individual test cases with meaningful names
- Setup/teardown for test data and mocks

## Mocking

**Framework:**
- Not implemented - No mocking library detected (jest, vitest, sinon, etc.)

**Patterns:**
- Recommended pattern for services: Mock repositories in service tests
- Recommended pattern for routes: Mock services and usecases in route tests
- Recommended pattern for repositories: Use in-memory data structures or test database

**What to Mock:**
- External dependencies: Firebase Admin SDK (auth, firestore)
- Database calls: Repository methods should return test data
- API calls: Network requests in service methods
- Middleware effects: Context modifications and side effects

**What NOT to Mock:**
- Pure utility functions
- Type definitions and interfaces
- Business logic in usecases (test actual logic, not mocks)
- Entity mapping logic

## Fixtures and Factories

**Test Data:**
- Not implemented - No fixture or factory pattern found

**Recommended Patterns:**
```typescript
// Would use factory functions for test data:
// const createTestUser = (overrides?: Partial<User>): User => ({
//   id: "test-id",
//   email: "test@example.com",
//   displayName: "Test User",
//   createdAt: new Date().toISOString(),
//   ...overrides,
// });
```

**Location:**
- Would be in `src/__fixtures__/` or `src/__mocks__/` directories (not yet created)
- Or co-located near test files

## Coverage

**Requirements:**
- None enforced - No coverage configuration detected

**View Coverage:**
```bash
# Not yet implemented
# Would typically run: npm run test:coverage
```

## Test Types

**Unit Tests:**
- **Scope:** Test individual functions and classes in isolation
- **Approach (recommended):**
  - Services: Test with mocked repositories
  - Repositories: Test with in-memory database or mock Firestore
  - Usecases: Test with mocked repositories, verify business logic
  - Utilities: Test pure functions with various inputs
  - Models: Test entity methods like `create()`, `update()`, `toJSON()`

**Integration Tests:**
- Not implemented
- **Recommended scope:** Test service + repository interaction with Firestore emulator
- **Recommended approach:** Use Firebase emulator for database testing

**E2E Tests:**
- Not implemented
- **Framework:** Playwright or Cypress would be candidates (not currently installed)
- **Scope:** Test user flows end-to-end (auth, CRUD operations, etc.)

## Common Patterns

**Async Testing:**
- Would use `async/await` in test functions
- Hono handlers are async - tests would `await handler(context)`

**Error Testing:**
- Services catch errors and return null or error states
- Test pattern: verify null return on exception
- Routes test error responses: check `response.success === false`
- Example (recommended):
```typescript
// Service with try-catch returns null on error
const result = await authService.verifyToken("invalid");
expect(result).toBeNull();

// Route returns error JSON
const response = { success: false, error: "Invalid token" };
expect(response.success).toBe(false);
```

**HTTP Route Testing:**
- Routes should be testable by mocking Hono context
- Verify request parsing, service calls, and response formatting
- Test both success and error paths for each HTTP method

## Current Testing Status

**Gap Analysis:**
- No unit tests for services (`auth.service.ts`, `storage.service.ts`)
- No tests for repositories (`user.repository.ts`)
- No tests for usecases (CRUD operations)
- No tests for API routes (`user.route.ts`, `health.route.ts`)
- No tests for React hooks (`use-auth.ts`)
- No tests for web components
- No integration tests with Firebase
- No E2E tests for user flows
- No test data factories or fixtures

**Priority Test Candidates:**
1. **High:** Auth service - `verifyToken()`, `createUser()`, `deleteUser()`
2. **High:** User repository - CRUD operations with Firestore
3. **High:** Usecases - Business logic validation
4. **Medium:** API routes - HTTP response formatting and status codes
5. **Medium:** React hooks - Login, register, password reset flows
6. **Low:** Utility functions - Pure helpers like `cn()` in `utils.ts`

## Recommendations

1. **Install test framework:** `vitest` (recommended for Hono and Next.js projects)
2. **Add assertion library:** `vitest` includes assertions; alternatively use `@testing-library/react` for components
3. **Add mocking:** Vitest has built-in mocking; use `vi.mock()` for external dependencies
4. **Set up Firebase emulator:** For integration testing with Firestore and Auth
5. **Create test utilities:**
   - Factory functions for creating test users, DTOs
   - Firebase emulator helpers for setup/teardown
   - Hono context builders for route testing
6. **Structure tests:** Co-locate test files with source files (`.test.ts` next to `.ts`)

---

*Testing analysis: 2026-02-25*
