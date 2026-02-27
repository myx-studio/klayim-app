---
phase: 05-calendar-integration
plan: 03
subsystem: api
tags: [webhook, push-notifications, oauth-callback, google-calendar, microsoft-graph, scheduled-functions, polling]

# Dependency graph
requires:
  - phase: 05-calendar-integration
    plan: 01
    provides: OAuth services with token exchange and refresh
  - phase: 05-calendar-integration
    plan: 02
    provides: Calendar sync service with incremental sync support
provides:
  - Webhook registration during OAuth callback for real-time calendar updates
  - Webhook handler service for processing queued notifications
  - Scheduled polling function (15 min) as fallback for missed webhooks
  - Scheduled webhook renewal function to prevent expiration
  - Frontend OAuth flow integration with callback handling
affects: [calendar-event-processing, meeting-cost-calculation, dashboard-sync-status]

# Tech tracking
tech-stack:
  added: []
  patterns: [webhook registration on OAuth callback, scheduled polling as webhook fallback, webhook renewal before expiration]

key-files:
  created:
    - apps/api/src/services/webhook-handler.service.ts
    - apps/api/src/functions/calendar-poll.function.ts
    - apps/api/src/functions/webhook-renew.function.ts
    - apps/api/src/functions/index.ts
    - apps/web/src/lib/api/integrations.ts
  modified:
    - apps/api/src/services/google-calendar.service.ts
    - apps/api/src/services/microsoft-calendar.service.ts
    - apps/api/src/routes/oauth/google.ts
    - apps/api/src/routes/oauth/microsoft.ts
    - apps/api/src/services/index.ts
    - apps/api/src/repositories/integration.repository.ts
    - apps/web/src/components/pages/onboarding/connect-calendar/index.tsx
    - apps/web/src/components/onboarding/provider-card.tsx

key-decisions:
  - "Webhook registration best-effort: continue without if registration fails"
  - "Google webhooks re-registered on renewal (no PATCH support)"
  - "Microsoft webhooks renewed via PATCH with 3-day extension"
  - "Channel token format {organizationId}:{secret} for verification"
  - "Polling fallback every 15 minutes catches missed webhooks"
  - "OAuth callback status shown via toast notifications"

patterns-established:
  - "Webhook lifecycle: register on connect, verify on notify, renew before expiration"
  - "Frontend OAuth flow: get auth URL -> redirect -> handle callback params"
  - "ProviderCard connected state with email display and reconnect option"

requirements-completed: [CAL-04, CAL-05, CAL-06]

# Metrics
duration: 6min
completed: 2026-02-27
---

# Phase 05 Plan 03: Webhooks and Frontend Wiring Summary

**Real-time calendar sync via webhook push notifications with polling fallback and frontend OAuth integration**

## Performance

- **Duration:** 6 minutes
- **Started:** 2026-02-27T07:00:00Z
- **Completed:** 2026-02-27T07:06:00Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Webhook registration added to OAuth callbacks for both Google and Microsoft calendars
- Webhook handler service processes queued notifications and triggers incremental sync
- Scheduled polling function provides 15-minute fallback for reliability
- Scheduled webhook renewal function prevents subscription expiration
- Frontend connect buttons now trigger real OAuth flows with callback handling
- ProviderCard updated to show connected state with account email

## Task Commits

Each task was committed atomically:

1. **Task 1: Add webhook registration to calendar services** - `b0f8690` (feat)
2. **Task 2: Create webhook handler service and scheduled functions** - `31dcf2b` (feat)
3. **Task 3: Wire frontend connect buttons to OAuth flow** - `78f3f4d` (feat)

## Files Created/Modified
- `apps/api/src/services/google-calendar.service.ts` - Added registerWebhook and stopWebhook methods
- `apps/api/src/services/microsoft-calendar.service.ts` - Added registerWebhook, renewWebhook, deleteWebhook methods
- `apps/api/src/routes/oauth/google.ts` - Webhook registration on OAuth callback
- `apps/api/src/routes/oauth/microsoft.ts` - Webhook registration on OAuth callback
- `apps/api/src/services/webhook-handler.service.ts` - Notification processing service
- `apps/api/src/functions/calendar-poll.function.ts` - 15-minute polling fallback
- `apps/api/src/functions/webhook-renew.function.ts` - Automatic webhook renewal
- `apps/api/src/functions/index.ts` - Functions module export
- `apps/api/src/repositories/integration.repository.ts` - Added findAllConnectedByProvider
- `apps/web/src/lib/api/integrations.ts` - OAuth URL and integrations API client
- `apps/web/src/components/pages/onboarding/connect-calendar/index.tsx` - Full OAuth flow wiring
- `apps/web/src/components/onboarding/provider-card.tsx` - Connected state and loading states

## Decisions Made
- Webhook registration is best-effort: if it fails, OAuth still completes and polling provides backup
- Google webhooks cannot be renewed (no PATCH support), so they are re-registered on expiration
- Microsoft webhooks can be renewed via PATCH with 3-day extension
- Channel token/clientState uses format `{organizationId}:{secret}` for organization extraction
- OAuth callback status (success/error) is communicated via URL parameters and displayed with toast

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**External services require OAuth configuration from Phase 05-01:**
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from Google Cloud Console
- MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET from Azure AD Portal
- Webhook URLs must be accessible: {API_URL}/webhooks/google and {API_URL}/webhooks/microsoft

**Scheduled functions require deployment:**
- calendarPollFunction: Schedule every 15 minutes
- webhookRenewFunction: Schedule every 12 hours

## Next Phase Readiness
- Calendar integration is complete with real-time sync via webhooks
- Polling fallback ensures reliability even if webhooks are missed
- Webhook renewal prevents subscription expiration
- Frontend UI shows connected state and handles OAuth callbacks
- Ready for Phase 6 (HRIS Integration) or Phase 7 (Task Integration)

## Self-Check: PASSED

All created files verified to exist:
- apps/api/src/services/webhook-handler.service.ts
- apps/api/src/functions/calendar-poll.function.ts
- apps/api/src/functions/webhook-renew.function.ts
- apps/api/src/functions/index.ts
- apps/web/src/lib/api/integrations.ts

All commits verified:
- b0f8690: Task 1
- 31dcf2b: Task 2
- 78f3f4d: Task 3

---
*Phase: 05-calendar-integration*
*Completed: 2026-02-27*
