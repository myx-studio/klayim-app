---
phase: 06-hris-integration
plan: 03
subsystem: web, api
tags: [csv-import, papaparse, employee-import, oauth-frontend, finch-connect]

# Dependency graph
requires:
  - phase: 06-hris-integration-plan-01
    provides: BambooHR OAuth routes at /oauth/bamboohr
  - phase: 06-hris-integration-plan-02
    provides: Finch OAuth routes at /oauth/finch and @tryfinch/react-connect package
provides:
  - CSV employee import flow with PapaParse parsing and validation
  - Employee import API at POST /employees/import
  - HRIS API client functions for BambooHR and Finch OAuth
  - Connect HRIS page wired to real OAuth endpoints
affects: [onboarding-flow, employee-management]

# Tech tracking
tech-stack:
  added: [papaparse, @types/papaparse]
  patterns: [sessionStorage for multi-page CSV flow, column name normalization]

key-files:
  created:
    - apps/api/src/routes/employees.ts
    - apps/web/src/lib/api/hris.ts
    - apps/web/src/lib/api/employees.ts
  modified:
    - apps/web/src/components/pages/onboarding/connect-hris/index.tsx
    - apps/web/src/components/pages/onboarding/upload-csv/index.tsx
    - apps/web/src/components/pages/onboarding/upload-csv/validate.tsx
    - apps/web/src/components/pages/onboarding/upload-csv/confirm.tsx
    - packages/shared/src/schemas/employee.schema.ts
    - packages/shared/src/index.ts

key-decisions:
  - "Use sessionStorage for CSV data between upload/validate/confirm pages"
  - "Column aliases handle common CSV variations (full_name, email_address, etc.)"
  - "Calculate hourly rate client-side for preview, server-side for import"
  - "Use deterministic sourceId from email hash for CSV re-import idempotency"

patterns-established:
  - "Multi-page forms use sessionStorage for cross-page state"
  - "Column normalization aliases defined in shared schema"
  - "Employee import uses upsert by sourceId for safe re-runs"

requirements-completed: [HRIS-04, HRIS-05, HRIS-06, HRIS-07]

# Metrics
duration: 7min
completed: 2026-02-27
---

# Phase 06 Plan 03: CSV Import and Frontend Wiring Summary

**CSV employee import flow with PapaParse parsing, column normalization, validation preview, and connect-hris page wired to BambooHR/Finch OAuth endpoints**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-27T08:38:06Z
- **Completed:** 2026-02-27T08:45:10Z
- **Tasks:** 4
- **Files modified:** 10

## Accomplishments
- Employee import API at POST /employees/import with hourly rate calculation from salary
- HRIS API client (getBambooHRAuthUrl, createFinchSession, exchangeFinchCode)
- Employee API client (importEmployees, getEmployees)
- Connect HRIS page with BambooHR domain dialog and Finch Connect modal
- CSV parsing with PapaParse and column name normalization
- Multi-page validation flow with error reporting
- Employee preview table with search and pagination

## Task Commits

Each task was committed atomically:

1. **Task 1: Install react-papaparse and create employee import API** - `31f0010` (feat)
2. **Task 2: Create HRIS and Employee API client functions** - `3183d49` (feat)
3. **Task 3: Wire up connect-hris page with real OAuth handlers** - `4339c32` (feat)
4. **Task 4: Implement CSV parsing and validation flow** - `53c5341` (feat)

## Files Created/Modified
- `apps/api/src/routes/employees.ts` - Employee import and list API endpoints
- `apps/web/src/lib/api/hris.ts` - BambooHR and Finch OAuth client functions
- `apps/web/src/lib/api/employees.ts` - Employee import and list client functions
- `apps/web/src/components/pages/onboarding/connect-hris/index.tsx` - Real OAuth handlers
- `apps/web/src/components/pages/onboarding/upload-csv/index.tsx` - Store file in sessionStorage
- `apps/web/src/components/pages/onboarding/upload-csv/validate.tsx` - Real CSV validation
- `apps/web/src/components/pages/onboarding/upload-csv/confirm.tsx` - Import to database
- `packages/shared/src/schemas/employee.schema.ts` - Column aliases for normalization
- `packages/shared/src/index.ts` - Export csvColumnAliases

## Decisions Made
- Use sessionStorage for CSV file content between upload/validate/confirm pages
- Column aliases handle common CSV variations (full_name -> name, email_address -> email)
- Calculate hourly rate client-side for preview display, server-side for actual import
- Generate deterministic sourceId from email hash (csv_{md5hash}) for idempotent re-imports
- Finch Connect used for both Rippling and Gusto (user selects provider in modal)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added papaparse directly**
- **Found during:** Task 4
- **Issue:** react-papaparse installed but import from papaparse failed
- **Fix:** Added papaparse and @types/papaparse as direct dependencies
- **Files modified:** apps/web/package.json, pnpm-lock.yaml
- **Committed in:** 53c5341 (Task 4 commit)

**2. [Rule 1 - Bug] Removed non-existent props from validate page**
- **Found during:** Task 4
- **Issue:** Used showBack/onBack props that don't exist on OrgOnboardingLayout
- **Fix:** Removed the props, parent layout handles back navigation
- **Files modified:** apps/web/src/components/pages/onboarding/upload-csv/validate.tsx
- **Committed in:** 53c5341 (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Minimal corrections for package resolution and component API.

## Issues Encountered
None

## User Setup Required

**No additional setup required.** This plan uses the OAuth endpoints created in Plans 01 and 02. Environment variables for BambooHR and Finch are still required (documented in previous plan summaries).

## Next Phase Readiness
- Phase 06 HRIS Integration complete
- Users can connect BambooHR, Rippling, or Gusto via OAuth
- Users can upload CSV files for employee import
- Employee data available for meeting cost calculation

## Self-Check: PASSED

All files verified to exist:
- apps/api/src/routes/employees.ts
- apps/web/src/lib/api/hris.ts
- apps/web/src/lib/api/employees.ts
- apps/web/src/components/pages/onboarding/upload-csv/confirm.tsx

All commits verified to exist:
- 31f0010
- 3183d49
- 4339c32
- 53c5341

---
*Phase: 06-hris-integration*
*Completed: 2026-02-27*
