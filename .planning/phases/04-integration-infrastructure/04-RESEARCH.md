# Phase 4: Integration Infrastructure - Research

**Researched:** 2026-02-27
**Domain:** OAuth token encryption, webhook processing, multi-tenant data isolation
**Confidence:** HIGH

## Summary

This phase establishes the secure foundation for all provider integrations (Calendar, HRIS, Task Management). The core technical challenges are: encrypting OAuth tokens at rest with AES-256-GCM, implementing automatic token refresh with proper error handling, processing webhooks reliably with idempotency guarantees, and enforcing multi-tenant data isolation at both security rules and application layers.

The project already uses Hono with Firebase Functions, Firestore, and has existing patterns for webhook handling (Stripe) and repository abstractions. This research builds on those patterns while adding encryption, provider-specific webhook verification, and queue-based processing.

**Primary recommendation:** Use Node.js native crypto module for AES-256-GCM encryption with scrypt key derivation, implement a Firestore-based queue with Cloud Functions triggers for webhook processing, and enforce multi-tenant isolation through both Firestore Security Rules and application-layer query wrappers.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Token Encryption & Storage:**
- Application-level encryption using AES-256 with key in environment variable
- Store encrypted tokens in Firestore (same as other data)
- Hybrid token refresh: proactive for active integrations, on-demand for idle ones
- On refresh failure: mark integration as disconnected, notify user via email
- Track usage metrics: lastUsedAt, refreshCount for monitoring health
- One-click disconnect (no confirmation dialog)
- Keep synced data on disconnect (historical data stays, just stop syncing)
- Support multiple accounts per provider (e.g., personal + work Google)
- Only org admins can manage integrations
- All org members can see integration status
- Request minimal OAuth scopes, re-auth for more later
- Show users what permissions we have after connecting
- Automatic exponential backoff on rate limiting
- Full API logging (requests/responses, redact sensitive data) to Cloud Logging
- Automatic key rotation every 90 days, re-encrypt tokens

**Webhook Architecture:**
- Queue-based processing: accept webhook, queue via Firestore + Cloud Functions
- Idempotency: both event ID tracking AND upsert logic for safety
- Retain processed event IDs for 7 days
- Fixed interval retry: every 30 seconds, 5 times
- After all retries fail: alert admin, keep in queue
- Provider-specific webhook endpoints: /api/webhooks/google, /api/webhooks/microsoft
- Per-provider signature verification implementation

**Employee Data Model:**
- Top-level collection: employees/{id} with organizationId field
- Store hourly rate in cents (integer) to avoid floating point issues
- Store hourly rate only (convert salary to hourly during import)
- Match employees to meeting attendees by exact email match
- HRIS is source of truth: always overwrite on sync
- Hard delete when employee removed from HRIS
- Track source: sourceType + sourceId for each employee
- Employment status enum: fullTime, partTime, contractor, inactive
- Admins can manually add employees
- Required fields: name, email, role, department, hourlyRateCents
- Single department per employee
- Departments: free-form with auto-collection of unique values for filtering
- No manager/hierarchy tracking
- Roles: free-form with auto-collection of unique values

**Multi-Tenant Isolation:**
- organizationId field on every document (top-level collections)
- Both Firestore Security Rules AND application layer enforce isolation
- Query wrapper that automatically adds orgId filter to all queries
- User belongs to exactly one organization (no multi-org support)

### Claude's Discretion

- Exact encryption algorithm parameters
- Webhook processing batch size
- Rate limit thresholds before backoff
- Specific Cloud Logging structure

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | System encrypts OAuth tokens with Cloud KMS before storing in Firestore | AES-256-GCM encryption pattern with crypto module; key from env var; scrypt for key derivation |
| INFRA-02 | System handles token refresh automatically | googleapis/google-auth-library auto-refresh; MSAL acquireTokenSilent; hybrid proactive/on-demand pattern |
| INFRA-03 | System provides webhook endpoints for all providers | Provider-specific routes (/api/webhooks/google, /microsoft, /bamboohr, /finch, /asana, /clickup, /linear) |
| INFRA-04 | System verifies webhook signatures per provider spec | Google: channel token; Microsoft: clientState; BambooHR/Finch/Asana/ClickUp/Linear: HMAC-SHA256 |
| INFRA-05 | System implements idempotent webhook processing | Event ID tracking in processed_events collection + upsert logic in handlers |
| INFRA-06 | System enforces multi-tenant data isolation | Security rules with organizationId checks + scoped query wrapper in application layer |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js crypto | Native | AES-256-GCM encryption | Built-in, no dependencies, FIPS compliant, hardware-accelerated |
| googleapis | ^149.0.0 | Google Calendar API + OAuth | Official Google library, handles token refresh |
| @azure/msal-node | ^3.8.0 | Microsoft Graph OAuth | Official Microsoft library, handles token lifecycle |
| @tryfinch/finch-api | ^0.28.0 | Finch HRIS unified API | Official SDK with webhook verification built-in |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| firebase-functions | ^6.1.0 | Already installed | Firestore triggers for queue processing |
| firebase-admin | ^12.7.0 | Already installed | Firestore operations, custom claims |
| date-fns | ^4.1.0 | Already installed | Token expiry calculations |

### Not Needed (Already Have)

| Library | Reason |
|---------|--------|
| hono | Already installed - continue using for routes |
| stripe | Already installed - existing webhook patterns to follow |
| zod | Already installed - schema validation |

**Installation:**
```bash
cd apps/api && pnpm add googleapis @azure/msal-node @tryfinch/finch-api
```

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/
├── lib/
│   ├── encryption.ts          # AES-256-GCM encrypt/decrypt utilities
│   ├── key-rotation.ts        # Key rotation and re-encryption logic
│   └── providers/
│       ├── google.ts          # Google OAuth client factory
│       ├── microsoft.ts       # MSAL client factory
│       └── finch.ts           # Finch client factory
├── services/
│   ├── integration.service.ts     # Integration management (connect/disconnect)
│   ├── token-refresh.service.ts   # Token refresh logic (proactive + on-demand)
│   ├── webhook-queue.service.ts   # Queue management for webhook processing
│   └── employee.service.ts        # Employee CRUD with HRIS sync
├── repositories/
│   ├── integration.repository.ts  # OAuth token storage (encrypted)
│   ├── employee.repository.ts     # Employee collection operations
│   ├── webhook-queue.repository.ts# Queue operations
│   └── processed-event.repository.ts # Idempotency tracking (extend existing)
├── routes/
│   └── webhooks/
│       ├── google.webhook.ts      # Google Calendar webhooks
│       ├── microsoft.webhook.ts   # Microsoft Graph webhooks
│       ├── bamboohr.webhook.ts    # BambooHR webhooks
│       ├── finch.webhook.ts       # Finch webhooks
│       ├── asana.webhook.ts       # Asana webhooks
│       ├── clickup.webhook.ts     # ClickUp webhooks
│       └── linear.webhook.ts      # Linear webhooks
└── triggers/
    └── webhook-processor.trigger.ts # Cloud Functions Firestore trigger

packages/shared/src/types/
├── integration.ts             # Integration, OAuthCredentials types
└── employee.ts                # Employee type (new)
```

### Pattern 1: AES-256-GCM Encryption with Key Derivation

**What:** Encrypt OAuth tokens before Firestore storage using AES-256-GCM with scrypt key derivation
**When to use:** Always for sensitive credentials (access tokens, refresh tokens)

```typescript
// Source: Node.js crypto documentation + best practices research
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits

interface EncryptedData {
  ciphertext: string;  // base64
  iv: string;          // base64
  authTag: string;     // base64
  salt: string;        // base64
  keyVersion: number;  // for rotation tracking
}

async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function encrypt(plaintext: string, masterKey: string): Promise<EncryptedData> {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = await deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64'),
    keyVersion: getCurrentKeyVersion(),
  };
}

export async function decrypt(data: EncryptedData, masterKey: string): Promise<string> {
  const salt = Buffer.from(data.salt, 'base64');
  const key = await deriveKey(masterKey, salt);
  const iv = Buffer.from(data.iv, 'base64');
  const ciphertext = Buffer.from(data.ciphertext, 'base64');
  const authTag = Buffer.from(data.authTag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return plaintext.toString('utf8');
}
```

### Pattern 2: Firestore Queue-Based Webhook Processing

**What:** Accept webhooks immediately, queue for background processing via Firestore triggers
**When to use:** All webhook endpoints to ensure reliability and idempotency

```typescript
// Source: Firebase documentation + Fireship patterns
// apps/api/src/services/webhook-queue.service.ts

interface WebhookQueueItem {
  id: string;
  provider: 'google' | 'microsoft' | 'bamboohr' | 'finch' | 'asana' | 'clickup' | 'linear';
  eventId: string;           // Provider's event ID for idempotency
  payload: string;           // Raw JSON payload (encrypted)
  headers: Record<string, string>;
  organizationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;        // 5
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
  processedAt: string | null;
}

// Route handler - quick accept
webhooks.post("/google", async (c) => {
  const channelToken = c.req.header("X-Goog-Channel-Token");
  if (!verifyGoogleChannelToken(channelToken)) {
    return c.text("Invalid token", 401);
  }

  const body = await c.req.text();
  const channelId = c.req.header("X-Goog-Channel-ID");

  // Quick queue and respond - 200 within 3 seconds
  await webhookQueueService.enqueue({
    provider: 'google',
    eventId: `${channelId}-${c.req.header("X-Goog-Message-Number")}`,
    payload: body,
    headers: Object.fromEntries(c.req.raw.headers),
    organizationId: extractOrgIdFromChannelToken(channelToken),
  });

  return c.text("", 200);
});

// Firestore trigger - background processing
// apps/api/src/triggers/webhook-processor.trigger.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";

export const processWebhookQueue = onDocumentCreated(
  "webhook_queue/{docId}",
  async (event) => {
    const data = event.data?.data() as WebhookQueueItem;
    await webhookQueueService.process(data);
  }
);
```

### Pattern 3: Multi-Tenant Query Wrapper

**What:** Automatically scope all queries to the current organization
**When to use:** All repository methods that query data

```typescript
// Source: Firestore multi-tenancy best practices
// apps/api/src/lib/scoped-query.ts

import { firestore } from "./firebase.js";
import type { Query, CollectionReference } from "firebase-admin/firestore";

export function scopedCollection(
  collectionPath: string,
  organizationId: string
): Query {
  return firestore
    .collection(collectionPath)
    .where("organizationId", "==", organizationId);
}

// Repository usage pattern
class EmployeeRepository {
  private collection = firestore.collection("employees");

  async findByOrganization(organizationId: string): Promise<Employee[]> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
  }

  async findByEmail(organizationId: string, email: string): Promise<Employee | null> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Employee;
  }
}
```

### Pattern 4: Provider-Specific Webhook Signature Verification

**What:** Each provider has different verification mechanisms
**When to use:** Every webhook handler before processing

```typescript
// apps/api/src/lib/webhook-verification.ts
import crypto from 'crypto';

// Google Calendar - Channel Token (not HMAC)
export function verifyGoogleWebhook(channelToken: string | undefined, expectedToken: string): boolean {
  if (!channelToken) return false;
  return crypto.timingSafeEqual(
    Buffer.from(channelToken),
    Buffer.from(expectedToken)
  );
}

// Microsoft Graph - clientState validation
export function verifyMicrosoftWebhook(clientState: string | undefined, expectedState: string): boolean {
  if (!clientState) return false;
  return crypto.timingSafeEqual(
    Buffer.from(clientState),
    Buffer.from(expectedState)
  );
}

// HMAC-SHA256 providers (BambooHR, ClickUp, Linear, Asana)
export function verifyHmacSignature(
  body: string,
  signature: string,
  secret: string,
  timestamp?: string
): boolean {
  let payload = body;
  if (timestamp) {
    payload = `${body}${timestamp}`;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// BambooHR - HMAC-SHA256 with timestamp
export function verifyBambooHRWebhook(
  body: string,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string
): boolean {
  if (!signature || !timestamp) return false;

  // Check timestamp is within 5 minutes
  const requestTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - requestTime) > 300) return false;

  return verifyHmacSignature(body + timestamp, signature, secret);
}

// Finch - SDK handles verification
// Use: finch.webhooks.verifySignature(body, headers, secret)

// Asana - X-Hook-Signature with X-Hook-Secret from handshake
export function verifyAsanaWebhook(body: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  return verifyHmacSignature(body, signature, secret);
}

// ClickUp - X-Signature header
export function verifyClickUpWebhook(body: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  return verifyHmacSignature(body, signature, secret);
}

// Linear - Linear-Signature header
export function verifyLinearWebhook(
  body: string,
  signature: string | undefined,
  secret: string,
  webhookTimestamp: number
): boolean {
  if (!signature) return false;

  // Check timestamp is within 1 minute
  const now = Date.now();
  if (Math.abs(now - webhookTimestamp) > 60000) return false;

  return verifyHmacSignature(body, signature, secret);
}
```

### Anti-Patterns to Avoid

- **Storing plain OAuth tokens:** Always encrypt before storage
- **Processing webhooks synchronously:** Queue immediately, process in background
- **Trusting client-provided organizationId:** Always verify from auth context
- **Using CBC mode for encryption:** Use GCM for authenticated encryption
- **Hardcoding encryption keys:** Use environment variables, rotate regularly
- **Ignoring webhook signature verification:** Verify every webhook before processing
- **Re-using IV/nonce:** Generate fresh nonce for every encryption

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth token refresh | Manual token expiry tracking | googleapis/msal built-in refresh | Edge cases around clock skew, network failures, token invalidation |
| HMAC signature verification | Custom comparison logic | crypto.timingSafeEqual | Timing attacks can leak information |
| Key derivation | Simple hashing | crypto.scrypt | Brute-force resistance, salt handling |
| Queue retry logic | Custom exponential backoff | Fixed interval with Cloud Functions triggers | Simpler, Firebase handles scaling |
| Webhook verification for Finch | Manual HMAC | finch.webhooks.verifySignature | SDK handles edge cases, timestamp checks |

**Key insight:** Cryptography and OAuth are domains where small mistakes create security vulnerabilities. Use well-tested libraries for the hard parts.

## Common Pitfalls

### Pitfall 1: IV Reuse in AES-GCM

**What goes wrong:** Reusing the same IV with the same key completely breaks AES-GCM security
**Why it happens:** Not generating fresh random bytes for each encryption
**How to avoid:** Always use `crypto.randomBytes(12)` for each encryption operation
**Warning signs:** Deterministic ciphertext for same plaintext, unit tests with hardcoded IVs

### Pitfall 2: Webhook Timeout Leading to Retries

**What goes wrong:** Processing takes too long, provider retries, duplicate data
**Why it happens:** Synchronous processing in webhook handler
**How to avoid:** Queue immediately (<3 seconds), process asynchronously
**Warning signs:** Microsoft Graph marks endpoint as "slow" or "drop", duplicate events

### Pitfall 3: Token Refresh Race Conditions

**What goes wrong:** Multiple simultaneous refresh attempts for same token
**Why it happens:** Parallel requests with expired token all try to refresh
**How to avoid:** Use Firestore transactions for token updates, or googleapis/msal built-in deduplication
**Warning signs:** "invalid_grant" errors, multiple refresh tokens issued

### Pitfall 4: Missing organizationId in Queries

**What goes wrong:** Data leakage across tenants
**Why it happens:** Forgot to add orgId filter, trusted client-provided value
**How to avoid:** Repository pattern with mandatory orgId parameter, security rules as fallback
**Warning signs:** Cross-org data visible in testing, security rule denials in production

### Pitfall 5: Microsoft Graph Subscription Expiration

**What goes wrong:** Webhooks stop arriving after ~3 days
**Why it happens:** Microsoft Graph subscriptions expire and must be renewed
**How to avoid:** Track subscription expiry, renew before expiration via lifecycle notifications
**Warning signs:** Calendar sync stops working, no errors visible

### Pitfall 6: Google Calendar Minimal Notifications

**What goes wrong:** Webhook only says "something changed", not what
**Why it happens:** Google Calendar webhooks are minimalist - they don't include changed data
**How to avoid:** Fetch resource via API after webhook notification, use sync tokens
**Warning signs:** Missing data in handlers, confusion about payload structure

## Code Examples

### OAuth Token Storage Schema

```typescript
// packages/shared/src/types/integration.ts
// Source: Project patterns + research

export type IntegrationProvider =
  | 'google_calendar'
  | 'microsoft_calendar'
  | 'bamboohr'
  | 'finch'
  | 'asana'
  | 'clickup'
  | 'linear';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'refreshing';

export interface EncryptedCredentials {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
  keyVersion: number;
}

export interface Integration {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  accountEmail: string;        // For display and multi-account support
  accountId: string;           // Provider's user/account ID
  status: IntegrationStatus;
  scopes: string[];            // Granted OAuth scopes
  credentials: EncryptedCredentials;
  webhookChannelId?: string;   // For Google Calendar
  webhookSecret?: string;      // For webhook verification (encrypted)
  subscriptionId?: string;     // For Microsoft Graph
  expiresAt: string;           // Token expiry
  lastUsedAt: string;
  lastRefreshedAt: string;
  refreshCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Employee Schema

```typescript
// packages/shared/src/types/employee.ts
// Source: CONTEXT.md decisions

export type EmploymentStatus = 'fullTime' | 'partTime' | 'contractor' | 'inactive';
export type EmployeeSourceType = 'bamboohr' | 'finch' | 'manual' | 'csv';

export interface Employee {
  id: string;
  organizationId: string;

  // Required fields per CONTEXT.md
  name: string;
  email: string;              // For matching meeting attendees
  role: string;               // Free-form
  department: string;         // Free-form, single department
  hourlyRateCents: number;    // Integer, stored in cents

  // Status and source tracking
  employmentStatus: EmploymentStatus;
  sourceType: EmployeeSourceType;
  sourceId?: string;          // External ID from HRIS

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
}

// For meeting cost calculation
export function calculateMeetingCost(
  durationMinutes: number,
  attendeeHourlyRates: number[]  // in cents
): number {
  const hours = durationMinutes / 60;
  return attendeeHourlyRates.reduce((sum, rate) => sum + (rate * hours), 0);
}
```

### Firestore Security Rules for Multi-Tenant

```javascript
// firestore.rules
// Source: Multi-tenant isolation research

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper: Get user's organization from custom claims
    function getUserOrgId() {
      return request.auth.token.organizationId;
    }

    // Helper: Check if document belongs to user's organization
    function isOrgMember(orgId) {
      return isAuthenticated() && getUserOrgId() == orgId;
    }

    // Helper: Check if user is org admin
    function isOrgAdmin(orgId) {
      return isOrgMember(orgId) &&
        request.auth.token.role in ['owner', 'administrator'];
    }

    // Employees - org members can read, admins can write
    match /employees/{employeeId} {
      allow read: if isOrgMember(resource.data.organizationId);
      allow create: if isOrgAdmin(request.resource.data.organizationId);
      allow update, delete: if isOrgAdmin(resource.data.organizationId);
    }

    // Integrations - org members can read, admins can manage
    match /integrations/{integrationId} {
      allow read: if isOrgMember(resource.data.organizationId);
      allow create: if isOrgAdmin(request.resource.data.organizationId);
      allow update, delete: if isOrgAdmin(resource.data.organizationId);
    }

    // Webhook queue - server-side only (no client access)
    match /webhook_queue/{queueId} {
      allow read, write: if false;
    }

    // Processed events - server-side only
    match /processed_events/{eventId} {
      allow read, write: if false;
    }

    // Existing collections (organizations, users, etc.)
    // ... keep existing rules ...
  }
}
```

### Token Refresh Service

```typescript
// apps/api/src/services/token-refresh.service.ts
// Source: googleapis/msal documentation + research

import { google } from 'googleapis';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { integrationRepository } from '@/repositories/index.js';
import { decrypt, encrypt } from '@/lib/encryption.js';

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

class TokenRefreshService {

  // Proactive refresh for active integrations (called by scheduled function)
  async refreshExpiringTokens(): Promise<void> {
    const expiringIntegrations = await integrationRepository
      .findExpiringWithin(REFRESH_BUFFER_MS);

    for (const integration of expiringIntegrations) {
      try {
        await this.refreshToken(integration.id);
      } catch (error) {
        console.error(`Failed to refresh ${integration.id}:`, error);
        await integrationRepository.markAsError(integration.id, error.message);
        // TODO: Send notification to org admins
      }
    }
  }

  // On-demand refresh when token is used
  async getValidToken(integrationId: string): Promise<string> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) throw new Error('Integration not found');

    // Check if token is expired or expiring soon
    const expiresAt = new Date(integration.expiresAt);
    const now = new Date();

    if (expiresAt.getTime() - now.getTime() < REFRESH_BUFFER_MS) {
      await this.refreshToken(integrationId);
      // Re-fetch to get new token
      const updated = await integrationRepository.findById(integrationId);
      if (!updated) throw new Error('Integration lost during refresh');
      return this.decryptAccessToken(updated);
    }

    return this.decryptAccessToken(integration);
  }

  private async refreshToken(integrationId: string): Promise<void> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) throw new Error('Integration not found');

    const masterKey = process.env.ENCRYPTION_KEY!;
    const credentials = JSON.parse(await decrypt(integration.credentials, masterKey));

    let newAccessToken: string;
    let newRefreshToken: string | undefined;
    let expiresIn: number;

    switch (integration.provider) {
      case 'google_calendar': {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
          refresh_token: credentials.refreshToken
        });

        const { credentials: newCreds } = await oauth2Client.refreshAccessToken();
        newAccessToken = newCreds.access_token!;
        newRefreshToken = newCreds.refresh_token;
        expiresIn = newCreds.expiry_date! - Date.now();
        break;
      }

      case 'microsoft_calendar': {
        const msalClient = new ConfidentialClientApplication({
          auth: {
            clientId: process.env.MICROSOFT_CLIENT_ID!,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
            authority: `https://login.microsoftonline.com/${integration.tenantId}`
          }
        });

        const result = await msalClient.acquireTokenByRefreshToken({
          refreshToken: credentials.refreshToken,
          scopes: integration.scopes
        });

        if (!result) throw new Error('Token refresh failed');
        newAccessToken = result.accessToken;
        expiresIn = (result.expiresOn!.getTime() - Date.now());
        break;
      }

      // Add other providers...
      default:
        throw new Error(`Unsupported provider: ${integration.provider}`);
    }

    // Encrypt and store new credentials
    const newCredentials = await encrypt(
      JSON.stringify({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || credentials.refreshToken
      }),
      masterKey
    );

    await integrationRepository.update(integrationId, {
      credentials: newCredentials,
      expiresAt: new Date(Date.now() + expiresIn).toISOString(),
      lastRefreshedAt: new Date().toISOString(),
      refreshCount: integration.refreshCount + 1,
      status: 'connected'
    });
  }

  private async decryptAccessToken(integration: Integration): Promise<string> {
    const masterKey = process.env.ENCRYPTION_KEY!;
    const credentials = JSON.parse(await decrypt(integration.credentials, masterKey));

    // Update lastUsedAt
    await integrationRepository.update(integration.id, {
      lastUsedAt: new Date().toISOString()
    });

    return credentials.accessToken;
  }
}

export const tokenRefreshService = new TokenRefreshService();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store plain OAuth tokens | Encrypt at rest with AES-256-GCM | Standard practice | Required for compliance |
| Manual token refresh | Library-managed refresh (googleapis, msal) | v2+ of libraries | More reliable, handles edge cases |
| Global webhook secret | Per-webhook/per-subscription secrets | 2024 | Better isolation |
| Sync webhook processing | Queue-based async processing | Standard practice | Reliability, idempotency |
| Single key forever | Key rotation every 90 days | Compliance requirement | Defense in depth |

**Deprecated/outdated:**
- `createCipher()` in Node.js crypto - deprecated, use `createCipheriv()` with explicit IV
- BambooHR OpenID Connect - deprecated for new integrations, use OAuth 2.0
- Microsoft Graph subscriptions without lifecycle notifications - will fail silently when expired

## Open Questions

1. **Cloud KMS vs Application Encryption**
   - What we know: CONTEXT.md specifies "application-level encryption using AES-256 with key in environment variable"
   - What's unclear: REQUIREMENTS.md says "encrypts OAuth tokens with Cloud KMS" - contradiction
   - Recommendation: Follow CONTEXT.md (application-level encryption) as it's the more recent decision

2. **Webhook Retry Scheduling**
   - What we know: "Fixed interval retry: every 30 seconds, 5 times"
   - What's unclear: How to implement 30-second intervals with Firestore triggers (they're event-driven, not scheduled)
   - Recommendation: Use Cloud Tasks for precise scheduling, or scheduled Cloud Function that polls pending retries

3. **Employee Department/Role Aggregation**
   - What we know: "Departments: free-form with auto-collection of unique values for filtering"
   - What's unclear: Where to store aggregated unique values - separate collection or query on-demand?
   - Recommendation: Query on-demand with caching (small dataset, infrequent changes)

## Sources

### Primary (HIGH confidence)
- [Node.js crypto documentation](https://nodejs.org/api/crypto.html) - AES-256-GCM implementation
- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push) - Webhook structure, channel tokens
- [Microsoft Graph Webhooks](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks) - clientState validation, subscription lifecycle
- [BambooHR Webhooks](https://documentation.bamboohr.com/docs/webhooks) - HMAC-SHA256 signature verification
- [Finch Webhooks Quickstart](https://developer.tryfinch.com/developer-resources/Webhooks) - SDK verification methods
- [Linear Webhooks](https://linear.app/developers/webhooks) - HMAC-SHA256 with timestamp

### Secondary (MEDIUM confidence)
- [Firebase Task Queue Functions](https://firebase.google.com/docs/functions/task-functions) - Queue patterns
- [Fireship Cloud Functions Tutorial](https://fireship.io/lessons/cloud-functions-scheduled-time-trigger/) - Firestore queue pattern
- [MSAL Node.js](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/samples/msal-node-samples/refresh-token/README.md) - Token refresh handling
- [googleapis/google-api-nodejs-client](https://github.com/googleapis/google-api-nodejs-client) - OAuth2 client usage

### Tertiary (LOW confidence)
- Asana Forum discussions on X-Hook-Signature verification - community patterns
- ClickUp webhook signature documentation - basic implementation
- General encryption key rotation best practices - multiple sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official libraries, well-documented
- Architecture: HIGH - Based on existing project patterns and official docs
- Encryption: HIGH - Node.js crypto is well-documented, AES-GCM is standard
- Webhook verification: MEDIUM - Provider-specific, some docs are sparse (Asana, ClickUp)
- Multi-tenant isolation: HIGH - Standard Firestore pattern, well-documented

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days - stable domain, established libraries)
