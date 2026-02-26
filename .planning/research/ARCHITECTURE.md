# Architecture Patterns: Multi-Provider OAuth + Webhooks

**Domain:** B2B SaaS Integration Layer (HRIS, Calendar, Task Management)
**Researched:** 2026-02-26
**Confidence:** MEDIUM (patterns verified across multiple sources, provider-specific details from official docs)

## Executive Summary

This document defines the architecture for integrating 8+ OAuth providers (BambooHR, Rippling, Gusto, Google Workspace, Microsoft 365, Asana, ClickUp, Linear) into Klayim's existing Firebase Functions + Next.js stack. The architecture introduces three core service components: **OAuth Service** (authorization flows, token lifecycle), **Webhook Handler Service** (event ingestion, signature verification), and **Sync Service** (background data synchronization via Cloud Tasks).

## Recommended Architecture

```
                                    EXTERNAL PROVIDERS
                    ┌───────────────────────────────────────────────────┐
                    │  HRIS          Calendar        Task Management    │
                    │  ┌─────────┐   ┌─────────┐    ┌─────────────────┐ │
                    │  │BambooHR │   │ Google  │    │ Asana │ClickUp │ │
                    │  │Rippling │   │Microsoft│    │ Linear│         │ │
                    │  │ Gusto   │   │         │    │       │         │ │
                    │  └────┬────┘   └────┬────┘    └───────┬─────────┘ │
                    └───────┼─────────────┼────────────────┼───────────┘
                            │             │                │
        ┌───────────────────┼─────────────┼────────────────┼───────────────────┐
        │                   ▼             ▼                ▼                   │
        │  FIREBASE FUNCTIONS (api.klayim.com)                                 │
        │  ┌─────────────────────────────────────────────────────────────────┐ │
        │  │                    WEBHOOK HANDLERS                              │ │
        │  │  /webhooks/:provider  (e.g., /webhooks/bamboohr)                │ │
        │  │  - Signature verification (provider-specific)                   │ │
        │  │  - Request validation & deduplication                           │ │
        │  │  - Event routing to Sync Service                                │ │
        │  └─────────────────────────────────────────────────────────────────┘ │
        │                                                                      │
        │  ┌─────────────────────────────────────────────────────────────────┐ │
        │  │                    OAUTH SERVICE                                 │ │
        │  │  /oauth/:provider/authorize  - Initiate OAuth flow              │ │
        │  │  /oauth/:provider/callback   - Exchange code for tokens         │ │
        │  │  Internal: Token refresh, validation, revocation                │ │
        │  └─────────────────────────────────────────────────────────────────┘ │
        │                                                                      │
        │  ┌─────────────────────────────────────────────────────────────────┐ │
        │  │                    SYNC SERVICE                                  │ │
        │  │  - Scheduled sync (Cloud Scheduler)                             │ │
        │  │  - Event-driven sync (Cloud Tasks queues)                       │ │
        │  │  - Provider-specific data transformers                          │ │
        │  └─────────────────────────────────────────────────────────────────┘ │
        │                                                                      │
        └──────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
        ┌──────────────────────────────────────────────────────────────────────┐
        │                         FIRESTORE                                    │
        │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐  │
        │  │ integrations │  │  tokens      │  │ sync_events / sync_jobs    │  │
        │  │ {orgId}/     │  │ (encrypted)  │  │ (audit + retry tracking)   │  │
        │  │ integration/ │  │              │  │                            │  │
        │  └──────────────┘  └──────────────┘  └────────────────────────────┘  │
        │                                                                      │
        │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐  │
        │  │  employees   │  │   meetings   │  │   tasks                    │  │
        │  │  (from HRIS) │  │ (from Cal)   │  │  (from task mgmt)          │  │
        │  └──────────────┘  └──────────────┘  └────────────────────────────┘  │
        └──────────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

| Component | Responsibility | Communicates With | Location |
|-----------|---------------|-------------------|----------|
| **OAuth Service** | Manages OAuth flows, token storage/refresh, provider-specific authorization | External OAuth providers, Token Storage, Integration Registry | `apps/api/src/services/oauth/` |
| **Webhook Handlers** | Receives webhooks, verifies signatures, validates payloads, routes to processing | External providers, Sync Service, Event Log | `apps/api/src/routes/webhooks/` |
| **Sync Service** | Orchestrates data synchronization, transforms provider data to Klayim models | Cloud Tasks, Firestore, Provider APIs | `apps/api/src/services/sync/` |
| **Token Repository** | Encrypts/decrypts tokens, manages token lifecycle | Google Cloud KMS, Firestore | `apps/api/src/repositories/token.repository.ts` |
| **Provider Adapters** | Provider-specific API clients with standardized interface | External provider APIs | `apps/api/src/adapters/:provider/` |
| **Integration Registry** | Tracks which integrations each org has enabled | Firestore, OAuth Service | `apps/api/src/repositories/integration.repository.ts` |

### Service Boundary Rules

1. **OAuth Service** owns all token operations - no other service directly accesses encrypted tokens
2. **Webhook Handlers** are stateless - they validate, log, and dispatch to Cloud Tasks
3. **Sync Service** is idempotent - same event processed multiple times yields same result
4. **Provider Adapters** abstract all provider-specific API quirks behind unified interface

## Data Flow

### 1. OAuth Authorization Flow

```
User clicks "Connect BambooHR"
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Frontend: POST /api/v1/integrations/bamboohr/connect          │
│    - Generates PKCE code_verifier, stores in session             │
│    - Creates state token (orgId + nonce, signed)                 │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Backend: GET /oauth/bamboohr/authorize                        │
│    - Validates org permissions                                    │
│    - Constructs provider authorization URL                       │
│    - Redirects to provider with state + PKCE challenge           │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Provider: User authenticates, grants permissions              │
│    - Redirects to callback with authorization code               │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Backend: GET /oauth/bamboohr/callback?code=xxx&state=yyy      │
│    - Validates state token (prevents CSRF)                       │
│    - Exchanges code for tokens (with PKCE verifier)              │
│    - Encrypts tokens via Cloud KMS                               │
│    - Stores in Firestore: tokens/{orgId}/bamboohr                │
│    - Creates integration record                                   │
│    - Queues initial sync via Cloud Tasks                         │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Frontend: Receives success, shows integration status          │
└──────────────────────────────────────────────────────────────────┘
```

### 2. Webhook Event Flow

```
Provider sends webhook (employee updated)
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Webhook Handler: POST /webhooks/bamboohr                      │
│    - Extract signature: X-BambooHR-Signature header              │
│    - Extract timestamp: X-BambooHR-Timestamp header              │
│    - Verify: HMAC-SHA256(rawBody + timestamp, webhookSecret)     │
│    - Reject if signature mismatch or timestamp > 5 min old       │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Event Validation                                              │
│    - Parse payload, validate against provider schema             │
│    - Extract orgId from webhook registration mapping             │
│    - Check for duplicate (eventId in processed_events)           │
│    - Log to sync_events collection for audit                     │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Queue Processing                                              │
│    - Create Cloud Task with event payload                        │
│    - Set retry policy (max 5 retries, exponential backoff)       │
│    - Return 200 OK immediately (webhook acknowledged)            │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Sync Service (async, via Cloud Task)                          │
│    - Retrieve tokens from Token Repository                       │
│    - Fetch full resource from provider API if needed             │
│    - Transform to Klayim data model                              │
│    - Update Firestore (employees, meetings, tasks)               │
│    - Mark event as processed                                     │
└──────────────────────────────────────────────────────────────────┘
```

### 3. Token Refresh Flow

```
API call fails with 401 (token expired)
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Provider Adapter detects 401                                  │
│    - Calls OAuth Service: refreshToken(orgId, provider)          │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. OAuth Service                                                 │
│    - Retrieve encrypted refresh_token from Firestore             │
│    - Decrypt via Cloud KMS                                       │
│    - Call provider token endpoint with refresh_token             │
│    - Encrypt new access_token (and new refresh_token if rotated) │
│    - Update Firestore with new tokens                            │
│    - Return new access_token to adapter                          │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Provider Adapter retries original request                     │
└──────────────────────────────────────────────────────────────────┘
```

## Patterns to Follow

### Pattern 1: Provider Adapter Interface

**What:** Abstract provider-specific APIs behind a common interface
**When:** Every integration with an external provider
**Why:** Enables swapping providers, simplifies testing, reduces coupling

```typescript
// apps/api/src/adapters/types.ts
interface IProviderAdapter<TEmployee, TEvent, TTask> {
  // OAuth
  getAuthorizationUrl(state: string, codeChallenge: string): string;
  exchangeCodeForTokens(code: string, codeVerifier: string): Promise<OAuthTokens>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;

  // Data fetching
  listEmployees(accessToken: string): Promise<TEmployee[]>;
  getEmployee(accessToken: string, id: string): Promise<TEmployee>;

  // Webhooks
  verifyWebhookSignature(rawBody: Buffer, signature: string, timestamp: string): boolean;
  parseWebhookEvent(payload: unknown): WebhookEvent;

  // Data transformation
  toKlayimEmployee(providerEmployee: TEmployee): KlayimEmployee;
}

// apps/api/src/adapters/bamboohr/index.ts
export class BambooHRAdapter implements IProviderAdapter<BambooHREmployee, never, never> {
  verifyWebhookSignature(rawBody: Buffer, signature: string, timestamp: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody.toString() + timestamp)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

### Pattern 2: Encrypted Token Storage

**What:** Encrypt OAuth tokens at rest using Cloud KMS
**When:** Storing any access_token or refresh_token
**Why:** Compliance requirement, defense in depth for sensitive credentials

```typescript
// apps/api/src/repositories/token.repository.ts
import { KeyManagementServiceClient } from '@google-cloud/kms';

export class TokenRepository {
  private kms: KeyManagementServiceClient;
  private keyName: string; // projects/{project}/locations/{location}/keyRings/{ring}/cryptoKeys/{key}

  async storeTokens(orgId: string, provider: string, tokens: OAuthTokens): Promise<void> {
    const plaintext = JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
    });

    // Encrypt with Cloud KMS
    const [encryptResponse] = await this.kms.encrypt({
      name: this.keyName,
      plaintext: Buffer.from(plaintext),
    });

    // Store encrypted blob in Firestore
    await this.db.collection('tokens').doc(`${orgId}_${provider}`).set({
      encryptedData: encryptResponse.ciphertext,
      provider,
      orgId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async getTokens(orgId: string, provider: string): Promise<OAuthTokens | null> {
    const doc = await this.db.collection('tokens').doc(`${orgId}_${provider}`).get();
    if (!doc.exists) return null;

    const [decryptResponse] = await this.kms.decrypt({
      name: this.keyName,
      ciphertext: doc.data().encryptedData,
    });

    return JSON.parse(decryptResponse.plaintext.toString());
  }
}
```

### Pattern 3: Webhook Signature Verification Factory

**What:** Provider-specific signature verification with shared interface
**When:** Receiving any webhook
**Why:** Each provider uses different signature algorithms and header conventions

```typescript
// apps/api/src/middleware/webhook-verification.ts
import { createHmac, timingSafeEqual } from 'crypto';

type SignatureVerifier = (rawBody: Buffer, headers: Record<string, string>) => boolean;

const verifiers: Record<string, (secret: string) => SignatureVerifier> = {
  bamboohr: (secret) => (rawBody, headers) => {
    const signature = headers['x-bamboohr-signature'];
    const timestamp = headers['x-bamboohr-timestamp'];
    if (!signature || !timestamp) return false;

    // Reject if timestamp > 5 minutes old
    if (Date.now() - parseInt(timestamp) * 1000 > 300000) return false;

    const expected = createHmac('sha256', secret)
      .update(rawBody.toString() + timestamp)
      .digest('hex');
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  },

  gusto: (secret) => (rawBody, headers) => {
    const signature = headers['x-gusto-signature'];
    if (!signature) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  },

  asana: (secret) => (rawBody, headers) => {
    const signature = headers['x-hook-signature'];
    if (!signature) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  },

  clickup: (secret) => (rawBody, headers) => {
    const signature = headers['x-signature'];
    if (!signature) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  },

  linear: (secret) => (rawBody, headers) => {
    const signature = headers['linear-signature'];
    if (!signature) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  },

  // Google Calendar uses channel token verification, not HMAC
  google: (channelToken) => (rawBody, headers) => {
    return headers['x-goog-channel-token'] === channelToken;
  },

  // Microsoft uses clientState for basic verification, JWT for rich notifications
  microsoft: (clientState) => (rawBody, headers) => {
    // For basic notifications, verify clientState matches
    // For rich notifications, validate JWT in validationTokens
    return true; // Simplified - full implementation validates JWT
  },
};

export function createWebhookVerifier(provider: string, secret: string): SignatureVerifier {
  const factory = verifiers[provider];
  if (!factory) throw new Error(`Unknown provider: ${provider}`);
  return factory(secret);
}
```

### Pattern 4: Cloud Tasks for Async Processing

**What:** Queue webhook events for async processing instead of processing inline
**When:** Any webhook that triggers data sync
**Why:** Webhooks require fast acknowledgment (<10s); sync operations may be slow

```typescript
// apps/api/src/services/task-queue.service.ts
import { CloudTasksClient } from '@google-cloud/tasks';

export class TaskQueueService {
  private client: CloudTasksClient;
  private queuePath: string;

  async enqueueSyncTask(task: SyncTask): Promise<void> {
    await this.client.createTask({
      parent: this.queuePath,
      task: {
        httpRequest: {
          httpMethod: 'POST',
          url: `${process.env.API_URL}/internal/sync/process`,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(JSON.stringify(task)).toString('base64'),
          oidcToken: {
            serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL,
          },
        },
        scheduleTime: {
          seconds: Math.floor(Date.now() / 1000) + (task.delaySeconds || 0),
        },
      },
    });
  }
}

// Retry configuration (in queue.yaml or terraform)
// maxAttempts: 5
// minBackoff: 10s
// maxBackoff: 300s
// maxDoublings: 4
```

### Pattern 5: Multi-Tenant Data Isolation

**What:** Enforce organization-level data isolation at every layer
**When:** Every data access operation
**Why:** Prevent cross-tenant data leakage in shared infrastructure

```typescript
// Firestore collection structure for multi-tenant isolation
// /organizations/{orgId}/employees/{employeeId}
// /organizations/{orgId}/meetings/{meetingId}
// /organizations/{orgId}/tasks/{taskId}
// /organizations/{orgId}/integrations/{provider}

// apps/api/src/middleware/tenant.middleware.ts
export const tenantMiddleware = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (!user?.organizationId) {
    return c.json({ success: false, error: 'Organization context required' }, 403);
  }

  // Set tenant context for all downstream operations
  c.set('orgId', user.organizationId);
  await next();
});

// Repository base class enforcing tenant scope
export abstract class TenantScopedRepository<T> {
  protected getCollectionRef(c: Context, collectionName: string) {
    const orgId = c.get('orgId');
    return this.db.collection('organizations').doc(orgId).collection(collectionName);
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Tokens in Plain Text

**What:** Storing access_token or refresh_token without encryption
**Why bad:** Token theft enables full account takeover; violates security best practices
**Instead:** Always encrypt tokens at rest using Cloud KMS; store only encrypted blobs in Firestore

### Anti-Pattern 2: Synchronous Webhook Processing

**What:** Processing webhook data inline before returning 200 OK
**Why bad:** Providers timeout after 5-10 seconds; retries cause duplicate processing
**Instead:** Acknowledge immediately with 200, queue processing via Cloud Tasks

### Anti-Pattern 3: Shared Webhook Secrets

**What:** Using the same webhook secret for all organizations
**Why bad:** One leaked secret compromises all webhooks; no way to revoke per-org
**Instead:** Generate unique webhook secret per organization per provider; store in encrypted format

### Anti-Pattern 4: Skipping Signature Verification

**What:** Processing webhooks without verifying signatures
**Why bad:** Anyone can POST fake events to your webhook endpoint
**Instead:** Always verify HMAC signature using provider-specific algorithm; reject on mismatch

### Anti-Pattern 5: Hardcoded Provider Logic in Core Services

**What:** Switch statements or if/else chains for provider-specific logic in business services
**Why bad:** Adding providers requires modifying core code; testing becomes complex
**Instead:** Use Adapter pattern; provider-specific code isolated in adapter classes

## Scalability Considerations

| Concern | At 100 orgs | At 10K orgs | At 100K orgs |
|---------|-------------|-------------|--------------|
| **Webhook volume** | Direct processing OK | Cloud Tasks essential | Consider Pub/Sub fan-out |
| **Token storage** | Single KMS key | Regional keys for latency | Per-tenant keys for compliance |
| **Sync scheduling** | Cloud Scheduler jobs | Cloud Tasks batching | Prioritized queues by tier |
| **API rate limits** | Unlikely to hit | Per-provider pooling | Request coalescing, caching |
| **Firestore costs** | Negligible | Index optimization needed | Consider BigQuery for analytics |

## Provider-Specific Implementation Notes

### HRIS Providers

| Provider | OAuth | Webhook Signature | Token Expiry | Notes |
|----------|-------|-------------------|--------------|-------|
| **BambooHR** | OAuth 2.0 | HMAC-SHA256 (body + timestamp) | Unknown | Timestamp replay protection required |
| **Rippling** | OAuth 2.0 | TBD (verify in docs) | Unknown | May require partner agreement |
| **Gusto** | OAuth 2.0 | HMAC-SHA256 (verification_token) | Unknown | Two-step webhook verification process |

### Calendar Providers

| Provider | OAuth | Webhook Verification | Channel Expiry | Notes |
|----------|-------|---------------------|----------------|-------|
| **Google Workspace** | OAuth 2.0 + PKCE | Channel token (not HMAC) | ~24 hours | Must renew subscriptions via cron |
| **Microsoft 365** | OAuth 2.0 + PKCE | clientState + JWT validation | ~3 days | Rich notifications need JWT validation |

### Task Management Providers

| Provider | OAuth | Webhook Signature | Token Expiry | Notes |
|----------|-------|-------------------|--------------|-------|
| **Asana** | OAuth 2.0 | HMAC-SHA256 (X-Hook-Secret) | Unknown | X-Hook-Secret sent during handshake |
| **ClickUp** | OAuth 2.0 | HMAC-SHA256 (webhook.secret) | Never expires | Secret returned when creating webhook |
| **Linear** | OAuth 2.0 + PKCE | HMAC-SHA256 (signing secret) | 24h (access), refresh available | Refresh tokens mandatory from Oct 2025 |

## Suggested Build Order

Based on component dependencies and complexity:

### Phase 1: Foundation Infrastructure

**Build first because:** All integrations depend on these components

1. **Token Repository with KMS encryption** - All OAuth flows need secure token storage
2. **Provider Adapter interface** - Defines contract for all adapters
3. **OAuth Service core** - Handles authorization URL generation, callback handling
4. **Integration Registry** - Tracks which integrations are active per org

### Phase 2: First Integration (Google Calendar)

**Build second because:** Most common provider, well-documented, validates architecture

1. **Google Calendar Adapter** - OAuth + API client implementation
2. **Google webhook handler** - Push notification subscription + renewal
3. **Calendar sync service** - Transform Google events to Klayim meetings
4. **Cloud Tasks integration** - Async processing pipeline

### Phase 3: HRIS Integrations

**Build third because:** Employee data is prerequisite for cost calculations

1. **BambooHR Adapter** - OAuth + HMAC webhook verification
2. **Employee sync service** - Transform HRIS data to Klayim employees
3. **Gusto Adapter** (similar pattern)
4. **Rippling Adapter** (similar pattern, may need partner agreement)

### Phase 4: Microsoft + Task Management

**Build fourth because:** Leverages established patterns from phases 2-3

1. **Microsoft Graph Adapter** - OAuth + subscription management
2. **Asana/ClickUp/Linear Adapters** - OAuth + webhooks
3. **Task sync service** - Transform task data to Klayim model

### Phase 5: Advanced Features

**Build last because:** Optimizations after core functionality works

1. **Scheduled full-sync jobs** (Cloud Scheduler)
2. **Webhook retry/dead-letter handling**
3. **Integration health monitoring**
4. **Rate limit management per provider

## Sources

### OAuth Flow Patterns
- [NextAuth.js OAuth Configuration](https://next-auth.js.org/configuration/providers/oauth) - HIGH confidence
- [Next.js Authentication Guide](https://nextjs.org/docs/pages/guides/authentication) - HIGH confidence
- [OAuth 2.1 Implementation in Next.js](https://goodsidekick.com/development/oauth-nextjs/) - MEDIUM confidence

### Token Storage & Encryption
- [Firebase Firestore CMEK](https://firebase.google.com/docs/firestore/cmek) - HIGH confidence
- [Google Cloud Secret Manager Overview](https://docs.cloud.google.com/secret-manager/docs/overview) - HIGH confidence
- [Medium: OAuth Tokens with Firebase](https://medium.com/@adamgerhant/generating-and-storing-oauth-2-0-access-tokens-with-firebase-7b8a2e285578) - MEDIUM confidence

### Webhook Signature Verification
- [BambooHR Webhooks Documentation](https://documentation.bamboohr.com/docs/webhooks) - HIGH confidence
- [Gusto Webhooks Documentation](https://docs.gusto.com/embedded-payroll/docs/webhooks) - HIGH confidence
- [Asana Webhooks Guide](https://developers.asana.com/docs/webhooks-guide) - HIGH confidence
- [ClickUp Webhook Signature](https://developer.clickup.com/docs/webhooksignature) - HIGH confidence
- [Linear Webhooks](https://linear.app/developers/webhooks) - HIGH confidence
- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push) - HIGH confidence
- [Microsoft Graph Webhooks](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks) - HIGH confidence

### Background Jobs
- [Firebase Scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions) - HIGH confidence
- [Cloud Tasks vs Cloud Scheduler](https://cloud.google.com/tasks/docs/comp-tasks-sched) - HIGH confidence
- [Fireship: Dynamic Scheduled Jobs](https://fireship.io/lessons/cloud-functions-scheduled-time-trigger/) - MEDIUM confidence

### Multi-Tenant Patterns
- [Hotovo: Firestore Tenant Isolation](https://www.hotovo.com/blog/firestore-real-time-updates-with-tenant-isolation) - MEDIUM confidence
- [CData: Multi-Tenant Integration Playbook 2026](https://cdatasoftware.medium.com/the-2026-multi-tenant-data-integration-playbook-for-scalable-saas-1371986d2c2c) - MEDIUM confidence
- [Redis: Data Isolation in Multi-Tenant SaaS](https://redis.io/blog/data-isolation-multi-tenant-saas/) - MEDIUM confidence

### Firebase + Hono.js
- [hono-firebase-functions adapter](https://github.com/takasqr/hono-firebase-functions) - MEDIUM confidence
- [Hono Best Practices](https://hono.dev/docs/guides/best-practices) - HIGH confidence

---

*Architecture research: 2026-02-26*
