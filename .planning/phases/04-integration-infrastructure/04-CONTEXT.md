# Phase 4: Integration Infrastructure - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Secure foundation for all provider integrations with encrypted tokens and reliable webhooks. This phase builds the infrastructure that Calendar, HRIS, and Task integrations will use. Includes OAuth token management, webhook processing, Employee data model definition, and multi-tenant isolation.

</domain>

<decisions>
## Implementation Decisions

### Token Encryption & Storage
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

### Webhook Architecture
- Queue-based processing: accept webhook, queue via Firestore + Cloud Functions
- Idempotency: both event ID tracking AND upsert logic for safety
- Retain processed event IDs for 7 days
- Fixed interval retry: every 30 seconds, 5 times
- After all retries fail: alert admin, keep in queue
- Provider-specific webhook endpoints: /api/webhooks/google, /api/webhooks/microsoft
- Per-provider signature verification implementation

### Employee Data Model
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

### Multi-Tenant Isolation
- organizationId field on every document (top-level collections)
- Both Firestore Security Rules AND application layer enforce isolation
- Query wrapper that automatically adds orgId filter to all queries
- User belongs to exactly one organization (no multi-org support)

### Claude's Discretion
- Exact encryption algorithm parameters
- Webhook processing batch size
- Rate limit thresholds before backoff
- Specific Cloud Logging structure

</decisions>

<specifics>
## Specific Ideas

- Integration status should be visible to all members so they know data is flowing
- "I want it to fail fast and notify rather than silently retry forever"
- Minimal scopes upfront = better user trust during OAuth consent

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-integration-infrastructure*
*Context gathered: 2026-02-27*
