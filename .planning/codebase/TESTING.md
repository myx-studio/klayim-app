# Testing Patterns

**Analysis Date:** 2026-02-25

## Test Framework

**Runner:**
- Not detected - No test runner configured (Jest, Vitest, etc. not found in devDependencies)

**Assertion Library:**
- Not applicable - No testing framework installed

**Run Commands:**
- No test scripts defined in package.json files
- Testing infrastructure not yet implemented

## Test File Organization

**Location:**
- No test files found in codebase (0 `.test.*` or `.spec.*` files)

**Naming Convention:**
- Not established - No test files present to reference

**Structure:**
- Not established - Testing structure not yet defined

## Test Structure

**Current State:**
- No test suites exist in this codebase
- Code is structured to be testable (separation of concerns with services, repositories, middleware)

**Future Patterns (Recommended based on architecture):**

For services (`apps/api/src/services/`):
```typescript
describe("AuthService", () => {
  describe("login", () => {
    it("should return user profile on valid credentials", async () => {
      // Arrange
      const input = { email: "test@example.com", password: "ValidPass123" };
      // Act
      const result = await authService.login(input);
      // Assert
      expect(result).toEqual({ user: expect.objectContaining({ id: expect.any(String) }) });
    });

    it("should return null on invalid credentials", async () => {
      // Arrange
      const input = { email: "test@example.com", password: "WrongPassword" };
      // Act
      const result = await authService.login(input);
      // Assert
      expect(result).toBeNull();
    });
  });
});
```

For repositories (`apps/api/src/repositories/`):
```typescript
describe("UserRepository", () => {
  describe("findByEmail", () => {
    it("should return user when email exists", async () => {
      const user = await userRepository.findByEmail("test@example.com");
      expect(user).toBeDefined();
      expect(user?.email).toBe("test@example.com");
    });
  });
});
```

For API routes (`apps/api/src/routes/`):
```typescript
describe("Auth Routes", () => {
  describe("POST /login", () => {
    it("should validate request body with Zod schema", async () => {
      // Should fail validation
      const response = await testClient.post("/auth/login")
        .send({ email: "invalid", password: "" });
      expect(response.status).toBe(400);
    });
  });
});
```

For hooks (`apps/web/src/hooks/`):
```typescript
describe("useLogin", () => {
  it("should call signIn with credentials", async () => {
    const { result } = renderHook(() => useLogin());
    await act(async () => {
      result.current.mutate({ email: "test@example.com", password: "ValidPass123" });
    });
  });
});
```

## Mocking

**Framework:**
- Not configured - No mocking library installed (Vitest, Jest, or MSW)

**Patterns (Recommended for future):**

For API calls in hooks:
```typescript
// Mock the fetcher function
jest.mock("@/lib/fetcher", () => ({
  fetcher: jest.fn(),
  FetchError: class FetchError extends Error {},
}));
```

For Firebase in API:
```typescript
jest.mock("@/lib/firebase", () => ({
  firestore: mockFirestore,
  storage: mockStorage,
  auth: mockAuth,
}));
```

For Hono routes:
```typescript
// Use Hono's test client pattern
const res = await hono.request(new Request("http://localhost/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
}));
```

**What to Mock:**
- External services: Firebase (Firestore, Auth, Storage)
- HTTP clients: `fetcher` function and API calls
- Date/time: Use `jest.useFakeTimers()` for token expiration tests
- Password hashing: Can mock `bcrypt` for unit tests (use real bcrypt for integration tests)

**What NOT to Mock:**
- Zod validation - Test real validation logic
- Pure utility functions - `cn()`, path helpers
- Repository interfaces - Mock the database, not the interface
- Business logic in services - Test actual logic, mock external dependencies only

## Fixtures and Factories

**Test Data:**
- Not implemented - No fixtures or factories created yet

**Recommended Patterns:**

For test data factories:
```typescript
// tests/factories/user.factory.ts
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: "test-user-1",
    email: "test@example.com",
    name: "Test User",
    type: "customer",
    status: "active",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockUserWithPassword(password: string): UserWithPassword {
  return {
    ...createMockUser(),
    passwordHash: "hashed_password",
  };
}
```

For test schema data:
```typescript
// tests/fixtures/auth.fixtures.ts
export const validLoginInput: LoginInput = {
  email: "test@example.com",
  password: "ValidPass123",
};

export const invalidEmailInput = {
  email: "invalid-email",
  password: "ValidPass123",
};
```

**Location (Recommended):**
- `apps/api/src/__tests__/` - API tests
- `apps/api/src/__tests__/fixtures/` - Test data and factories
- `apps/web/src/__tests__/` - Web tests
- `packages/shared/src/__tests__/` - Schema validation tests

## Coverage

**Requirements:**
- Not enforced - No coverage configuration or thresholds set
- Not monitored - No coverage reports generated

**View Coverage (Recommended for future):**
```bash
# If Jest is added
npm test -- --coverage

# If Vitest is used
npm test -- --coverage
```

## Test Types

**Unit Tests (Recommended):**
- Test individual functions: Service methods, repository queries, utility functions
- Mock external dependencies: Firebase, HTTP calls
- Focus: Business logic correctness, error handling
- File location: Colocated with source or in `__tests__` directory

**Integration Tests (Recommended):**
- Test interaction between layers: Service + Repository, Route + Service
- Use test database (Firebase Emulator)
- Mock only external services (SendGrid for emails, etc.)
- Verify: Data flow, error propagation, state changes

**E2E Tests:**
- Not implemented - No E2E testing framework installed
- Could use: Playwright, Cypress, or WebDriver
- Scope: User workflows (login, register, password reset, email verification)

## Common Patterns

**Async Testing (Recommended):**
```typescript
// Using async/await with Jest
it("should login user successfully", async () => {
  const result = await authService.login({
    email: "test@example.com",
    password: "ValidPass123",
  });
  expect(result).toBeDefined();
});

// Using done callback
it("should handle async errors", (done) => {
  authService.login({ email: "test", password: "test" }).catch((err) => {
    expect(err).toBeDefined();
    done();
  });
});
```

**Error Testing (Recommended):**
```typescript
// For service methods returning { success: boolean; error?: string }
it("should return error for invalid token", async () => {
  const result = await authService.resetPassword("invalid-token", "NewPass123");
  expect(result.success).toBe(false);
  expect(result.error).toBe("Invalid or expired token");
});

// For functions throwing errors
it("should throw FetchError on failed request", async () => {
  jest.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  );

  await expect(fetcher("/protected")).rejects.toThrow(FetchError);
});
```

**Validation Testing (Recommended):**
```typescript
// Test Zod schemas
it("should validate valid login input", () => {
  const result = loginSchema.safeParse({
    email: "test@example.com",
    password: "ValidPass123",
  });
  expect(result.success).toBe(true);
});

it("should reject invalid email", () => {
  const result = loginSchema.safeParse({
    email: "invalid-email",
    password: "ValidPass123",
  });
  expect(result.success).toBe(false);
  expect(result.error?.issues[0].path).toContain("email");
});

// Test API validation with Zod validator middleware
it("should return 400 for invalid request body", async () => {
  const response = await app.request(new Request("http://localhost/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "invalid", password: "" }),
  }));
  expect(response.status).toBe(400);
});
```

## Testing Architecture Patterns

**Repository Testing:**
```typescript
describe("UserRepository", () => {
  beforeEach(() => {
    // Clear database before each test
  });

  it("should implement IRepository interface", () => {
    const repo = new UserRepository();
    expect(repo.findById).toBeDefined();
    expect(repo.create).toBeDefined();
    expect(repo.update).toBeDefined();
    expect(repo.delete).toBeDefined();
  });
});
```

**Service Testing with Mocked Repository:**
```typescript
describe("AuthService", () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    authService = new AuthService(mockUserRepository);
  });

  it("should hash password during registration", async () => {
    const input: RegisterInput = {
      email: "new@example.com",
      password: "ValidPass123",
      name: "New User",
    };

    await authService.register(input);

    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: input.email,
        // passwordHash should be hashed, not plain password
        passwordHash: expect.not.stringContaining(input.password),
      })
    );
  });
});
```

**Middleware Testing:**
```typescript
describe("authMiddleware", () => {
  it("should reject request without Authorization header", async () => {
    const context = createMockContext({});
    const next = jest.fn();

    const result = await authMiddleware(context, next);

    expect(result).toBeDefined();
    expect(next).not.toHaveBeenCalled();
  });

  it("should set userId in context with valid token", async () => {
    const context = createMockContext({
      "authorization": "Bearer dGVzdC11c2VyLTE="  // base64("test-user-1")
    });
    const next = jest.fn();

    await authMiddleware(context, next);

    expect(context.get("userId")).toBe("test-user-1");
    expect(next).toHaveBeenCalled();
  });
});
```

---

*Testing analysis: 2026-02-25*

**Note:** This codebase currently lacks testing infrastructure. Priority should be adding Jest or Vitest with test setup, then incrementally adding tests for critical paths (auth, user management, API validation).
