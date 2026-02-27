---
phase: 06-hris-integration
plan: 01
subsystem: api
tags: [bamboohr, oauth, hris, employee-sync, token-refresh]

# Dependency graph
requires:
  - phase: 04-integration-infrastructure
    provides: Integration repository with encrypted credentials, token refresh service
provides:
  - BambooHR OAuth service with authorization URL generation, code exchange, token refresh
  - HRIS sync service for employee import with hourly rate calculation
  - OAuth routes at /oauth/bamboohr/authorize and /oauth/bamboohr/callback
  - Token refresh implementation for bamboohr provider
affects: [06-02, 06-03, frontend-hris-connect]

# Tech tracking
tech-stack:
  added: []
  patterns: [BambooHR OAuth flow, HRIS employee sync, hourly rate calculation from salary]

key-files:
  created:
    - apps/api/src/services/bamboohr.service.ts
    - apps/api/src/services/hris-sync.service.ts
    - apps/api/src/routes/oauth/bamboohr.ts
  modified:
    - apps/api/src/services/index.ts
    - apps/api/src/routes/oauth/index.ts
    - apps/api/src/services/token-refresh.service.ts

key-decisions:
  - "Store companyDomain in accountId field since BambooHR identifies accounts by subdomain"
  - "Use accountEmail as {companyDomain}@bamboohr since BambooHR doesn't expose user email"
  - "Calculate hourly rate from salary using 2080 hours/year (40 hrs/week * 52 weeks)"
  - "Skip employees without email (can't match to meeting attendees)"

patterns-established:
  - "HRIS OAuth pattern: store company-specific ID in accountId for API calls"
  - "Employee sync pattern: upsert by sourceType + sourceId for idempotent imports"
  - "Initial sync triggered async after OAuth callback to avoid redirect delay"

requirements-completed: [HRIS-01, HRIS-05, HRIS-06]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 06 Plan 01: BambooHR Integration Summary

**BambooHR OAuth service with employee directory sync, hourly rate calculation from salary, and token refresh wiring**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T07:38:31Z
- **Completed:** 2026-02-27T07:41:40Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- BambooHR OAuth flow with authorization URL generation, code exchange, and token refresh
- HRIS sync service that imports employees with automatic hourly rate calculation from salary (2080 hours/year)
- OAuth routes mounted at /oauth/bamboohr with authorization and callback endpoints
- Token refresh service updated to handle bamboohr provider

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BambooHR service with OAuth and employee fetch** - `6e4e4c0` (feat)
2. **Task 2: Create HRIS sync service for employee import** - `0253aea` (feat)
3. **Task 3: Create BambooHR OAuth routes and wire up token refresh** - `9f4cbb3` (feat)

**Plan metadata:** `46f08db` (docs: complete plan)

## Files Created/Modified
- `apps/api/src/services/bamboohr.service.ts` - BambooHR OAuth and employee fetch service
- `apps/api/src/services/hris-sync.service.ts` - HRIS sync orchestration with hourly rate calculation
- `apps/api/src/routes/oauth/bamboohr.ts` - BambooHR OAuth routes (authorize/callback)
- `apps/api/src/routes/oauth/index.ts` - Mount BambooHR routes in OAuth router
- `apps/api/src/services/index.ts` - Export bamboohr and hris-sync services
- `apps/api/src/services/token-refresh.service.ts` - BambooHR token refresh implementation

## Decisions Made
- Store companyDomain in accountId field since BambooHR identifies accounts by subdomain (no user-specific ID)
- Use accountEmail as {companyDomain}@bamboohr since BambooHR OAuth doesn't expose user email
- Calculate hourly rate from salary using 2080 hours/year standard (40 hrs/week * 52 weeks)
- Skip employees without email since they can't be matched to meeting attendees

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**External services require manual configuration.** The following environment variables are required:
- `BAMBOOHR_CLIENT_ID` - BambooHR OAuth client ID
- `BAMBOOHR_CLIENT_SECRET` - BambooHR OAuth client secret

These can be obtained from the BambooHR developer portal.

## Next Phase Readiness
- BambooHR OAuth flow complete, ready for frontend integration in 06-02
- Finch integration will follow same pattern in 06-03
- HRIS sync service ready for scheduled/manual sync endpoints

## Self-Check: PASSED

All files verified to exist:
- apps/api/src/services/bamboohr.service.ts
- apps/api/src/services/hris-sync.service.ts
- apps/api/src/routes/oauth/bamboohr.ts

All commits verified to exist:
- 6e4e4c0
- 0253aea
- 9f4cbb3

---
*Phase: 06-hris-integration*
*Completed: 2026-02-27*
