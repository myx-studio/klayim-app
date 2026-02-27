---
phase: 05-calendar-integration
plan: 01
subsystem: api
tags: [oauth, google-calendar, microsoft-graph, googleapis, msal-node, calendar-integration]

# Dependency graph
requires:
  - phase: 04-integration-infrastructure
    provides: integration repository with encrypted token storage
provides:
  - Google Calendar OAuth service with authorization and token refresh
  - Microsoft Calendar OAuth service with authorization and token refresh
  - OAuth routes at /oauth/google and /oauth/microsoft
  - CalendarEvent and SyncState types for event storage
affects: [05-02-calendar-sync, calendar-event-processing, meeting-cost-calculation]

# Tech tracking
tech-stack:
  added: [googleapis, @azure/msal-node, @microsoft/microsoft-graph-client]
  patterns: [OAuth state parameter for callback context, multi-tenant OAuth with common authority]

key-files:
  created:
    - apps/api/src/services/google-calendar.service.ts
    - apps/api/src/services/microsoft-calendar.service.ts
    - apps/api/src/routes/oauth/google.ts
    - apps/api/src/routes/oauth/microsoft.ts
    - apps/api/src/routes/oauth/index.ts
    - packages/shared/src/types/calendar.ts
  modified:
    - apps/api/src/services/token-refresh.service.ts
    - apps/api/src/routes/index.ts
    - apps/api/src/index.ts
    - apps/api/src/services/index.ts
    - packages/shared/src/types/index.ts

key-decisions:
  - "Use googleapis Auth.OAuth2Client type import instead of google-auth-library"
  - "MSAL common authority for multi-tenant support (personal and work Microsoft accounts)"
  - "OAuth state carries organizationId and redirectUrl for callback context"
  - "Extract refresh token from MSAL cache since it's not exposed in token response"

patterns-established:
  - "OAuth service pattern: createClient, getAuthUrl, exchangeCode, refreshToken"
  - "OAuth route pattern: /authorize (protected) returns URL, /callback (public) handles redirect"
  - "State parameter JSON structure: {organizationId, redirectUrl} for all providers"

requirements-completed: [CAL-01, CAL-02]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 05 Plan 01: Calendar OAuth Setup Summary

**Google and Microsoft OAuth services with authorization endpoints enabling users to connect their calendars**

## Performance

- **Duration:** 5 minutes
- **Started:** 2026-02-27T06:43:45Z
- **Completed:** 2026-02-27T06:48:45Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Installed googleapis, @azure/msal-node, and @microsoft/microsoft-graph-client packages
- Created CalendarEvent and SyncState types for normalized event storage
- Implemented Google Calendar OAuth with authorization, callback, and token refresh
- Implemented Microsoft Calendar OAuth with MSAL for multi-tenant support
- Replaced stub implementations in token-refresh.service with actual provider calls

## Task Commits

Each task was committed atomically:

1. **Task 1: Install calendar SDKs and create CalendarEvent types** - `c2aa1f4` (feat)
2. **Task 2: Create Google Calendar service with OAuth flow** - `fbb74e8` (feat)
3. **Task 3: Create Microsoft Calendar service with OAuth flow** - `377a99d` (feat)

## Files Created/Modified
- `packages/shared/src/types/calendar.ts` - CalendarEvent and SyncState types
- `apps/api/src/services/google-calendar.service.ts` - Google OAuth and Calendar client
- `apps/api/src/services/microsoft-calendar.service.ts` - Microsoft OAuth and Graph client
- `apps/api/src/routes/oauth/google.ts` - Google OAuth authorize and callback routes
- `apps/api/src/routes/oauth/microsoft.ts` - Microsoft OAuth authorize and callback routes
- `apps/api/src/routes/oauth/index.ts` - OAuth route aggregator
- `apps/api/src/services/token-refresh.service.ts` - Actual refresh implementations

## Decisions Made
- Used Auth.OAuth2Client type from googleapis instead of direct google-auth-library import (build compatibility)
- Microsoft uses "common" authority for multi-tenant support (both personal and work accounts)
- OAuth state parameter carries organizationId and redirectUrl as JSON for callback context
- Extract refresh token from MSAL token cache since acquireTokenByCode doesn't expose it directly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration:**
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from Google Cloud Console
- MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET from Azure AD Portal
- Redirect URIs must be configured in both providers pointing to /oauth/*/callback

## Next Phase Readiness
- OAuth flows complete and ready for calendar sync implementation
- CalendarEvent type ready for event storage
- SyncState type ready for incremental sync tracking
- Token refresh working for both providers

## Self-Check: PASSED

All created files verified to exist:
- packages/shared/src/types/calendar.ts
- apps/api/src/services/google-calendar.service.ts
- apps/api/src/services/microsoft-calendar.service.ts

All commits verified:
- c2aa1f4: Task 1
- fbb74e8: Task 2
- 377a99d: Task 3

---
*Phase: 05-calendar-integration*
*Completed: 2026-02-27*
