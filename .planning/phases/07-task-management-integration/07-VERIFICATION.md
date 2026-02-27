---
phase: 07-task-management-integration
verified: 2026-02-27T10:50:00Z
status: passed
score: 6/6 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "System imports tasks from connected providers"
  gaps_remaining: []
  regressions: []
  notes: "Gap closed via commits e0f6223 (initial wiring) and 6811bbe (parameter fix)"
gaps: []
---

# Phase 7: Task Management Integration Re-Verification Report

**Phase Goal:** Users can connect task management tools and sync task data for ROI tracking
**Verified:** 2026-02-27T10:45:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap closure attempt (commit e0f6223)

## Re-Verification Summary

**Previous Status:** gaps_found (5/6 truths verified)
**Current Status:** gaps_found (5/6 truths verified)

**Gap Closure Analysis:**
- Gap fix commit e0f6223 added taskSyncService.triggerInitialSync() calls to all three OAuth callbacks
- Wiring is now present (imports added, calls made)
- **New bug introduced:** Parameter mismatch - passing `integration.id` where `organizationId` expected
- Sync will silently fail because lookup by wrong ID returns no integration

**Root Cause:**
The taskSyncService API is inconsistent with other sync services:
- `hrisSyncService.triggerInitialSync(integrationId: string)` - takes integrationId
- `calendarSyncService.triggerInitialSync(integrationId: string)` - takes integrationId
- `taskSyncService.triggerInitialSync(organizationId: string, provider: TaskProvider)` - takes organizationId + provider

The gap fix followed the HRIS/Calendar pattern but taskSyncService uses a different signature.

## Goal Achievement

### Observable Truths

| #   | Truth                                                                | Status      | Evidence                                                                     |
| --- | -------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| 1   | Task type represents normalized task data from any provider          | ✓ VERIFIED  | Task interface with provider-agnostic fields (07-01)                        |
| 2   | Time tracking fields handle Asana/ClickUp data and Linear estimates | ✓ VERIFIED  | timeSpentMinutes for Asana/ClickUp, estimatePoints for Linear               |
| 3   | User can initiate OAuth from /oauth/{provider}/authorize            | ✓ VERIFIED  | All three OAuth routes exist with authorize endpoints                       |
| 4   | OAuth callbacks exchange codes for tokens and create integrations   | ✓ VERIFIED  | All callbacks call service.exchangeCode() and integrationService.connect()  |
| 5   | System imports tasks from connected providers                        | ✗ FAILED    | triggerInitialSync CALLED but with WRONG PARAMS (integration.id vs organizationId) |
| 6   | User sees InfoAccordion explaining what data will be imported        | ✓ VERIFIED  | connect-task page has importItems array with 5 items                        |

**Score:** 5/6 truths verified

### Required Artifacts

| Artifact                                              | Expected                                | Status      | Details                                                |
| ----------------------------------------------------- | --------------------------------------- | ----------- | ------------------------------------------------------ |
| `packages/shared/src/types/task.ts`                   | Task, TaskStatus, TaskProvider types    | ✓ VERIFIED  | 93 lines, exports all required types                   |
| `apps/api/package.json`                               | asana and @linear/sdk dependencies      | ✓ VERIFIED  | asana@3.1.9, @linear/sdk@76.0.0 installed             |
| `apps/api/src/services/asana.service.ts`              | Asana OAuth and task fetch service      | ✓ VERIFIED  | 242 lines, direct fetch implementation (no SDK)        |
| `apps/api/src/services/clickup.service.ts`            | ClickUp OAuth and task fetch service    | ✓ VERIFIED  | 264 lines, direct fetch (no official SDK)              |
| `apps/api/src/services/linear.service.ts`             | Linear OAuth and issue fetch service    | ✓ VERIFIED  | 253 lines, uses @linear/sdk for GraphQL                |
| `apps/api/src/routes/oauth/asana.ts`                  | Asana OAuth routes                      | ⚠️ PARTIAL  | Imports taskSyncService, calls it, but WRONG PARAMS    |
| `apps/api/src/routes/oauth/clickup.ts`                | ClickUp OAuth routes                    | ⚠️ PARTIAL  | Imports taskSyncService, calls it, but WRONG PARAMS    |
| `apps/api/src/routes/oauth/linear.ts`                 | Linear OAuth routes                     | ⚠️ PARTIAL  | Imports taskSyncService, calls it, but WRONG PARAMS    |
| `apps/api/src/repositories/task.repository.ts`        | Task Firestore repository               | ✓ VERIFIED  | 232 lines with upsert, bulk upsert, sync state         |
| `apps/api/src/services/task-sync.service.ts`          | Task sync orchestration service         | ✓ VERIFIED  | 248 lines, syncFromAsana/ClickUp/Linear implemented    |
| `apps/web/src/lib/api/tasks.ts`                       | Task API client functions               | ✓ VERIFIED  | 88 lines, exports all three getAuthUrl functions       |
| `apps/web/src/components/pages/.../connect-task/...` | Connect task page with OAuth handlers   | ✓ VERIFIED  | 193 lines, all handlers call API and redirect to OAuth |

### Key Link Verification

| From                                       | To                                        | Via                     | Status       | Details                                                        |
| ------------------------------------------ | ----------------------------------------- | ----------------------- | ------------ | -------------------------------------------------------------- |
| `packages/shared/src/types/task.ts`        | `packages/shared/src/types/index.ts`      | re-export               | ✓ WIRED      | Line 10: `export * from "./task.js"`                          |
| `apps/api/src/routes/oauth/asana.ts`       | `apps/api/src/services/asana.service.ts`  | service import          | ✓ WIRED      | Line 2: imports asanaService, used in callbacks                |
| `apps/api/src/routes/oauth/clickup.ts`     | `apps/api/src/services/clickup.service.ts`| service import          | ✓ WIRED      | Line 2: imports clickupService, used in callbacks              |
| `apps/api/src/routes/oauth/linear.ts`      | `apps/api/src/services/linear.service.ts` | service import          | ✓ WIRED      | Line 2: imports linearService, used in callbacks               |
| `apps/api/src/routes/oauth/asana.ts`       | `apps/api/src/services/task-sync.service.ts` | triggerInitialSync | ⚠️ PARTIAL   | Line 4: import exists, Line 149: called with WRONG params      |
| `apps/api/src/routes/oauth/clickup.ts`     | `apps/api/src/services/task-sync.service.ts` | triggerInitialSync | ⚠️ PARTIAL   | Line 4: import exists, Line 158: called with WRONG params      |
| `apps/api/src/routes/oauth/linear.ts`      | `apps/api/src/services/task-sync.service.ts` | triggerInitialSync | ⚠️ PARTIAL   | Line 4: import exists, Line 149: called with WRONG params      |
| `apps/api/src/services/task-sync.service.ts` | `apps/api/src/repositories/task.repository.ts` | repository import | ✓ WIRED    | Line 1: imports taskRepository, used throughout                |
| `apps/web/src/components/.../connect-task` | `apps/web/src/lib/api/tasks.ts`          | API client import       | ✓ WIRED      | Line 7: imports all three getAuthUrl functions, calls them     |

**Critical Gap Evolution:**
- **Before e0f6223:** taskSyncService not imported, TODO comments in place → NOT_WIRED
- **After e0f6223:** taskSyncService imported and called → PARTIAL wiring (exists but broken)

### Requirements Coverage

| Requirement | Source Plan | Description                                           | Status      | Evidence                                               |
| ----------- | ----------- | ----------------------------------------------------- | ----------- | ------------------------------------------------------ |
| TASK-01     | 07-02       | User can connect Asana workspace via OAuth            | ✓ SATISFIED | /oauth/asana/authorize endpoint exists and functional  |
| TASK-02     | 07-02       | User can connect ClickUp workspace via OAuth          | ✓ SATISFIED | /oauth/clickup/authorize endpoint exists and functional|
| TASK-03     | 07-02       | User can connect Linear workspace via OAuth           | ✓ SATISFIED | /oauth/linear/authorize endpoint exists and functional |
| TASK-04     | 07-01, 07-03| System syncs task data (creation, completion, assignees) | ✗ BLOCKED | triggerInitialSync called but will silently fail     |
| TASK-05     | 07-01, 07-03| System syncs time tracking where available           | ✗ BLOCKED   | Sync service has logic but won't be triggered correctly|
| TASK-06     | 07-03       | User sees "What we'll import" explanation             | ✓ SATISFIED | InfoAccordion with 5 items on connect-task page       |

**Coverage:** 4/6 requirements satisfied, 2 blocked by parameter mismatch

### Anti-Patterns Found

| File                                      | Line | Pattern       | Severity    | Impact                                                    |
| ----------------------------------------- | ---- | ------------- | ----------- | --------------------------------------------------------- |
| `apps/api/src/routes/oauth/asana.ts`      | 149  | Wrong params  | 🛑 Blocker  | integration.id passed where organizationId expected       |
| `apps/api/src/routes/oauth/clickup.ts`    | 158  | Wrong params  | 🛑 Blocker  | integration.id passed where organizationId expected       |
| `apps/api/src/routes/oauth/linear.ts`     | 149  | Wrong params  | 🛑 Blocker  | integration.id passed where organizationId expected       |

**Pattern: Parameter Mismatch**

All three OAuth callbacks call:
```typescript
taskSyncService.triggerInitialSync(integration.id, "asana").catch(...)
```

But the method signature is:
```typescript
async triggerInitialSync(organizationId: string, provider: TaskProvider): Promise<void>
```

The method then looks up integrations by:
```typescript
const integrations = await integrationRepository.findByOrganizationAndProvider(
  organizationId,  // Receives integration.id instead
  provider
);
```

This lookup will fail because `integration.id` (a Firestore document ID like `abc123def456`) is not the same as `integration.organizationId` (the tenant ID). The error is caught and logged, making the failure silent.

**Why this happened:**
The gap fix followed the pattern from hrisSyncService and calendarSyncService (which accept `integrationId`), but taskSyncService uses a different signature (`organizationId + provider`).

### Human Verification Required

**None.** The gap is programmatically verifiable through parameter type mismatch.

### Gaps Summary

**1 critical gap remains after re-verification:**

The wiring is now present (commit e0f6223 added imports and calls), but a **parameter mismatch bug** was introduced:

**What works:**
1. ✓ OAuth flow completes successfully
2. ✓ Integration is created in Firestore
3. ✓ taskSyncService.triggerInitialSync() is called

**What's broken:**
4. ✗ **Wrong parameter passed** (integration.id instead of state.organizationId)
5. ✗ **Lookup fails silently** (no integration found for that org ID)
6. ✗ **No tasks are imported**

**Root cause:** API inconsistency between sync services. The gap fix blindly followed the HRIS/Calendar pattern without checking taskSyncService's actual signature.

**Fix options:**

**Option A (Quick fix):** Change OAuth callback parameter
```typescript
// In all three OAuth callbacks, change from:
taskSyncService.triggerInitialSync(integration.id, "asana")
// To:
taskSyncService.triggerInitialSync(state.organizationId, "asana")
```

**Option B (Consistency fix):** Change taskSyncService signature to match other services
```typescript
// Change triggerInitialSync signature from:
async triggerInitialSync(organizationId: string, provider: TaskProvider): Promise<void>
// To:
async triggerInitialSync(integrationId: string): Promise<void>
// Then get organizationId and provider from the integration object
```

**Recommendation:** Option A is simpler and safer. Option B requires refactoring taskSyncService internals.

---

_Verified: 2026-02-27T10:45:00Z_
_Verifier: Claude (gsd-verifier)_
