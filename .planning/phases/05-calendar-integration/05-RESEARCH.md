# Phase 5: Calendar Integration - Research

**Researched:** 2026-02-27
**Domain:** OAuth2 Calendar Integration (Google Workspace + Microsoft 365)
**Confidence:** HIGH

## Summary

Phase 5 implements the calendar integration flows that connect users' Google Workspace and Microsoft 365 calendars to Klayim. The infrastructure foundation built in Phase 4 (encrypted token storage, webhook endpoints, queue-based processing) is ready to be extended with provider-specific OAuth flows, event syncing, and webhook handlers.

The core pattern is: OAuth connect flow captures tokens, initial sync fetches historical events using incremental sync APIs (syncToken/deltaToken), webhooks deliver real-time updates, and a fallback polling job catches missed events. Both Google and Microsoft have well-documented APIs but differ in webhook renewal patterns and subscription limits.

**Primary recommendation:** Use `googleapis` for Google Calendar and `@azure/msal-node` + `@microsoft/microsoft-graph-client` for Microsoft 365. Implement full/incremental sync pattern with token persistence. Set up automated webhook channel renewal since both providers have limited channel lifetimes.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAL-01 | User can connect Google Workspace calendar via OAuth | googleapis OAuth2 client handles consent flow; store tokens via existing IntegrationRepository with encryption |
| CAL-02 | User can connect Microsoft 365 calendar via OAuth | @azure/msal-node ConfidentialClientApplication + authorization code flow; handle potential admin consent requirements |
| CAL-03 | System syncs calendar events (meetings, attendees, duration) | Google Events.list with syncToken; Microsoft calendarView/delta with deltaLink; store in calendar_events collection |
| CAL-04 | System receives real-time updates via webhooks | Existing webhook routes (google.webhook.ts, microsoft.webhook.ts) queue events; implement actual handlers |
| CAL-05 | System falls back to polling if webhooks miss events | Scheduled function performs incremental sync using stored sync tokens; webhook notifications trigger "catch-up" sync |
| CAL-06 | User sees "What we'll track" and "What we don't track" explanations | UI already exists in connect-calendar page; update to show actual permissions granted after connect |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| googleapis | ^148.0.0 | Google Calendar API client | Official Google SDK for Node.js, handles OAuth2 + Calendar API |
| @azure/msal-node | ^2.19.0 | Microsoft OAuth2 authentication | Official Microsoft authentication library for Node.js |
| @microsoft/microsoft-graph-client | ^3.0.7 | Microsoft Graph API client | Official SDK for Graph API calls including calendar |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @azure/identity | ^4.5.0 | Token credential provider | May need for certain MSAL configurations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| googleapis | google-auth-library + raw fetch | googleapis bundles auth + typed API; simpler but larger bundle |
| @microsoft/microsoft-graph-client | raw fetch to Graph API | SDK provides retry logic, pagination, and typing |

**Installation:**
```bash
cd apps/api && pnpm add googleapis @azure/msal-node @microsoft/microsoft-graph-client
```

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
├── services/
│   ├── calendar-sync.service.ts       # Core sync logic for both providers
│   ├── google-calendar.service.ts     # Google-specific API calls
│   └── microsoft-calendar.service.ts  # Microsoft-specific API calls
├── routes/
│   ├── oauth/
│   │   ├── google.ts                  # Google OAuth callback handler
│   │   └── microsoft.ts               # Microsoft OAuth callback handler
│   └── webhooks/
│       ├── google.webhook.ts          # (exists) Add handler implementation
│       └── microsoft.webhook.ts       # (exists) Add handler implementation
├── repositories/
│   ├── calendar-event.repository.ts   # Calendar event CRUD
│   └── sync-state.repository.ts       # Store syncToken/deltaLink per integration
├── types/
│   └── calendar.ts                    # CalendarEvent, SyncState types
└── functions/
    └── calendar-sync.function.ts      # Scheduled polling fallback
```

### Pattern 1: OAuth Authorization Code Flow
**What:** Exchange authorization code for tokens after user consent
**When to use:** Initial calendar connection during onboarding

**Google OAuth Flow:**
```typescript
// Source: https://developers.google.com/workspace/calendar/api/quickstart/nodejs
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.API_URL}/api/oauth/google/callback`
);

// Generate auth URL (frontend calls API, API returns URL)
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',  // Required for refresh token
  prompt: 'consent',       // Force consent to get refresh token
  scope: ['https://www.googleapis.com/auth/calendar.readonly'],
});

// Exchange code for tokens (in callback handler)
const { tokens } = await oauth2Client.getToken(code);
// tokens: { access_token, refresh_token, expiry_date }
```

**Microsoft OAuth Flow:**
```typescript
// Source: https://learn.microsoft.com/en-us/azure/active-directory/develop/tutorial-v2-nodejs-console
import { ConfidentialClientApplication } from '@azure/msal-node';

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    authority: 'https://login.microsoftonline.com/common', // Multi-tenant
  },
});

// Generate auth URL
const authUrl = await msalClient.getAuthCodeUrl({
  scopes: ['Calendars.Read', 'offline_access'],
  redirectUri: `${process.env.API_URL}/api/oauth/microsoft/callback`,
});

// Exchange code for tokens
const response = await msalClient.acquireTokenByCode({
  code,
  scopes: ['Calendars.Read', 'offline_access'],
  redirectUri: `${process.env.API_URL}/api/oauth/microsoft/callback`,
});
// response: { accessToken, account }
```

### Pattern 2: Full + Incremental Sync
**What:** Initial full sync retrieves all events; subsequent syncs use tokens for changes only
**When to use:** Every calendar sync operation

**Google Calendar Sync:**
```typescript
// Source: https://developers.google.com/workspace/calendar/api/guides/sync
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Full sync (first time)
const response = await calendar.events.list({
  calendarId: 'primary',
  timeMin: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days back
  singleEvents: true,
  maxResults: 250,
});
const syncToken = response.data.nextSyncToken; // Store this!

// Incremental sync (subsequent)
const incrementalResponse = await calendar.events.list({
  calendarId: 'primary',
  syncToken: storedSyncToken,
});
// Handle 410 GONE: clear local data, perform full sync again
```

**Microsoft Graph Delta Sync:**
```typescript
// Source: https://learn.microsoft.com/en-us/graph/delta-query-events
import { Client } from '@microsoft/microsoft-graph-client';

const client = Client.init({
  authProvider: (done) => done(null, accessToken),
});

// Full sync with date range
const response = await client
  .api('/me/calendarView/delta')
  .query({
    startDateTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    endDateTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  })
  .get();
const deltaLink = response['@odata.deltaLink']; // Store this!

// Incremental sync
const deltaResponse = await client.api(storedDeltaLink).get();
```

### Pattern 3: Webhook Setup and Renewal
**What:** Register webhook channels for real-time notifications
**When to use:** After successful OAuth connection

**Google Push Notifications:**
```typescript
// Source: https://developers.google.com/workspace/calendar/api/guides/push
const channelId = crypto.randomUUID();
const channelToken = `${organizationId}:${crypto.randomBytes(16).toString('hex')}`;

const response = await calendar.events.watch({
  calendarId: 'primary',
  requestBody: {
    id: channelId,
    type: 'web_hook',
    address: `${process.env.API_URL}/api/webhooks/google`,
    token: channelToken, // Sent back in X-Goog-Channel-Token
    expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // Max ~7 days (API may return less)
  },
});
// Store: channelId, resourceId (for stop), expiration
```

**Microsoft Graph Subscription:**
```typescript
// Source: https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions
const clientState = `${organizationId}:${crypto.randomBytes(16).toString('hex')}`;

const subscription = await client.api('/subscriptions').post({
  changeType: 'created,updated,deleted',
  notificationUrl: `${process.env.API_URL}/api/webhooks/microsoft`,
  resource: 'me/events',
  expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Max ~7 days for events
  clientState,
});
// Store: subscription.id, expirationDateTime
```

### Anti-Patterns to Avoid
- **Full sync on every webhook:** Webhook notifications are signals, not data. Perform incremental sync with stored token.
- **Ignoring 410 GONE:** When sync tokens expire, must clear local data and full sync. Don't retry with same token.
- **Hardcoding webhook expiration:** Both providers may return shorter expiration than requested. Always use returned value.
- **Single webhook channel per org:** If multiple users connect same provider, each needs separate channel/subscription.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token refresh | Manual refresh endpoint calls | `googleapis` auto-refresh + existing TokenRefreshService | Token expiry edge cases, retry logic |
| Pagination | Manual nextPageToken handling | Library iteration methods | Off-by-one errors, state management |
| Webhook signature verification | Custom HMAC | Existing `webhook-verification.ts` | Timing-safe comparison already implemented |
| Calendar event normalization | Per-provider mapping inline | Shared CalendarEvent type + mappers | Google/Microsoft return different shapes |

**Key insight:** The googleapis library handles token refresh automatically when you set credentials with a refresh_token. MSAL requires explicit `acquireTokenSilent` or refresh calls.

## Common Pitfalls

### Pitfall 1: Missing Refresh Token
**What goes wrong:** Google only returns refresh_token on first authorization
**Why it happens:** Subsequent authorizations return only access_token unless `prompt: 'consent'` is set
**How to avoid:** Always include `access_type: 'offline'` and `prompt: 'consent'` in auth URL
**Warning signs:** Token refresh fails with "invalid_grant"

### Pitfall 2: Webhook Channel Expiration
**What goes wrong:** Webhooks stop working after 7 days (Google) or 3-7 days (Microsoft)
**Why it happens:** Channels expire, no automatic renewal
**How to avoid:** Store expiration time, scheduled job renews channels before expiry
**Warning signs:** Webhooks stop arriving, no errors logged

### Pitfall 3: Microsoft Admin Consent Required
**What goes wrong:** Non-admin users cannot authorize calendar access
**Why it happens:** Organization policy requires admin consent for third-party apps
**How to avoid:** Document admin consent flow, provide admin consent URL, handle consent error gracefully
**Warning signs:** OAuth callback returns `AADSTS65001` or `consent_required` error

### Pitfall 4: Google Granular OAuth Consent (2026)
**What goes wrong:** User denies calendar scope but grants others
**Why it happens:** Google's granular consent allows partial permission grants
**How to avoid:** Check granted scopes in callback, handle degraded experience gracefully
**Warning signs:** Integration created but calendar sync fails with 403

### Pitfall 5: Sync Token Invalidation (410 GONE)
**What goes wrong:** Incremental sync returns 410 error
**Why it happens:** Token expired (Google) or delta link invalid (Microsoft)
**How to avoid:** Catch 410, clear sync state, perform full sync, store new token
**Warning signs:** Repeated 410 errors, sync jobs failing

### Pitfall 6: Rate Limiting
**What goes wrong:** API calls fail with 429 or quota exceeded
**Why it happens:** Too many sync operations, especially during initial bulk import
**How to avoid:** Implement exponential backoff (already in integration decisions), batch operations where possible
**Warning signs:** Intermittent 429 errors, especially during bulk operations

## Code Examples

### Google OAuth Callback Handler
```typescript
// Source: googleapis documentation + project patterns
import { google } from 'googleapis';
import { integrationRepository, type OAuthCredentials } from '@/repositories';
import { integrationService } from '@/services';

export async function handleGoogleCallback(
  code: string,
  organizationId: string,
  userId: string
): Promise<Integration> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.API_URL}/api/oauth/google/callback`
  );

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error('No refresh token received. User may need to revoke and reconnect.');
  }

  // Get user info to identify the account
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  const credentials: OAuthCredentials = {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiresAt: new Date(tokens.expiry_date!).toISOString(),
  };

  return integrationService.connectIntegration({
    organizationId,
    provider: 'google_calendar',
    accountEmail: userInfo.data.email!,
    accountId: userInfo.data.id!,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    credentials,
  });
}
```

### Microsoft OAuth Callback Handler
```typescript
// Source: MSAL documentation + project patterns
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';

export async function handleMicrosoftCallback(
  code: string,
  organizationId: string,
  userId: string
): Promise<Integration> {
  const msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      authority: 'https://login.microsoftonline.com/common',
    },
  });

  const response = await msalClient.acquireTokenByCode({
    code,
    scopes: ['Calendars.Read', 'offline_access', 'User.Read'],
    redirectUri: `${process.env.API_URL}/api/oauth/microsoft/callback`,
  });

  // Get user info
  const graphClient = Client.init({
    authProvider: (done) => done(null, response.accessToken),
  });
  const me = await graphClient.api('/me').get();

  const credentials: OAuthCredentials = {
    accessToken: response.accessToken,
    refreshToken: response.account?.homeAccountId || '', // MSAL caches refresh tokens internally
    expiresAt: response.expiresOn?.toISOString() || new Date(Date.now() + 3600 * 1000).toISOString(),
  };

  return integrationService.connectIntegration({
    organizationId,
    provider: 'microsoft_calendar',
    accountEmail: me.mail || me.userPrincipalName,
    accountId: me.id,
    scopes: ['Calendars.Read'],
    credentials,
  });
}
```

### Calendar Event Type
```typescript
// Normalized calendar event for storage
export interface CalendarEvent {
  id: string;
  organizationId: string;
  integrationId: string; // Which calendar integration this came from

  // Event identification
  externalId: string; // Provider's event ID
  provider: 'google_calendar' | 'microsoft_calendar';

  // Event details (what we track)
  title: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  durationMinutes: number;
  isAllDay: boolean;

  // Attendees
  organizerEmail: string;
  attendees: Array<{
    email: string;
    responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>;

  // Recurring
  recurringEventId?: string; // ID of master event if recurring

  // Metadata
  status: 'confirmed' | 'tentative' | 'cancelled';
  createdAt: string;
  updatedAt: string;

  // For cost calculation (linked later)
  calculatedCostCents?: number;
}
```

### Sync State Type
```typescript
// Track sync state per integration
export interface SyncState {
  id: string; // Same as integrationId
  organizationId: string;
  integrationId: string;

  // Provider-specific sync tokens
  syncToken?: string;      // Google syncToken
  deltaLink?: string;      // Microsoft @odata.deltaLink

  // Sync status
  lastFullSyncAt?: string;
  lastIncrementalSyncAt?: string;
  lastSyncError?: string;

  // Webhook state
  webhookChannelId?: string;
  webhookResourceId?: string; // Google resourceId for stop
  webhookExpiration?: string;

  createdAt: string;
  updatedAt: string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full sync every poll | Incremental sync with tokens | Always available | Massive reduction in API calls |
| Single OAuth consent screen | Granular OAuth consent (Google) | Rolling out 2025-2026 | Must handle partial permission grants |
| Long-lived tokens | Short-lived access + refresh | OAuth 2.0 standard | Already handled by infrastructure |
| Push notification only | Push + delta fallback | Best practice | Reliability for missed webhooks |

**Deprecated/outdated:**
- `modifiedSince` parameter for Google sync: Use syncToken instead (more reliable)
- Google `calendar.v3` without syncToken: Less efficient, more error-prone

## Open Questions

1. **Microsoft tenant configuration**
   - What we know: Some organizations require admin consent before users can authorize
   - What's unclear: How common this is in target customer base
   - Recommendation: Implement clear error handling and admin consent URL generation

2. **Recurring event expansion**
   - What we know: Google `singleEvents: true` expands recurring events; Microsoft calendar view does similar
   - What's unclear: Whether to store master recurring event or expanded instances
   - Recommendation: Store expanded instances for simpler cost calculation; track recurringEventId for grouping

3. **Multi-calendar sync**
   - What we know: Users may have multiple calendars (primary, work, shared)
   - What's unclear: Whether to sync all calendars or just primary
   - Recommendation: Start with primary calendar only; expand in v2 if needed

## Sources

### Primary (HIGH confidence)
- [Google Calendar API Quickstart for Node.js](https://developers.google.com/workspace/calendar/api/quickstart/nodejs)
- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push)
- [Google Calendar Synchronization Guide](https://developers.google.com/workspace/calendar/api/guides/sync)
- [Microsoft Graph Create Subscription](https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0)
- [Microsoft Graph Change Notifications for Outlook](https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview)
- [Microsoft Graph Delta Query Events](https://learn.microsoft.com/en-us/graph/delta-query-events)
- [Microsoft Graph Subscription Resource](https://learn.microsoft.com/en-us/graph/api/resources/subscription?view=graph-rest-1.0)

### Secondary (MEDIUM confidence)
- [Google Granular OAuth Consent](https://medium.com/google-cloud/what-google-workspace-developers-need-to-know-about-granular-oauth-consent-ded63df85bf3)
- [Microsoft Entra Admin Consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent)
- [googleapis npm](https://www.npmjs.com/package/googleapis)

### Project Context (HIGH confidence)
- Phase 4 CONTEXT.md - OAuth encryption and webhook architecture decisions
- Phase 4 SUMMARYs - Encryption library, repositories, webhook endpoints already built

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDKs well-documented, widely used
- Architecture: HIGH - Google/Microsoft patterns are well-established
- Pitfalls: HIGH - Common issues documented in official guides and community

**Research date:** 2026-02-27
**Valid until:** 2026-04-27 (60 days - stable APIs)
