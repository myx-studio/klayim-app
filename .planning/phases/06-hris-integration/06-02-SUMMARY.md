---
phase: 06-hris-integration
plan: 02
subsystem: api
tags: [finch, hris, oauth, rippling, gusto, employee-sync]

# Dependency graph
requires:
  - phase: 04-integration-infrastructure
    provides: Integration repository with encrypted credentials, token refresh service
  - phase: 06-hris-integration-plan-01
    provides: HRIS sync service foundation, OAuth route patterns
provides:
  - Finch unified API service with Connect session and employee fetch
  - Finch OAuth routes at /oauth/finch/session and /oauth/finch/callback
  - HRIS sync service handles Finch employee import with hourly rate calculation
  - Token refresh handling (Finch tokens don't expire)
affects: [06-03, frontend-hris-connect]

# Tech tracking
tech-stack:
  added: ["@tryfinch/finch-api", "@tryfinch/react-connect"]
  patterns: [Finch Connect embedded auth flow, Finch unified data model mapping]

key-files:
  created:
    - apps/api/src/services/finch.service.ts
    - apps/api/src/routes/oauth/finch.ts
  modified:
    - apps/api/src/services/hris-sync.service.ts
    - apps/api/src/routes/oauth/index.ts
    - apps/api/src/services/token-refresh.service.ts
    - apps/api/src/services/index.ts
    - apps/api/package.json
    - apps/web/package.json

key-decisions:
  - "Use type guards for Finch SDK union types (BatchError vs valid response)"
  - "Set Finch token expiry to 10 years since Finch tokens don't expire"
  - "Store companyName@providerId in accountEmail for Finch integrations"
  - "Use POST endpoints for Finch OAuth (session + callback) since Connect uses embedded modal"

patterns-established:
  - "Finch Connect flow: POST /session returns sessionId, frontend shows modal, POST /callback exchanges code"
  - "HRIS provider routing via switch statement in triggerInitialSync and syncIntegration"
  - "Persistent tokens set far-future expiry (10 years) to avoid refresh attempts"

requirements-completed: [HRIS-02, HRIS-03, HRIS-05, HRIS-06]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 06 Plan 02: Finch Integration Summary

**Finch unified API integration enabling Rippling/Gusto connections via Connect embedded auth with employee sync and hourly rate calculation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-27T08:29:20Z
- **Completed:** 2026-02-27T08:34:47Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Finch SDK packages installed (@tryfinch/finch-api for API, @tryfinch/react-connect for frontend)
- Finch service with createConnectSession, exchangeCode, and fetchEmployees methods
- HRIS sync service extended with syncFromFinch method
- OAuth routes mounted at /oauth/finch with session and callback endpoints
- Token refresh service handles Finch's persistent tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Finch SDKs** - `8123319` (chore)
2. **Task 2: Create Finch service with Connect session and employee fetch** - `9d6b92f` (feat)
3. **Task 3: Add Finch sync and OAuth routes with token refresh handling** - `73a6510` (feat)

**Plan metadata:** `d244e4f` (docs: complete plan)

## Files Created/Modified
- `apps/api/src/services/finch.service.ts` - Finch Connect session, code exchange, employee fetch
- `apps/api/src/routes/oauth/finch.ts` - POST /session and /callback endpoints
- `apps/api/src/services/hris-sync.service.ts` - syncFromFinch method, updated triggerInitialSync
- `apps/api/src/routes/oauth/index.ts` - Mount Finch routes at /finch
- `apps/api/src/services/token-refresh.service.ts` - Finch tokens don't require refresh
- `apps/api/src/services/index.ts` - Export finch service
- `apps/api/package.json` - Added @tryfinch/finch-api
- `apps/web/package.json` - Added @tryfinch/react-connect

## Decisions Made
- Used type guards (`isValidBody`) for Finch SDK union types since responses can be BatchError
- Set token expiry to 10 years from now since Finch tokens are persistent until disconnected
- Store `{companyName}@{providerId}` in accountEmail field (e.g., "Acme Corp@gusto")
- Used POST endpoints for both session and callback since Finch Connect uses embedded modal (no redirects)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Finch SDK TypeScript types**
- **Found during:** Task 2 (Finch service creation)
- **Issue:** Finch SDK uses `clientID` not `clientId`, `employments`/`individuals` not `employment`/`individual`, and returns union types with BatchError
- **Fix:** Changed property names to match SDK, added type guard and explicit type casts for response bodies
- **Files modified:** apps/api/src/services/finch.service.ts
- **Verification:** Build passes without TypeScript errors
- **Committed in:** 9d6b92f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking - SDK type mismatches)
**Impact on plan:** Necessary correction to match actual Finch SDK API. No scope creep.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration.** The following environment variables are required:
- `FINCH_CLIENT_ID` - Finch application client ID (from Finch Dashboard -> Developers -> Applications)
- `FINCH_CLIENT_SECRET` - Finch application client secret
- `FINCH_SANDBOX` - Set to "true" for development, "false" for production

Configure redirect URI in Finch Dashboard -> Application Settings -> Redirect URIs.

## Next Phase Readiness
- Finch OAuth flow complete, ready for frontend integration
- CSV import planned for Plan 03
- Frontend can now use @tryfinch/react-connect with session ID from /oauth/finch/session

## Self-Check: PASSED

All files verified to exist:
- apps/api/src/services/finch.service.ts
- apps/api/src/routes/oauth/finch.ts

All commits verified to exist:
- 8123319
- 9d6b92f
- 73a6510

---
*Phase: 06-hris-integration*
*Completed: 2026-02-27*
