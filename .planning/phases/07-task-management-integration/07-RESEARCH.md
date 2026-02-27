# Phase 7: Task Management Integration - Research

**Researched:** 2026-02-27
**Domain:** Task Management APIs (Asana, ClickUp, Linear) - OAuth, Data Sync, Time Tracking
**Confidence:** HIGH

## Summary

Phase 7 implements OAuth integrations with three task management providers: Asana, ClickUp, and Linear. Each provider offers OAuth 2.0 authentication with varying implementation details. The project already has established patterns for OAuth flows (from Phase 5 Calendar Integration) and sync services (from Phase 6 HRIS Integration) that should be followed.

**Key findings:**
- All three providers support OAuth 2.0 with authorization code grant
- Asana and ClickUp have native time tracking APIs; Linear uses estimates only (no time entries)
- Webhook signature verification functions already exist in `apps/api/src/lib/webhook-verification.ts`
- Task provider types (`asana`, `clickup`, `linear`) already defined in `IntegrationProvider` type

**Primary recommendation:** Follow established OAuth service pattern from `google-calendar.service.ts` and sync pattern from `hris-sync.service.ts`. Create a unified `TaskSyncService` similar to `HRISSyncService` to handle all three providers.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TASK-01 | User can connect Asana workspace via OAuth | Asana OAuth 2.0 with node-asana SDK v3, handshake-based webhook setup |
| TASK-02 | User can connect ClickUp workspace via OAuth | ClickUp OAuth 2.0 with REST API, X-Signature webhook verification |
| TASK-03 | User can connect Linear workspace via OAuth | Linear OAuth 2.0 with @linear/sdk, PKCE support, Linear-Signature webhooks |
| TASK-04 | System syncs task data (creation date, completion, assignees) | All providers expose: id, title, assignee, completed_at, created_at, status |
| TASK-05 | System syncs time tracking data where available | Asana: actual_time_minutes + time_tracking_entries; ClickUp: time_spent + time_estimate; Linear: estimate only (no time entries) |
| TASK-06 | User sees "What we'll import" explanation before connecting | Frontend InfoAccordion pattern from HRIS integration |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `asana` | ^3.1.5 | Official Asana Node.js SDK | Official SDK with typed models, OAuth support built-in |
| `@linear/sdk` | ^76.0.0 | Official Linear TypeScript SDK | GraphQL schema with strongly typed models |
| (none) | - | ClickUp REST API | No official SDK; direct fetch with typed responses |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `hono` | existing | HTTP routes for OAuth callbacks and webhooks | Already in project |
| `crypto` | built-in | HMAC signature verification | Already using in webhook-verification.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct Linear GraphQL | @linear/sdk | SDK provides typed queries, pagination helpers - use SDK |
| Community ClickUp SDK | Direct REST API | No official/maintained SDK; REST API is well-documented |
| asana v1 SDK | asana v3 SDK | v1 deprecated; v3 has better TypeScript support |

**Installation:**
```bash
npm install asana @linear/sdk
```

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
├── services/
│   ├── asana.service.ts          # Asana OAuth + task fetch
│   ├── clickup.service.ts        # ClickUp OAuth + task fetch
│   ├── linear.service.ts         # Linear OAuth + issue fetch
│   └── task-sync.service.ts      # Unified task sync orchestration
├── routes/oauth/
│   ├── asana.ts                  # /oauth/asana/authorize, /callback
│   ├── clickup.ts                # /oauth/clickup/authorize, /callback
│   └── linear.ts                 # /oauth/linear/authorize, /callback
└── routes/webhooks/
    ├── asana.webhook.ts          # POST /webhooks/asana
    ├── clickup.webhook.ts        # POST /webhooks/clickup
    └── linear.webhook.ts         # POST /webhooks/linear
packages/shared/src/types/
└── task.ts                       # Task, TaskStatus, TaskProvider types
```

### Pattern 1: OAuth Service Pattern (from Calendar Integration)
**What:** Service class with getAuthUrl, exchangeCode, refreshToken methods
**When to use:** Each provider service
**Example:**
```typescript
// Source: apps/api/src/services/google-calendar.service.ts
class AsanaService {
  private readonly scopes = ["default"]; // Asana uses default scope

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.ASANA_CLIENT_ID!,
      redirect_uri: `${process.env.API_URL}/oauth/asana/callback`,
      response_type: "code",
      state,
    });
    return `https://app.asana.com/-/oauth_authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<ExchangeResult> { ... }
  async refreshToken(refreshToken: string): Promise<RefreshResult> { ... }
}
```

### Pattern 2: Sync Service Pattern (from HRIS Integration)
**What:** Orchestration service that handles multiple providers with unified interface
**When to use:** Task sync implementation
**Example:**
```typescript
// Source: apps/api/src/services/hris-sync.service.ts
class TaskSyncService {
  async syncFromAsana(organizationId: string, accessToken: string): Promise<TaskSyncResult> { ... }
  async syncFromClickUp(organizationId: string, accessToken: string, workspaceId: string): Promise<TaskSyncResult> { ... }
  async syncFromLinear(organizationId: string, accessToken: string): Promise<TaskSyncResult> { ... }

  async triggerInitialSync(integrationId: string): Promise<void> {
    // Same pattern as hrisSyncService.triggerInitialSync
  }
}
```

### Pattern 3: Webhook Handshake Pattern (Asana-specific)
**What:** Asana requires two-phase webhook setup with X-Hook-Secret handshake
**When to use:** Asana webhook registration
**Example:**
```typescript
// During webhook creation, Asana sends POST with X-Hook-Secret header
// Must respond with 200 and echo X-Hook-Secret in response header
// Store secret for future signature verification
app.post("/webhooks/asana", async (c) => {
  const hookSecret = c.req.header("X-Hook-Secret");
  if (hookSecret) {
    // Handshake request
    c.header("X-Hook-Secret", hookSecret);
    // Store hookSecret for this webhook
    return c.text("", 200);
  }
  // Normal webhook event - verify X-Hook-Signature
  const signature = c.req.header("X-Hook-Signature");
  // Use existing verifyAsanaWebhook from webhook-verification.ts
});
```

### Anti-Patterns to Avoid
- **Building separate sync paths for initial vs incremental:** Use unified sync with cursor/token patterns
- **Storing webhook secrets unencrypted:** Use same encryption as OAuth tokens
- **Blocking OAuth callback with sync:** Trigger initial sync async (don't await)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Asana API calls | Custom fetch wrapper | `asana` SDK v3 | Handles pagination, rate limits, typed responses |
| Linear GraphQL queries | Manual query strings | `@linear/sdk` | Typed queries, pagination helpers, error handling |
| HMAC signature verification | Custom implementation | Existing `verifyAsanaWebhook`, `verifyClickUpWebhook`, `verifyLinearWebhook` | Already implemented with timing-safe comparison |
| OAuth state management | Custom state storage | JSON in state parameter | Established pattern from Calendar/HRIS OAuth |

**Key insight:** Webhook signature verification is already implemented. The only new code needed is the provider-specific OAuth services and task data mapping.

## Common Pitfalls

### Pitfall 1: Asana Webhook Handshake Timeout
**What goes wrong:** Asana webhook creation fails silently
**Why it happens:** Asana expects handshake response within 10 seconds
**How to avoid:** Process asynchronously, respond to handshake immediately
**Warning signs:** Webhook creation returns success but no events received

### Pitfall 2: ClickUp Workspace vs Team ID Confusion
**What goes wrong:** API calls fail with 401/404
**Why it happens:** ClickUp API uses "team" for workspace in many endpoints
**How to avoid:** Store workspaceId (from OAuth response) as accountId, use it for API calls
**Warning signs:** "Authorization failed" errors after successful OAuth

### Pitfall 3: Linear OAuth Refresh Token Migration
**What goes wrong:** Tokens stop working after April 2026
**Why it happens:** Linear is migrating to mandatory refresh tokens
**How to avoid:** Always request and store refresh tokens, implement refresh flow
**Warning signs:** Access denied errors on existing integrations

### Pitfall 4: Linear Has No Time Tracking
**What goes wrong:** Looking for time_spent field that doesn't exist
**Why it happens:** Linear uses "estimate" (story points) not time tracking
**How to avoid:** Map Linear's `estimate` field to estimatePoints, not time
**Warning signs:** Null/undefined time values for all Linear tasks

### Pitfall 5: Asana Time Tracking Requires Separate API Call
**What goes wrong:** actual_time_minutes is null on task fetch
**Why it happens:** Time tracking entries require scope `time_tracking_entries:read` and separate endpoint
**How to avoid:** Request time tracking scope, use `/tasks/{task_gid}/time_tracking_entries` endpoint
**Warning signs:** Tasks import but no time data

## Code Examples

Verified patterns from official sources:

### Asana OAuth Token Exchange
```typescript
// Source: https://developers.asana.com/docs/oauth
const exchangeAsanaCode = async (code: string) => {
  const response = await fetch("https://app.asana.com/-/oauth_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ASANA_CLIENT_ID!,
      client_secret: process.env.ASANA_CLIENT_SECRET!,
      redirect_uri: `${process.env.API_URL}/oauth/asana/callback`,
      code,
    }),
  });
  return response.json();
  // Returns: { access_token, refresh_token, expires_in, token_type, data: { id, name, email } }
};
```

### ClickUp OAuth Token Exchange
```typescript
// Source: https://developer.clickup.com/reference/getaccesstoken
const exchangeClickUpCode = async (code: string) => {
  const response = await fetch(
    `https://api.clickup.com/api/v2/oauth/token?` +
    `client_id=${process.env.CLICKUP_CLIENT_ID}` +
    `&client_secret=${process.env.CLICKUP_CLIENT_SECRET}` +
    `&code=${code}`,
    { method: "POST" }
  );
  return response.json();
  // Returns: { access_token } - ClickUp tokens don't expire
};
```

### Linear OAuth Token Exchange
```typescript
// Source: https://linear.app/developers/oauth-2-0-authentication
import { LinearClient } from "@linear/sdk";

const exchangeLinearCode = async (code: string) => {
  const response = await fetch("https://api.linear.app/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.LINEAR_CLIENT_ID!,
      client_secret: process.env.LINEAR_CLIENT_SECRET!,
      redirect_uri: `${process.env.API_URL}/oauth/linear/callback`,
      code,
    }),
  });
  const tokens = await response.json();
  // Returns: { access_token, refresh_token, expires_in, token_type, scope }

  // Get user info via SDK
  const client = new LinearClient({ accessToken: tokens.access_token });
  const viewer = await client.viewer;
  return { tokens, userInfo: { id: viewer.id, email: viewer.email, name: viewer.name } };
};
```

### Asana Fetch Tasks with Time Tracking
```typescript
// Source: https://developers.asana.com/reference/tasks
import Asana from "asana";

const fetchAsanaTasks = async (accessToken: string, projectGid: string) => {
  const client = Asana.ApiClient.instance;
  client.authentications.oauth2.accessToken = accessToken;

  const tasksApi = new Asana.TasksApi();
  const opts = {
    opt_fields: "gid,name,assignee,assignee.email,completed,completed_at,created_at,due_at,actual_time_minutes",
  };
  const tasks = await tasksApi.getTasksForProject(projectGid, opts);
  return tasks.data;
};
```

### ClickUp Fetch Tasks with Time Spent
```typescript
// Source: https://developer.clickup.com/reference/gettasks
const fetchClickUpTasks = async (accessToken: string, listId: string) => {
  const response = await fetch(
    `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true`,
    {
      headers: {
        Authorization: accessToken,
        "Content-Type": "application/json",
      },
    }
  );
  const data = await response.json();
  // Each task has: id, name, status, assignees, date_created, date_closed, time_spent (ms), time_estimate
  return data.tasks;
};
```

### Linear Fetch Issues
```typescript
// Source: https://linear.app/developers/sdk
import { LinearClient } from "@linear/sdk";

const fetchLinearIssues = async (accessToken: string) => {
  const client = new LinearClient({ accessToken });
  const issues = await client.issues({
    filter: { team: { key: { eq: "TEAM" } } },
    includeArchived: false,
  });
  // Each issue has: id, identifier, title, assignee, state, completedAt, createdAt, estimate
  return issues.nodes;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Asana v1 SDK | Asana v3 SDK (node-asana) | 2024 | Better TypeScript support, pagination |
| Linear manual GraphQL | @linear/sdk | Ongoing | Strongly typed, auto-generated from schema |
| Linear tokens without refresh | Mandatory refresh tokens | Oct 2025 (new apps), Apr 2026 (migration) | Must implement refresh flow |

**Deprecated/outdated:**
- Asana v1 SDK: No longer receives new features, use v3
- Linear OAuth without refresh tokens: Being phased out April 2026

## Open Questions

1. **Workspace/Project Selection Flow**
   - What we know: Users need to select which workspace/project to sync
   - What's unclear: Should this happen during OAuth or as a separate step?
   - Recommendation: Store workspace ID during OAuth (from response), allow project selection in UI later

2. **Time Tracking Scope for Asana**
   - What we know: Asana requires `time_tracking_entries:read` scope for time data
   - What's unclear: Should we request upfront or re-auth when needed?
   - Recommendation: Request upfront per Phase 4 decision "Request minimal OAuth scopes, re-auth for more later" - but time tracking is core to ROI calculation, so include it

## Sources

### Primary (HIGH confidence)
- [Asana OAuth Documentation](https://developers.asana.com/docs/oauth) - OAuth flow, scopes
- [Asana Webhooks Guide](https://developers.asana.com/docs/webhooks-guide) - Handshake, X-Hook-Signature
- [Asana Time Tracking API](https://developers.asana.com/reference/time-tracking-entries) - actual_time_minutes, entries endpoint
- [ClickUp Authentication](https://developer.clickup.com/docs/authentication) - OAuth 2.0 flow
- [ClickUp Webhook Signature](https://developer.clickup.com/docs/webhooksignature) - X-Signature verification
- [ClickUp Time Tracking API](https://developer.clickup.com/reference/gettrackedtime) - time_spent field
- [Linear OAuth 2.0](https://linear.app/developers/oauth-2-0-authentication) - OAuth with PKCE, refresh tokens
- [Linear Webhooks](https://linear.app/developers/webhooks) - Linear-Signature, timestamp validation
- [Linear SDK](https://linear.app/developers/sdk) - @linear/sdk usage
- [Linear GraphQL Schema](https://github.com/linear/linear/blob/master/packages/sdk/src/schema.graphql) - Issue type definition

### Secondary (MEDIUM confidence)
- [node-asana npm](https://www.npmjs.com/package/asana) - v3.1.5 latest
- [@linear/sdk npm](https://www.npmjs.com/package/@linear/sdk) - v76.0.0 latest

### Existing Project Code (HIGH confidence)
- `apps/api/src/lib/webhook-verification.ts` - verifyAsanaWebhook, verifyClickUpWebhook, verifyLinearWebhook already implemented
- `apps/api/src/services/google-calendar.service.ts` - OAuth service pattern
- `apps/api/src/services/hris-sync.service.ts` - Sync service pattern
- `packages/shared/src/types/integration.ts` - IntegrationProvider already includes asana, clickup, linear

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDKs documented, versions verified on npm
- Architecture: HIGH - Following established project patterns from Phase 5/6
- Pitfalls: HIGH - Well-documented in official sources and project context

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days - stable APIs)
