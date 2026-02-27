---
phase: 04-integration-infrastructure
plan: 03
subsystem: infra
tags: [webhooks, hmac, firestore-rules, multi-tenant, idempotency, queue]

# Dependency graph
requires:
  - phase: 04-02
    provides: Integration and employee repositories with encrypted credential storage
provides:
  - Webhook signature verification library with timing-safe comparisons
  - Queue-based webhook processing with retry logic
  - Processed event repository for idempotency tracking
  - Google Calendar webhook endpoint with sync message handling
  - Microsoft Graph webhook endpoint with validation token handling
  - Firestore security rules for multi-tenant isolation
affects: [05-calendar-sync, 06-hris-integration, 07-task-integration]

# Tech tracking
tech-stack:
  added: [crypto.timingSafeEqual]
  patterns: [queue-based webhook processing, webhook signature verification, organizationId isolation]

key-files:
  created:
    - apps/api/src/lib/webhook-verification.ts
    - apps/api/src/repositories/webhook-queue.repository.ts
    - apps/api/src/repositories/webhook-processed-event.repository.ts
    - apps/api/src/services/webhook-queue.service.ts
    - apps/api/src/routes/webhooks/google.webhook.ts
    - apps/api/src/routes/webhooks/microsoft.webhook.ts
    - apps/api/src/routes/webhooks/index.ts
  modified:
    - apps/api/src/lib/index.ts
    - apps/api/src/repositories/index.ts
    - apps/api/src/services/index.ts
    - apps/api/src/routes/index.ts
    - apps/api/src/index.ts
    - firestore.rules

key-decisions:
  - "Separate processed_events collection from processed_stripe_events for clarity"
  - "Channel token format: {organizationId}:{secret} for org extraction"
  - "Queue webhooks immediately, process async (respond within 3s for Google)"
  - "Microsoft expects 202 Accepted, not 200 OK"

patterns-established:
  - "Webhook verification uses crypto.timingSafeEqual to prevent timing attacks"
  - "Queue-based webhook processing: accept quickly, process in background"
  - "Idempotency via processed_events collection with provider:eventId format"
  - "Firestore rules enforce organizationId isolation at document level"
  - "All org members can read integrations, only admins can manage"

requirements-completed: [INFRA-03, INFRA-04, INFRA-05, INFRA-06]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 04 Plan 03: Webhooks and Security Summary

**Webhook infrastructure with timing-safe signature verification, queue-based processing with idempotency, and Firestore security rules for multi-tenant isolation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T06:16:25Z
- **Completed:** 2026-02-27T06:20:01Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Webhook signature verification for Google, Microsoft, BambooHR, Asana, ClickUp, Linear
- Queue-based webhook processing with retry logic (30s interval, 5 max retries)
- Idempotency tracking via processed_events collection
- Firestore security rules with organizationId isolation for all tenant-scoped collections

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Webhook Verification Library, Queue, and Processed Event Repository** - `f98dc32` (feat)
2. **Task 2: Create Webhook Routes for Google and Microsoft** - `2faf8e8` (feat)
3. **Task 3: Update Firestore Security Rules** - `9a6d218` (feat)

## Files Created/Modified

- `apps/api/src/lib/webhook-verification.ts` - Signature verification for all webhook providers
- `apps/api/src/lib/index.ts` - Export webhook verification utilities
- `apps/api/src/repositories/webhook-queue.repository.ts` - Queue CRUD with retry logic
- `apps/api/src/repositories/webhook-processed-event.repository.ts` - Idempotency tracking
- `apps/api/src/repositories/index.ts` - Export new repositories
- `apps/api/src/services/webhook-queue.service.ts` - Queue management with process and retry
- `apps/api/src/services/index.ts` - Export webhook queue service
- `apps/api/src/routes/webhooks/google.webhook.ts` - Google Calendar webhook endpoint
- `apps/api/src/routes/webhooks/microsoft.webhook.ts` - Microsoft Graph webhook endpoint
- `apps/api/src/routes/webhooks/index.ts` - Mount provider-specific webhooks
- `apps/api/src/routes/index.ts` - Export webhooks route
- `apps/api/src/index.ts` - Mount webhooks routes
- `firestore.rules` - Multi-tenant security rules with organizationId enforcement

## Decisions Made

- Created separate `processed_events` collection from existing `processed_stripe_events` for webhook idempotency
- Channel token format `{organizationId}:{secret}` allows quick org extraction without database lookup
- Google webhook responds within 3 seconds per their requirements by queuing immediately
- Microsoft webhook returns 202 Accepted per their API specification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Webhook endpoints ready for Google Calendar (Phase 5) and Microsoft Graph (Phase 5)
- Signature verification functions ready for BambooHR, Finch (Phase 6), and task providers (Phase 7)
- Queue-based processing infrastructure ready for actual webhook handlers
- Security rules deployed and enforcing organizationId isolation

---
*Phase: 04-integration-infrastructure*
*Completed: 2026-02-27*

## Self-Check: PASSED

All files verified:
- apps/api/src/lib/webhook-verification.ts - FOUND
- apps/api/src/repositories/webhook-queue.repository.ts - FOUND
- apps/api/src/repositories/webhook-processed-event.repository.ts - FOUND
- apps/api/src/services/webhook-queue.service.ts - FOUND
- apps/api/src/routes/webhooks/google.webhook.ts - FOUND
- apps/api/src/routes/webhooks/microsoft.webhook.ts - FOUND
- firestore.rules - FOUND

All commits verified:
- f98dc32 - FOUND
- 2faf8e8 - FOUND
- 9a6d218 - FOUND
