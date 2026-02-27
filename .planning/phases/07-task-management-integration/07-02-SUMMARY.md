---
phase: 07-task-management-integration
plan: 02
subsystem: integrations
tags: [asana, clickup, linear, oauth, task-management]

# Dependency graph
requires:
  - phase: 07-task-management-integration
    provides: Task types, SDKs installed
  - phase: 04-integration-infrastructure
    provides: integration service, token refresh patterns
provides:
  - Asana OAuth service with task fetch and normalization
  - ClickUp OAuth service with task fetch and normalization
  - Linear OAuth service with issue fetch and normalization
  - OAuth routes at /oauth/asana, /oauth/clickup, /oauth/linear
  - Token refresh implementations for Asana and Linear
affects: [07-03-sync-frontend, task-sync-service]

# Tech tracking
tech-stack:
  added: []
  patterns: [direct-fetch-oauth, provider-normalization]

key-files:
  created:
    - apps/api/src/services/asana.service.ts
    - apps/api/src/services/clickup.service.ts
    - apps/api/src/services/linear.service.ts
    - apps/api/src/routes/oauth/asana.ts
    - apps/api/src/routes/oauth/clickup.ts
    - apps/api/src/routes/oauth/linear.ts
  modified:
    - apps/api/src/routes/oauth/index.ts
    - apps/api/src/services/token-refresh.service.ts
    - apps/api/src/services/index.ts

key-decisions:
  - "Use direct fetch for Asana instead of SDK (v3 SDK lacks TypeScript types)"
  - "ClickUp tokens never expire - set 10-year expiry, no refresh needed"
  - "Linear uses @linear/sdk for GraphQL but fetch for OAuth token exchange"
  - "All services use typed interfaces for API responses"
  - "OAuth routes follow existing bamboohr.ts pattern"

patterns-established:
  - "Task normalization: convert provider-specific task data to unified Task type"
  - "OAuth state: JSON with organizationId and redirectUrl"
  - "Non-expiring tokens: set far-future expiry and throw on refresh attempt"

requirements-completed: [TASK-01, TASK-02, TASK-03]

# Metrics
duration: 7min
completed: 2026-02-27
---

# Phase 7 Plan 02: Provider Services Summary

**OAuth services and routes for Asana, ClickUp, and Linear with task normalization to unified Task type**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-27T10:09:38Z
- **Completed:** 2026-02-27T10:16:05Z
- **Tasks:** 5
- **Files modified:** 9

## Accomplishments
- Created three task provider services with OAuth flows (auth URL, code exchange, token refresh)
- Built OAuth routes for all three providers mounted at /oauth/{provider}
- Implemented task normalization converting provider data to unified Task type
- Updated token refresh service with actual implementations for Asana and Linear

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Asana service with OAuth and task fetch** - `780c4e0` (feat)
2. **Task 2: Create ClickUp service with OAuth and task fetch** - `bcc344b` (feat)
3. **Task 3: Create Linear service with OAuth and issue fetch** - `5a0a241` (feat)
4. **Task 4: Create OAuth routes for all three providers** - `6f21589` (feat)
5. **Task 5: Update token refresh service and exports** - `0d0788d` (feat)

## Files Created/Modified
- `apps/api/src/services/asana.service.ts` - Asana OAuth and task normalization
- `apps/api/src/services/clickup.service.ts` - ClickUp OAuth and task normalization
- `apps/api/src/services/linear.service.ts` - Linear OAuth via SDK and issue normalization
- `apps/api/src/routes/oauth/asana.ts` - Asana OAuth authorize/callback routes
- `apps/api/src/routes/oauth/clickup.ts` - ClickUp OAuth authorize/callback routes
- `apps/api/src/routes/oauth/linear.ts` - Linear OAuth authorize/callback routes
- `apps/api/src/routes/oauth/index.ts` - Mount all 7 OAuth providers
- `apps/api/src/services/token-refresh.service.ts` - Add Asana/Linear refresh, ClickUp throws
- `apps/api/src/services/index.ts` - Export new services

## Decisions Made
- Used direct fetch for Asana API calls instead of asana SDK because v3 SDK lacks TypeScript type definitions
- ClickUp tokens set to 10-year expiry since they don't expire (API doesn't support refresh)
- All normalizeTask methods convert provider-specific task data to unified Task type from shared types
- OAuth routes don't trigger initial sync yet - taskSyncService will be added in 07-03

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Linear description type mismatch**
- **Found during:** Task 3 (Linear service)
- **Issue:** Linear SDK returns `description` as `string | null | undefined`, but interface expected `string | undefined`
- **Fix:** Added `|| undefined` coercion to convert null to undefined
- **Files modified:** apps/api/src/services/linear.service.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 5a0a241 (Task 3 commit)

**2. [Rule 3 - Blocking] Switched from Asana SDK to direct fetch**
- **Found during:** Task 1 (Asana service)
- **Issue:** Asana v3 SDK has no TypeScript type definitions, causing compilation errors
- **Fix:** Rewrote service to use direct fetch calls with typed interfaces
- **Files modified:** apps/api/src/services/asana.service.ts
- **Verification:** TypeScript compilation passes, same functionality
- **Committed in:** 780c4e0 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for TypeScript compatibility. No scope creep.

## Issues Encountered
None - plan executed smoothly after addressing type issues.

## User Setup Required

None - OAuth credentials (ASANA_CLIENT_ID, CLICKUP_CLIENT_ID, LINEAR_CLIENT_ID, etc.) will need to be configured in deployment but this is infrastructure setup, not code changes.

## Next Phase Readiness

Ready for 07-03-PLAN.md (Sync and Frontend):
- All three services ready for use
- OAuth flows complete - users can connect providers
- Task normalization ready for sync service to use
- Token refresh working for Asana and Linear

## Self-Check: PASSED

- [x] apps/api/src/services/asana.service.ts exists
- [x] apps/api/src/services/clickup.service.ts exists
- [x] apps/api/src/services/linear.service.ts exists
- [x] apps/api/src/routes/oauth/asana.ts exists
- [x] apps/api/src/routes/oauth/clickup.ts exists
- [x] apps/api/src/routes/oauth/linear.ts exists
- [x] Commit 780c4e0 (Task 1) exists
- [x] Commit bcc344b (Task 2) exists
- [x] Commit 5a0a241 (Task 3) exists
- [x] Commit 6f21589 (Task 4) exists
- [x] Commit 0d0788d (Task 5) exists

---
*Phase: 07-task-management-integration*
*Completed: 2026-02-27*
