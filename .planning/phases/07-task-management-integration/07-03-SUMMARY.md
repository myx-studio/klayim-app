---
phase: 07-task-management-integration
plan: 03
subsystem: integrations
tags: [task-management, asana, clickup, linear, firestore, sync]

# Dependency graph
requires:
  - phase: 07-task-management-integration
    provides: Task types, provider services, OAuth routes
  - phase: 04-integration-infrastructure
    provides: integration repository, encryption
provides:
  - Task repository for Firestore storage with bulk upsert
  - Task sync service for Asana, ClickUp, Linear providers
  - Frontend API client for task OAuth
  - Connect-task page with working OAuth flows
affects: [08-dashboard-analytics, task-metrics]

# Tech tracking
tech-stack:
  added: []
  patterns: [bulk-upsert-batching, provider-sync-orchestration]

key-files:
  created:
    - apps/api/src/repositories/task.repository.ts
    - apps/api/src/services/task-sync.service.ts
    - apps/web/src/lib/api/tasks.ts
  modified:
    - apps/api/src/repositories/index.ts
    - apps/api/src/services/index.ts
    - apps/web/src/components/pages/onboarding/connect-task/index.tsx

key-decisions:
  - "Use Firestore batched writes with 400-item chunks (below 500 limit) for bulk task upsert"
  - "Sync state uses integrationId as document ID for 1:1 mapping"
  - "InfoAccordion updated to clarify time tracking (Asana/ClickUp) vs estimates (Linear)"
  - "Provider cards have distinct descriptions for their capabilities"

patterns-established:
  - "Bulk upsert pattern: query existing, upsert by externalId, batch commits at 400 items"
  - "Sync orchestration: triggerInitialSync runs async after OAuth, updates sync state"
  - "OAuth callback handling: success/error params in URL, clear with router.replace"

requirements-completed: [TASK-04, TASK-05, TASK-06]

# Metrics
duration: 8min
completed: 2026-02-27
---

# Phase 7 Plan 03: Sync and Frontend Summary

**Task repository with bulk upsert, sync service orchestrating Asana/ClickUp/Linear imports, and connect-task page with working OAuth flows**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-27T10:19:22Z
- **Completed:** 2026-02-27T10:27:07Z
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments
- Created TaskRepository with upsert, bulk upsert, and sync state tracking for Firestore
- Built TaskSyncService orchestrating task import from all three providers
- Added frontend API client with OAuth URL functions for Asana, ClickUp, Linear
- Wired up connect-task page replacing placeholder toasts with actual OAuth flows

## Task Commits

Each task was committed atomically:

1. **Task 1: Create task repository for Firestore storage** - `0cf9f5e` (feat)
2. **Task 2: Create task sync service for all providers** - `0666867` (feat)
3. **Task 3: Create frontend API client for task OAuth** - `2f02943` (feat)
4. **Task 4: Wire up connect-task page with OAuth handlers** - `8069321` (feat)

## Files Created/Modified
- `apps/api/src/repositories/task.repository.ts` - Task Firestore repository with bulk operations
- `apps/api/src/repositories/index.ts` - Export task repository
- `apps/api/src/services/task-sync.service.ts` - Sync orchestration for all providers
- `apps/api/src/services/index.ts` - Export task sync service
- `apps/web/src/lib/api/tasks.ts` - OAuth URL and status API functions
- `apps/web/src/components/pages/onboarding/connect-task/index.tsx` - OAuth handlers and loading states

## Decisions Made
- Used 400-item batch chunks (below Firestore's 500 limit) for safety margin
- InfoAccordion items updated to accurately reflect what each provider offers (time tracking vs estimates)
- OAuth callback status communicated via URL parameters, cleared after showing toast

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all tasks compiled and verified successfully.

## User Setup Required

None - OAuth credentials (ASANA_CLIENT_ID, CLICKUP_CLIENT_ID, LINEAR_CLIENT_ID, etc.) were configured in prior plans.

## Next Phase Readiness

Phase 7 complete - Task management integration fully implemented:
- OAuth flows for Asana, ClickUp, Linear
- Task normalization and storage
- Sync service ready for webhooks and polling

Ready for Phase 8 (Dashboard Analytics) which can now query task data alongside calendar and employee data.

## Self-Check: PASSED

- [x] apps/api/src/repositories/task.repository.ts exists
- [x] apps/api/src/services/task-sync.service.ts exists
- [x] apps/web/src/lib/api/tasks.ts exists
- [x] Commit 0cf9f5e (Task 1) exists
- [x] Commit 0666867 (Task 2) exists
- [x] Commit 2f02943 (Task 3) exists
- [x] Commit 8069321 (Task 4) exists

---
*Phase: 07-task-management-integration*
*Completed: 2026-02-27*
