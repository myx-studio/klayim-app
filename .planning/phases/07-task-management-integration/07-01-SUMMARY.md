---
phase: 07-task-management-integration
plan: 01
subsystem: integrations
tags: [asana, linear, clickup, task-management, typescript]

# Dependency graph
requires:
  - phase: 04-integration-infrastructure
    provides: integration types, encryption, token refresh patterns
provides:
  - asana SDK for task management integration
  - "@linear/sdk for Linear GraphQL API"
  - Task, TaskStatus, TaskProvider, TaskTimeEntry, TaskSyncState types
  - Normalized task model supporting Asana, ClickUp, Linear
affects: [07-02-provider-services, 07-03-sync-frontend]

# Tech tracking
tech-stack:
  added: [asana@3.1.9, "@linear/sdk@76.0.0"]
  patterns: [normalized-task-model, provider-agnostic-types]

key-files:
  created:
    - packages/shared/src/types/task.ts
  modified:
    - apps/api/package.json
    - packages/shared/src/types/index.ts

key-decisions:
  - "Use asana v3 SDK (v1 deprecated)"
  - "ClickUp uses direct fetch (no official SDK)"
  - "TaskTimeEntry for Asana/ClickUp, estimatePoints for Linear story points"
  - "TaskSyncState follows CalendarSyncState pattern with provider-specific tokens"

patterns-established:
  - "Task normalized model: provider-agnostic with externalId mapping"
  - "Time tracking: timeSpentMinutes for Asana/ClickUp, estimatePoints for Linear"

requirements-completed: [TASK-04, TASK-05]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 7 Plan 01: Task Management Foundation Summary

**Installed Asana and Linear SDKs with normalized Task types supporting time tracking from Asana/ClickUp and story points from Linear**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T10:03:00Z
- **Completed:** 2026-02-27T10:06:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Installed asana@3.1.9 and @linear/sdk@76.0.0 in API package
- Created normalized Task types supporting all three providers (Asana, ClickUp, Linear)
- TaskTimeEntry supports Asana/ClickUp time tracking
- Task.estimatePoints captures Linear story points (not time-based)
- TaskSyncState tracks provider-specific sync tokens (syncToken, cursor, timestamp)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install task management SDKs** - `a0e59b0` (chore)
2. **Task 2: Create Task types for normalized storage** - `36b13fd` (feat)

## Files Created/Modified
- `packages/shared/src/types/task.ts` - TaskProvider, TaskStatus, TaskTimeEntry, Task, TaskSyncState types
- `packages/shared/src/types/index.ts` - Re-export task types
- `apps/api/package.json` - Added asana and @linear/sdk dependencies

## Decisions Made
- Used asana v3 SDK instead of deprecated v1
- No official ClickUp SDK - will use direct fetch with typed responses in 07-02
- TaskTimeEntry handles Asana/ClickUp time tracking data
- Task.estimatePoints for Linear story points (separate from time tracking)
- TaskSyncState follows same pattern as CalendarSyncState

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 07-02-PLAN.md (Provider services):
- SDKs installed and importable
- Task types available for provider services to use
- Normalized model ready for Asana, ClickUp, Linear sync services

## Self-Check: PASSED

- [x] packages/shared/src/types/task.ts exists
- [x] Commit a0e59b0 (Task 1) exists
- [x] Commit 36b13fd (Task 2) exists

---
*Phase: 07-task-management-integration*
*Completed: 2026-02-27*
