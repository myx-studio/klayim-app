# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Organizations can see the true cost of their meetings and make data-driven decisions about time governance.
**Current focus:** Phase 7 - Task Management Integration

## Current Position

Phase: 7 of 8 (Task Management Integration)
Plan: 2 of 3 in current phase
Status: In Progress
Last activity: 2026-02-27 - Completed 07-02-PLAN.md (Provider Services)

Progress: [████████░░] 85%

## Performance Metrics

**Velocity:**
- Total plans completed: 17
- Average duration: 3.9 min
- Total execution time: 1.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-user-onboarding | 1 | 3 min | 3 min |
| 02-plan-billing | 3 | 12 min | 4 min |
| 03-organization-onboarding-ui | 2 | 5 min | 2.5 min |
| 04-integration-infrastructure | 3 | 9 min | 3 min |
| 05-calendar-integration | 3 | 16 min | 5.3 min |
| 06-hris-integration | 3 | 15 min | 5 min |
| 07-task-management-integration | 2 | 10 min | 5 min |

**Recent Trend:**
- Last 5 plans: 06-01 (3 min), 06-02 (5 min), 06-03 (7 min), 07-01 (3 min), 07-02 (7 min)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stepper uses CVA for variant styling (consistent with existing UI components)
- Password requirements array exported for checklist component to iterate
- Organization name check route placed before /:id to prevent route conflict
- Billing uses existing PlanType from organization types for consistency
- Billing checkout schema extends subscriptionCheckoutSchema with organizationId
- Webhook uses Firebase rawBody passthrough for signature verification
- ActivePlan.status accepts both PlanStatus and SubscriptionStatus
- Return 200 on webhook errors to prevent Stripe retries
- Reused existing PricingItem component for plan selection instead of new plan-card
- Map pricing plan IDs to billing PlanType (individual->starter, team->professional)
- SubStepper uses CVA for consistent variant styling matching existing Stepper
- OrgOnboardingLayout imports ORG_ONBOARDING_STEPS directly for step mapping
- InfoAccordion uses positive/negative boolean for icon selection
- Provider cards use placeholder icons (initials) until actual logos are added
- Toast notifications show 'coming soon' for integration buttons
- Configure Governance uses local state only (API in Phase 8)
- Onboarding Success page has unique layout without OrgOnboardingLayout
- OrgOnboardingLayout nextLabel prop changed to React.ReactNode for icon support
- scrypt for key derivation (memory-hard, GPU-resistant)
- keyVersion field for future encryption key rotation
- hourlyRateCents as integer (avoid floating point)
- Reactivate disconnected integrations on reconnect instead of creating new
- Token refresh stubs until libraries installed in Phase 5/6/7
- Bulk email lookup chunks queries to 30 items (Firestore limit)
- Separate processed_events collection from processed_stripe_events for clarity
- Channel token format {organizationId}:{secret} for org extraction
- Microsoft expects 202 Accepted, not 200 OK
- Use googleapis Auth.OAuth2Client type import instead of google-auth-library
- MSAL common authority for multi-tenant support (personal and work Microsoft accounts)
- OAuth state carries organizationId and redirectUrl for callback context
- Extract refresh token from MSAL cache since it's not exposed in token response
- Upsert by externalId for idempotent sync (safe to re-run)
- Sync state uses integrationId as document ID for 1:1 mapping
- Initial sync runs async (non-blocking) to avoid OAuth redirect delay
- Cancelled events are deleted from database rather than updated
- Webhook registration best-effort: continue without if registration fails
- Google webhooks re-registered on renewal (no PATCH support)
- Microsoft webhooks renewed via PATCH with 3-day extension
- Polling fallback every 15 minutes catches missed webhooks
- OAuth callback status shown via toast notifications
- Store companyDomain in accountId field since BambooHR identifies accounts by subdomain
- Use accountEmail as {companyDomain}@bamboohr since BambooHR doesn't expose user email
- Calculate hourly rate from salary using 2080 hours/year (40 hrs/week * 52 weeks)
- Skip employees without email (can't match to meeting attendees)
- Use type guards for Finch SDK union types (BatchError vs valid response)
- Set Finch token expiry to 10 years since Finch tokens don't expire
- Store companyName@providerId in accountEmail for Finch integrations
- Use POST endpoints for Finch OAuth (session + callback) since Connect uses embedded modal
- Use sessionStorage for CSV data between upload/validate/confirm pages
- Column aliases handle common CSV variations (full_name, email_address, etc.)
- Calculate hourly rate client-side for preview, server-side for import
- Use deterministic sourceId from email hash for CSV re-import idempotency
- Use asana v3 SDK (v1 deprecated)
- ClickUp uses direct fetch (no official SDK)
- TaskTimeEntry for Asana/ClickUp, estimatePoints for Linear story points
- Use direct fetch for Asana instead of SDK (v3 SDK lacks TypeScript types)
- ClickUp tokens never expire - set 10-year expiry, no refresh needed
- Linear uses @linear/sdk for GraphQL but fetch for OAuth token exchange

### Pending Todos

None yet.

### Blockers/Concerns

**From Research:**
- HRIS partner applications (Gusto, Rippling) require 2+ month approval - start Day 1 of Phase 6
- Microsoft admin consent may block enterprise users - design consent escalation flow in Phase 5
- Google granular OAuth (2026) requires scope checking - handle in Phase 5

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 07-02-PLAN.md (Provider Services)
Resume file: .planning/phases/07-task-management-integration/07-03-PLAN.md

---
*State initialized: 2026-02-26*
