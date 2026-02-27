# Phase 6: HRIS Integration - Research

**Researched:** 2026-02-27
**Domain:** HRIS API Integration, OAuth, CSV Parsing
**Confidence:** HIGH

## Summary

Phase 6 implements employee data import from HRIS systems (BambooHR, Rippling, Gusto) and CSV file uploads. The primary goal is to import employee names, emails, roles, departments, and hourly rates for meeting cost calculation.

**Key finding:** BambooHR supports direct OAuth 2.0 integration (deprecated OpenID Connect as of April 2025). Rippling and Gusto require Finch unified API as an intermediary since direct API access requires partner approval (4-12 weeks). The project already has the infrastructure foundation from Phase 4 (employee repository, integration repository, encryption).

**Primary recommendation:** Use BambooHR OAuth 2.0 directly for native integration, Finch unified API for Rippling/Gusto, and PapaParse for CSV processing. Follow the existing OAuth pattern established in Phase 5 (google/microsoft calendar).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HRIS-01 | User can connect BambooHR via OAuth | BambooHR OAuth 2.0 endpoints documented; follow Phase 5 OAuth pattern |
| HRIS-02 | User can connect Rippling via Finch unified API | Finch Connect SDK (@tryfinch/react-connect) for embedded auth flow |
| HRIS-03 | User can connect Gusto via Finch unified API | Same Finch integration as Rippling; both use unified data model |
| HRIS-04 | User can upload CSV as alternative | PapaParse (react-papaparse) for client-side parsing |
| HRIS-05 | System imports employee data (name, email, role, department, hourly rate) | BambooHR fields documented; Finch employment/individual endpoints; Employee repository ready |
| HRIS-06 | System calculates hourly rate from annual salary | Formula: hourlyRateCents = (annualSalary * 100) / 2080 |
| HRIS-07 | User sees "What we'll import" explanation before connecting | UI exists in connect-hris page; needs minor updates |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tryfinch/finch-api | latest | Finch backend SDK for HRIS API calls | Official Finch SDK, TypeScript support, unified data model |
| @tryfinch/react-connect | latest | Finch Connect embedded auth flow | Official React SDK for Finch Connect modal |
| react-papaparse | ^4.x | CSV parsing in React | Fastest browser-based CSV parser, TypeScript support, drag-drop components |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | existing | CSV row validation | Already in project; validate parsed CSV data |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Finch | Direct Rippling/Gusto API | Requires partner approval (4-12 weeks); deferred to v2 |
| react-papaparse | papaparse | react-papaparse adds drag-drop, progress bar |
| Custom BambooHR OAuth | Finch for BambooHR | BambooHR direct OAuth is simpler; no intermediary cost |

**Installation:**
```bash
# API package
cd apps/api && pnpm add @tryfinch/finch-api

# Web package
cd apps/web && pnpm add @tryfinch/react-connect react-papaparse
cd apps/web && pnpm add -D @types/papaparse
```

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/
  routes/oauth/
    bamboohr.ts          # BambooHR OAuth routes (authorize, callback)
    finch.ts             # Finch OAuth routes (session, callback)
  services/
    bamboohr.service.ts  # BambooHR API client
    finch.service.ts     # Finch API client
    employee-sync.service.ts  # Employee import logic
    hris-sync.service.ts # HRIS sync orchestration (NEW)

apps/web/src/
  lib/api/
    hris.ts              # HRIS API calls (extend existing integrations.ts)
    employees.ts         # Employee CRUD operations
  components/pages/onboarding/
    connect-hris/index.tsx  # UPDATE existing
    upload-csv/
      index.tsx           # EXISTING - file selection
      validate.tsx        # IMPLEMENT - preview/validation
      confirm.tsx         # IMPLEMENT - final import
```

### Pattern 1: HRIS OAuth Flow (BambooHR)

**What:** Standard OAuth 2.0 authorization code flow
**When to use:** BambooHR direct integration

```typescript
// BambooHR OAuth 2.0 endpoints
// Authorization: https://api.bamboohr.com/oauth/authorize
// Token: https://api.bamboohr.com/oauth/token

interface BambooHROAuthState {
  organizationId: string;
  redirectUrl: string;
  companyDomain: string; // BambooHR-specific: {companyDomain}.bamboohr.com
}

// Follow existing google-calendar.service.ts pattern
class BambooHRService {
  getAuthUrl(state: string, companyDomain: string): string {
    const params = new URLSearchParams({
      client_id: process.env.BAMBOOHR_CLIENT_ID!,
      redirect_uri: `${process.env.API_URL}/oauth/bamboohr/callback`,
      response_type: 'code',
      state,
    });
    return `https://api.bamboohr.com/oauth/authorize?${params}`;
  }
}
```

### Pattern 2: Finch Connect Embedded Flow

**What:** Finch Connect SDK for Rippling/Gusto authentication
**When to use:** All Finch-supported HRIS providers

```typescript
// Backend: Create Finch Connect session
// POST https://api.tryfinch.com/connect/sessions
const session = await finch.connectSessions.create({
  customerId: organizationId,
  customerName: organization.name,
  products: ['company', 'directory', 'individual', 'employment'],
  sandbox: process.env.NODE_ENV !== 'production',
});

// Frontend: Launch embedded Finch Connect
import { useFinchConnect } from '@tryfinch/react-connect';

const { open } = useFinchConnect({
  sessionId: sessionFromBackend,
  onSuccess: ({ code }) => handleFinchCallback(code),
  onError: ({ errorMessage }) => toast.error(errorMessage),
  onClose: () => setLoading(false),
});
```

### Pattern 3: Employee Sync from HRIS

**What:** Import and transform HRIS data to Employee records
**When to use:** After successful OAuth connection

```typescript
// Finch unified data model to Employee mapping
interface FinchIndividual {
  id: string;
  first_name: string | null;
  last_name: string | null;
  emails: { data: string; type: string }[] | null;
}

interface FinchEmployment {
  id: string;
  title: string | null;
  department: { name: string } | null;
  income: { amount: number; currency: string; unit: 'yearly' | 'hourly' } | null;
}

function mapToEmployee(
  individual: FinchIndividual,
  employment: FinchEmployment,
  organizationId: string
): Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> {
  const email = individual.emails?.find(e => e.type === 'work')?.data || '';
  const hourlyRateCents = employment.income?.unit === 'hourly'
    ? Math.round(employment.income.amount * 100)
    : Math.round((employment.income?.amount || 0) * 100 / 2080); // Annual to hourly

  return {
    organizationId,
    name: `${individual.first_name || ''} ${individual.last_name || ''}`.trim(),
    email: email.toLowerCase(),
    role: employment.title || '',
    department: employment.department?.name || '',
    hourlyRateCents,
    employmentStatus: 'fullTime',
    sourceType: 'finch',
    sourceId: individual.id,
  };
}
```

### Pattern 4: CSV Validation Pipeline

**What:** Multi-step CSV validation and import
**When to use:** User uploads CSV file

```typescript
// Step 1: Parse with PapaParse
import Papa from 'papaparse';

Papa.parse<CsvEmployeeRow>(file, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true,
  complete: (results) => {
    const { valid, errors } = validateCsvRows(results.data);
    // Show validation results
  },
});

// Step 2: Validate each row with existing schema
import { csvEmployeeRowSchema } from '@klayim/shared';

function validateCsvRows(rows: unknown[]): ValidationResult {
  return rows.map((row, index) => {
    const result = csvEmployeeRowSchema.safeParse(row);
    return {
      rowNumber: index + 1,
      data: row,
      valid: result.success,
      errors: result.success ? [] : result.error.issues,
    };
  });
}

// Step 3: Convert hourly rate
function calculateHourlyRateCents(row: CsvEmployeeRow): number {
  if (row.hourlyRate) {
    return Math.round(row.hourlyRate * 100);
  }
  if (row.annualSalary) {
    // 2080 = 40 hours/week * 52 weeks/year
    return Math.round((row.annualSalary * 100) / 2080);
  }
  return 0;
}
```

### Anti-Patterns to Avoid

- **Storing access tokens in frontend localStorage:** Use backend-only OAuth flow with encrypted token storage in Firestore (Phase 4 infrastructure)
- **Parsing CSV on the server:** Parse in browser with PapaParse; only send validated JSON to API for import
- **Calling Finch API from frontend:** Backend-only; frontend uses Connect SDK for auth, then backend handles API calls
- **Hard-coding BambooHR company domain:** User must provide their BambooHR subdomain during connection flow

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HRIS unified API | Custom adapters per provider | Finch API | 275+ providers, unified data model, maintained by Finch |
| CSV parsing | Custom parser | PapaParse/react-papaparse | Edge cases (quotes, newlines, encoding), 10+ years battle-tested |
| OAuth state management | Session storage | JSON-encoded state parameter | Already used in Phase 5; simpler than session management |
| Hourly rate calculation | Custom formulas | Standard 2080 hours/year | Industry standard: 40 hours * 52 weeks |

**Key insight:** HRIS data normalization is complex. Finch handles field mapping across 275+ providers. BambooHR direct integration is worthwhile because it's widely used and has good OAuth support.

## Common Pitfalls

### Pitfall 1: BambooHR Company Domain Required

**What goes wrong:** BambooHR OAuth requires the company's subdomain (e.g., `acme.bamboohr.com`)
**Why it happens:** Unlike Google/Microsoft, BambooHR doesn't have a universal auth endpoint
**How to avoid:** Add company domain input field before OAuth redirect
**Warning signs:** OAuth returns 404 or invalid redirect

### Pitfall 2: Finch Connect Session Expiration

**What goes wrong:** Finch Connect sessions expire after 30 minutes
**Why it happens:** Security measure to prevent stale auth sessions
**How to avoid:** Create session just before user clicks connect; don't cache session IDs
**Warning signs:** "Session expired" error in Finch Connect modal

### Pitfall 3: Missing Income Data

**What goes wrong:** Some HRIS providers don't provide salary/income data
**Why it happens:** Depends on what customer authorizes or what provider exposes
**How to avoid:** Handle null income gracefully; allow manual hourly rate entry after import
**Warning signs:** Employees imported with $0 hourly rate

### Pitfall 4: CSV Encoding Issues

**What goes wrong:** Non-ASCII characters corrupted in employee names
**Why it happens:** File saved with Windows encoding, not UTF-8
**How to avoid:** Use PapaParse with `encoding: 'UTF-8'`; add BOM detection
**Warning signs:** Names display as `?` or garbled characters

### Pitfall 5: Rate Limit on Initial Sync

**What goes wrong:** Large organizations with 1000+ employees hit API rate limits
**Why it happens:** Trying to sync all employees at once
**How to avoid:** Use Finch pagination (client.hris.directory.list() auto-paginates); implement exponential backoff
**Warning signs:** 429 Too Many Requests errors

## Code Examples

### BambooHR Employee Data Fetch

```typescript
// Source: BambooHR API documentation
// https://documentation.bamboohr.com/reference/get-employee-1

interface BambooHREmployee {
  id: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  jobTitle: string;
  department: string;
  payRate: string;  // "75000" or "35.50"
  payType: 'Hourly' | 'Salary';
}

async function fetchBambooHREmployees(
  companyDomain: string,
  accessToken: string
): Promise<BambooHREmployee[]> {
  const response = await fetch(
    `https://api.bamboohr.com/api/gateway.php/${companyDomain}/v1/employees/directory`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  const data = await response.json();
  return data.employees;
}

function mapBambooHREmployee(emp: BambooHREmployee, organizationId: string): Employee {
  const payRate = parseFloat(emp.payRate);
  const hourlyRateCents = emp.payType === 'Hourly'
    ? Math.round(payRate * 100)
    : Math.round((payRate * 100) / 2080);

  return {
    organizationId,
    name: `${emp.firstName} ${emp.lastName}`,
    email: emp.workEmail.toLowerCase(),
    role: emp.jobTitle,
    department: emp.department,
    hourlyRateCents,
    employmentStatus: 'fullTime',
    sourceType: 'bamboohr',
    sourceId: emp.id,
  };
}
```

### Finch Employee Sync

```typescript
// Source: Finch API documentation
// https://developer.tryfinch.com

import Finch from '@tryfinch/finch-api';

async function syncFinchEmployees(
  accessToken: string,
  organizationId: string
): Promise<Employee[]> {
  const finch = new Finch({ accessToken });
  const employees: Employee[] = [];

  // Get all individuals from directory (auto-paginates)
  for await (const individual of finch.hris.directory.list()) {
    const id = individual.id;

    // Fetch detailed employment info
    const employmentResp = await finch.hris.employment.retrieve(id);
    const individualResp = await finch.hris.individual.retrieve(id);

    employees.push(mapToEmployee(individualResp, employmentResp, organizationId));
  }

  return employees;
}
```

### CSV Upload with react-papaparse

```typescript
// Source: react-papaparse documentation
// https://react-papaparse.js.org

import Papa, { ParseResult } from 'papaparse';
import type { CsvEmployeeRow } from '@klayim/shared';

interface CsvValidationResult {
  valid: CsvEmployeeRow[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

function parseCsvFile(file: File): Promise<CsvValidationResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<Record<string, string>>) => {
        const valid: CsvEmployeeRow[] = [];
        const errors: CsvValidationResult['errors'] = [];

        results.data.forEach((row, index) => {
          // Normalize column names (case-insensitive)
          const normalized = normalizeRowKeys(row);

          // Validate with schema
          const parsed = csvEmployeeRowSchema.safeParse(normalized);

          if (parsed.success) {
            valid.push(parsed.data);
          } else {
            parsed.error.issues.forEach((issue) => {
              errors.push({
                row: index + 2, // +2 for header and 0-index
                field: issue.path.join('.'),
                message: issue.message,
              });
            });
          }
        });

        resolve({ valid, errors });
      },
    });
  });
}

function normalizeRowKeys(row: Record<string, string>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');

    // Map common column variations
    const keyMap: Record<string, string> = {
      'full_name': 'name',
      'employee_name': 'name',
      'email_address': 'email',
      'work_email': 'email',
      'job_title': 'role',
      'title': 'role',
      'annual_salary': 'annualSalary',
      'yearly_salary': 'annualSalary',
      'hourly_rate': 'hourlyRate',
      'rate': 'hourlyRate',
    };

    const mappedKey = keyMap[normalizedKey] || normalizedKey;

    // Parse numeric values
    if (['hourlyRate', 'annualSalary'].includes(mappedKey)) {
      normalized[mappedKey] = parseFloat(value) || undefined;
    } else {
      normalized[mappedKey] = value;
    }
  });

  return normalized;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BambooHR OpenID Connect | BambooHR OAuth 2.0 | April 2025 | Must use OAuth 2.0 for new integrations |
| API keys for HRIS | OAuth + Unified APIs | 2024+ | Better security, user-controlled access |
| Server-side CSV parsing | Client-side with PapaParse | Standard | Faster feedback, no upload needed for validation |

**Deprecated/outdated:**
- BambooHR OpenID Connect: Deprecated April 2025; use OAuth 2.0
- BambooHR oidcLogin endpoint: Deprecated; use /oauth/authorize
- react-finch-connect: Renamed to @tryfinch/react-connect

## Open Questions

1. **BambooHR Developer Portal Access**
   - What we know: Self-registration available at developers.bamboohr.com
   - What's unclear: Approval timeline for production client credentials
   - Recommendation: Register immediately; use sandbox credentials for development

2. **Finch Pricing**
   - What we know: Finch charges per connection per month
   - What's unclear: Exact pricing tiers for startup vs scale
   - Recommendation: Contact Finch sales; pricing likely usage-based

3. **Employee Count Limits**
   - What we know: Some HRIS have rate limits
   - What's unclear: Finch rate limits per provider
   - Recommendation: Implement pagination; add progress indicator for large syncs

## Sources

### Primary (HIGH confidence)
- [BambooHR Getting Started](https://documentation.bamboohr.com/docs/getting-started) - OAuth 2.0 flow, endpoint structure
- [BambooHR Planned API Changes](https://documentation.bamboohr.com/docs/planned-changes-to-the-api) - OpenID deprecation, 2026 changes
- [Finch API Documentation](https://developer.tryfinch.com) - Connect sessions, employee endpoints
- [Finch Node SDK](https://github.com/Finch-API/finch-api-node) - API methods, pagination
- [react-papaparse Documentation](https://react-papaparse.js.org) - CSV parsing, TypeScript types

### Secondary (MEDIUM confidence)
- [Finch Rippling Integration](https://www.tryfinch.com/integrations/rippling) - Partner requirements
- [Finch Gusto Integration](https://www.tryfinch.com/integrations/gusto) - Setup requirements
- [Finch Organization API](https://www.tryfinch.com/product/organization) - Available employee fields

### Tertiary (LOW confidence)
- None - all critical claims verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDKs with TypeScript support
- Architecture: HIGH - Follows existing Phase 5 OAuth patterns
- Pitfalls: HIGH - Documented in official sources

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days - stable APIs)
