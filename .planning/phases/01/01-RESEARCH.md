# Phase 1: User Onboarding - Research

**Researched:** 2026-02-26
**Domain:** User onboarding flows, multi-step forms, form validation, progress stepper UI
**Confidence:** HIGH

## Summary

Phase 1 implements user onboarding after email verification. The phase consists of two main screens: Account Details (name + password setup) and Organization Creation. Both screens share a progress stepper component showing the user's position in the onboarding flow.

The existing codebase already has strong foundations: TanStack Form with Zod validation patterns established in auth pages, shadcn/UI components including Field, Input, InputGroup with password visibility toggle, and a clean architecture backend with auth and organization services already supporting profile completion and organization creation.

The implementation requires: (1) a reusable Stepper component following the Figma design, (2) an Account Details form with real-time password requirements checklist, (3) an Organization Creation form with debounced name uniqueness checking, (4) state persistence to track onboarding progress and allow resume.

**Primary recommendation:** Build on existing auth patterns - use TanStack Form with Zod validators, leverage existing `completeProfile` and `createOrganization` API endpoints, and add a new organization name uniqueness check endpoint.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Account Form Design:**
- Single "Full Name" field (not first/last split)
- Live password checklist (real-time feedback as user types)
- Live confirm password match indicator (immediate visual confirmation)
- Eye toggle on both password fields
- Email field display only (not editable, from verification)
- Validation timing: on blur + submit
- Continue button: always enabled (submit to see what needs fixing)
- Loading state: disable form + spinner overlay
- Password requirements: 8+ chars, uppercase, number, special char
- Error messages below each field

**Progress Stepper:**
- Completed step: checkmark + filled background
- Step navigation: clickable completed steps
- Mobile: collapsed "Step X of Y" indicator

**Organization Creation:**
- Name validation: min 2 + max 50 chars + alphanumeric/spaces/hyphens
- Name uniqueness: globally unique
- Uniqueness check: real-time debounced check
- Creator role: owner

**Flow & Transitions:**
- After account details: go to Setup Organization
- After organization creation: go to Plan Selection (Phase 2)
- Page transitions: slide animations (left/right)
- Resume behavior: resume where user left off (track progress)

### Claude's Discretion
None specified - all gray areas resolved.

### Deferred Ideas (OUT OF SCOPE)
None specified.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UONB-01 | User can complete account details (name, password) after email verification | Existing `completeProfile` API endpoint, TanStack Form patterns from signin/signup pages, password validation schemas in shared package |
| UONB-02 | User can create organization with name during onboarding | Existing `createOrganization` API endpoint, organization schemas, need to add name uniqueness check endpoint |
| UONB-03 | User sees onboarding progress stepper (Create Account -> Account Details -> Setup Organization -> Onboarding) | Need new Stepper component, framer-motion available for animations |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-form | ^1.28.3 | Form state management | Already used in auth pages, tight TypeScript integration |
| zod | ^4.3.6 | Schema validation | Already used in shared package, full type inference |
| radix-ui | ^1.4.3 | Accessible primitives | Already used throughout UI components |
| framer-motion | ^12.34.3 | Animations | Already installed in root package.json for page transitions |
| lucide-react | ^0.575.0 | Icons | Already used for Eye/EyeOff in signin page |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | ^0.7.1 | Component variants | For stepper state styling (completed/active/pending) |
| tailwind-merge | ^3.5.0 | Class merging | Used in cn() utility |
| sonner | ^2.0.7 | Toast notifications | Success/error feedback after form submission |

### No Additional Packages Needed
The existing stack fully covers Phase 1 requirements. Do not add new dependencies.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── app/
│   └── onboarding/
│       ├── layout.tsx           # Onboarding layout with stepper
│       ├── account-details/
│       │   └── page.tsx         # Route page (thin wrapper)
│       └── setup-organization/
│           └── page.tsx         # Route page (thin wrapper)
├── components/
│   ├── pages/
│   │   └── onboarding/
│   │       ├── account-details/
│   │       │   └── index.tsx    # Account details form component
│   │       └── setup-organization/
│   │           └── index.tsx    # Organization creation component
│   ├── layouts/
│   │   └── onboarding/
│   │       └── index.tsx        # Onboarding layout with stepper
│   └── ui/
│       └── stepper.tsx          # Reusable stepper component
packages/shared/src/
├── schemas/
│   └── auth.ts                  # Already has completeProfileSchema
│   └── organization.ts          # May need org name validation schema
└── types/
    └── user.ts                  # Already has onboardingCompleted flag
```

### Pattern 1: TanStack Form with Zod Field Validation
**What:** Use field-level Zod validators with onChange/onBlur timing
**When to use:** All form fields in this phase
**Example:**
```typescript
// Source: Existing pattern from apps/web/src/components/pages/auth/signin/index.tsx
<form.Field
  name="password"
  validators={{
    onChange: ({ value }) => {
      const result = passwordSchema.safeParse(value);
      if (!result.success) {
        return result.error.errors[0]?.message;
      }
      return undefined;
    },
  }}
>
  {(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
    return (
      <Field data-invalid={isInvalid}>
        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
        <InputGroup className="h-11">
          <InputGroupInput
            id={field.name}
            type={showPassword ? "text" : "password"}
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            aria-invalid={isInvalid}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="icon-sm"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {isInvalid && <FieldError errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />}
      </Field>
    );
  }}
</form.Field>
```

### Pattern 2: Async Validation with Debounce
**What:** TanStack Form's built-in async debounce for uniqueness checks
**When to use:** Organization name uniqueness check
**Example:**
```typescript
// Source: https://tanstack.com/form/latest/docs/framework/react/guides/validation
<form.Field
  name="organizationName"
  asyncDebounceMs={300}
  validators={{
    onChange: ({ value }) => {
      // Sync validation first
      if (value.length < 2) return "Name must be at least 2 characters";
      if (value.length > 50) return "Name must be at most 50 characters";
      if (!/^[a-zA-Z0-9\s-]+$/.test(value)) return "Only letters, numbers, spaces, and hyphens allowed";
      return undefined;
    },
    onChangeAsync: async ({ value }) => {
      // Debounced API call for uniqueness
      const response = await fetch(`/api/v1/organizations/check-name?name=${encodeURIComponent(value)}`);
      const data = await response.json();
      if (!data.available) {
        return "Organization name already taken";
      }
      return undefined;
    },
  }}
>
  {/* ... */}
</form.Field>
```

### Pattern 3: Stepper State Management
**What:** Track step completion via URL routing + user/org state
**When to use:** Onboarding flow navigation
**Example:**
```typescript
// Steps definition
const ONBOARDING_STEPS = [
  { id: 'create-account', label: 'Create Account', href: '/auth/signup' },
  { id: 'account-details', label: 'Account Details', href: '/onboarding/account-details' },
  { id: 'setup-organization', label: 'Setup Organization', href: '/onboarding/setup-organization' },
  { id: 'onboarding', label: 'Onboarding', href: '/onboarding/overview' },
] as const;

// Step state derived from user data
function getStepStatus(step: string, user: User, org: Organization | null) {
  if (step === 'create-account') return 'completed'; // Always done if they're here
  if (step === 'account-details') return user.onboardingCompleted ? 'completed' : 'current';
  if (step === 'setup-organization') return org ? 'completed' : user.onboardingCompleted ? 'current' : 'pending';
  if (step === 'onboarding') return org ? 'current' : 'pending';
  return 'pending';
}
```

### Pattern 4: Framer Motion Page Transitions
**What:** Slide animations between onboarding steps
**When to use:** Navigation between account-details and setup-organization
**Example:**
```typescript
// Source: framer-motion docs
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'tween', duration: 0.3 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    transition: { type: 'tween', duration: 0.3 },
  }),
};

// In layout
<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={pathname}
    custom={direction}
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
  >
    {children}
  </motion.div>
</AnimatePresence>
```

### Anti-Patterns to Avoid
- **Global form state for multi-step:** Don't use React Context to share form state across steps. Each step has its own form that submits to API.
- **Client-only validation for uniqueness:** Always validate uniqueness server-side. Client-side is for UX feedback only.
- **Storing passwords in state longer than needed:** Submit password immediately, don't persist in any state management.
- **Blocking navigation on incomplete steps:** Allow back navigation to completed steps per user decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management | Custom useState/useReducer | TanStack Form | Handles touched, dirty, validation state, async validation |
| Password validation | Custom regex checks | Zod schema from shared package | Already defined, type-safe, consistent with API |
| Debouncing | setTimeout/clearTimeout | TanStack Form asyncDebounceMs | Built-in, handles race conditions properly |
| Stepper UI | Custom divs with manual state | CVA-styled component | Consistent styling, accessible |
| Page transitions | CSS transitions | framer-motion AnimatePresence | Handles enter/exit, direction, accessibility |
| Toast notifications | Custom toast component | sonner | Already installed, handles stacking, accessibility |

**Key insight:** The project already has the right tools installed. Reuse existing patterns from auth pages rather than inventing new ones.

## Common Pitfalls

### Pitfall 1: Race Conditions in Async Validation
**What goes wrong:** User types fast, multiple API calls fire, older response returns after newer one
**Why it happens:** Debouncing alone doesn't cancel in-flight requests
**How to avoid:** TanStack Form's asyncDebounceMs handles this - it cancels pending validations when new input arrives
**Warning signs:** "Name already taken" error flashes then disappears

### Pitfall 2: Password Validation Mismatch Frontend/Backend
**What goes wrong:** Frontend says password is valid, backend rejects it
**Why it happens:** Different validation rules or regex differences
**How to avoid:** Import `passwordSchema` from `@klayim/shared/schemas` on both ends - it's already done
**Warning signs:** Form submits but API returns 400 with password error

### Pitfall 3: Lost Onboarding Progress on Page Refresh
**What goes wrong:** User refreshes, loses their progress, starts over
**Why it happens:** Relying on client state instead of persisted state
**How to avoid:** Check user.onboardingCompleted and org existence on mount, redirect to correct step
**Warning signs:** Users complaining about redoing steps

### Pitfall 4: Confirm Password Sync Issues
**What goes wrong:** User changes original password, confirm password doesn't revalidate
**Why it happens:** Confirm field doesn't know original field changed
**How to avoid:** Use form.Subscribe or form-level validation that checks both fields
**Warning signs:** Passwords match indicator shows green but passwords don't actually match

### Pitfall 5: Organization Name Edge Cases
**What goes wrong:** Names like "   " (spaces only) or "--test--" pass validation
**Why it happens:** Regex allows spaces/hyphens without requiring alphanumeric content
**How to avoid:** Add trim() before validation, require at least one alphanumeric character
**Warning signs:** Empty-looking organization names in database

### Pitfall 6: Mobile Stepper Takes Too Much Space
**What goes wrong:** On mobile, horizontal stepper pushes form content below fold
**Why it happens:** Desktop stepper design doesn't adapt to mobile
**How to avoid:** Per user decision: show "Step X of Y" text on mobile instead of full stepper
**Warning signs:** Users scroll past stepper to find form

## Code Examples

Verified patterns from existing codebase:

### Password Field with Visibility Toggle
```typescript
// Source: apps/web/src/components/pages/auth/signin/index.tsx
const [showPassword, setShowPassword] = useState(false);

<InputGroup className="h-11">
  <InputGroupInput
    id={field.name}
    name={field.name}
    type={showPassword ? "text" : "password"}
    placeholder="Enter your password"
    value={field.state.value}
    onChange={(e) => field.handleChange(e.target.value)}
    onBlur={field.handleBlur}
    disabled={isLoading}
    aria-invalid={isInvalid}
  />
  <InputGroupAddon align="inline-end">
    <InputGroupButton
      type="button"
      size="icon-sm"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </InputGroupButton>
  </InputGroupAddon>
</InputGroup>
```

### Password Requirements Checklist Component
```typescript
// New component to build
interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="space-y-1 text-sm">
      {requirements.map((req) => {
        const met = req.test(password);
        return (
          <li key={req.label} className={cn("flex items-center gap-2", met ? "text-green-600" : "text-muted-foreground")}>
            {met ? <Check className="size-4" /> : <Circle className="size-4" />}
            {req.label}
          </li>
        );
      })}
    </ul>
  );
}
```

### Existing Password Schema (Use This)
```typescript
// Source: packages/shared/src/schemas/auth.ts
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// NOTE: User decision adds special character requirement - need to extend schema
export const onboardingPasswordSchema = passwordSchema
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character");
```

### API Call Pattern for Complete Profile
```typescript
// Source: apps/web/src/components/pages/auth/signup/index.tsx (adapted)
const handleSubmit = async (values: { name: string; password: string }) => {
  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch("/api/v1/auth/complete-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const data = await response.json();

    if (data.success) {
      router.push("/onboarding/setup-organization");
    } else {
      setError(data.error || "Failed to complete profile");
    }
  } catch {
    setError("Something went wrong. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
```

### Organization Name Schema (Need to Create)
```typescript
// Add to packages/shared/src/schemas/organization.ts
export const organizationNameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be at most 50 characters")
  .regex(/^[a-zA-Z0-9\s-]+$/, "Only letters, numbers, spaces, and hyphens allowed")
  .refine((val) => /[a-zA-Z0-9]/.test(val), "Name must contain at least one letter or number");
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Hook Form | TanStack Form | 2024-2025 | Project already uses TanStack Form - stick with it |
| useDebounce hooks | TanStack Form asyncDebounceMs | 2025 | Built-in debouncing, no extra hooks needed |
| Context-based multi-step | URL-based navigation | 2024+ | Cleaner, bookmarkable, SSR-friendly |

**Deprecated/outdated:**
- Don't use `react-hook-form` patterns - project is standardized on TanStack Form
- Don't use custom debounce hooks - TanStack Form has built-in support

## Open Questions

1. **Special character requirement not in existing schema**
   - What we know: User decided 8+ chars, uppercase, number, special char
   - What's unclear: Existing passwordSchema doesn't require special character
   - Recommendation: Create `onboardingPasswordSchema` that extends `passwordSchema` with special char requirement

2. **Organization name uniqueness endpoint doesn't exist**
   - What we know: User wants real-time debounced uniqueness check
   - What's unclear: Should this be a separate endpoint or use existing slug check?
   - Recommendation: Add `GET /api/v1/organizations/check-name?name=X` endpoint that calls `organizationRepository.findBySlug()` (names become slugs)

3. **Session handling during onboarding**
   - What we know: User just verified email, needs to complete profile
   - What's unclear: How does auth middleware work for incomplete users?
   - Recommendation: Check existing NextAuth configuration - likely need to handle users with `status: "pending"`

## Sources

### Primary (HIGH confidence)
- `/apps/web/src/components/pages/auth/signin/index.tsx` - Existing form patterns with TanStack Form
- `/apps/web/src/components/pages/auth/signup/index.tsx` - Existing API call patterns
- `/packages/shared/src/schemas/auth.ts` - Password and profile validation schemas
- `/apps/api/src/services/auth.service.ts` - completeProfile endpoint implementation
- `/apps/api/src/services/organization.service.ts` - createOrganization endpoint implementation
- Figma designs at `/Users/ardiansyahiqbal/Downloads/onboading-klayim/01_account_detail.png` and `02_setup_org.png`

### Secondary (MEDIUM confidence)
- [TanStack Form Validation Docs](https://tanstack.com/form/latest/docs/framework/react/guides/validation) - Async validation with debounce
- [shadcn/ui TanStack Form](https://ui.shadcn.com/docs/forms/tanstack-form) - Integration patterns

### Tertiary (LOW confidence)
- Web search on stepper patterns - verify against existing component patterns in project

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and used
- Architecture: HIGH - follows existing patterns in codebase
- Pitfalls: MEDIUM - based on common issues, some project-specific validation needed

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable patterns, low change risk)
