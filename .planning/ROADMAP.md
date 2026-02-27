# Roadmap: Klayim Onboarding & Integrations

## Overview

This roadmap delivers the complete onboarding and integration layer for Klayim. Users start with account completion and billing setup, then configure their organization through a wizard that connects HRIS (for employee costs), calendars (for meetings), and task tools (for work tracking). The journey culminates in governance configuration that enables the core value: seeing the true cost of meetings and making data-driven decisions about time.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: User Onboarding** - Account completion and organization creation after email verification
- [ ] **Phase 2: Plan & Billing** - Stripe subscription integration with 3-tier pricing
- [ ] **Phase 3: Organization Onboarding UI** - 3-step wizard shell for integration configuration
- [x] **Phase 4: Integration Infrastructure** - OAuth token management, webhook handlers, multi-tenant isolation
- [ ] **Phase 5: Calendar Integration** - Google and Microsoft calendar sync with webhooks
- [ ] **Phase 6: HRIS Integration** - Employee data import via BambooHR, Finch, or CSV
- [ ] **Phase 7: Task Management Integration** - Asana, ClickUp, and Linear task sync
- [ ] **Phase 8: Governance Configuration** - Cost thresholds, ROI flagging, approval routing

## Phase Details

### Phase 1: User Onboarding
**Goal**: Users can complete their account setup and create an organization after email verification
**Depends on**: Nothing (first phase)
**Requirements**: UONB-01, UONB-02, UONB-03
**Success Criteria** (what must be TRUE):
  1. User can set their name and password after clicking email verification link
  2. User can create an organization with a name during onboarding
  3. User sees a progress stepper showing their position in the onboarding flow
  4. User is redirected to plan selection after completing account details
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md - Foundation: Stepper component, validation schemas, name availability endpoint
- [ ] 01-02-PLAN.md - Onboarding forms: Account details and organization creation pages

### Phase 2: Plan & Billing
**Goal**: Users can select a subscription plan and pay via Stripe
**Depends on**: Phase 1
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05
**Success Criteria** (what must be TRUE):
  1. User can view three plan options (Individual $49, Team $149, Enterprise custom)
  2. User can select Individual or Team plan and complete Stripe Checkout payment
  3. User on Enterprise plan can request contact with sales team
  4. System creates Stripe subscription and user gains access to organization onboarding
  5. System handles payment webhooks (success, failure, cancellation) without data loss
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md - Stripe backend infrastructure: SDK, billing service, checkout session API
- [ ] 02-02-PLAN.md - Plan selection UI: Pricing cards, enterprise contact form
- [ ] 02-03-PLAN.md - Webhook handler: Idempotent event processing, subscription status updates

### Phase 3: Organization Onboarding UI
**Goal**: Users see a clear wizard interface guiding them through integration setup
**Depends on**: Phase 2
**Requirements**: OONB-01, OONB-02, OONB-03, OONB-04
**Success Criteria** (what must be TRUE):
  1. User sees organization onboarding overview with 3-step wizard (HRIS -> Calendars & Tasks -> Governance)
  2. User can navigate forward and backward through wizard steps
  3. User can skip optional steps and proceed to next
  4. User sees completion page with "What happens next" after finishing setup
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md - Sub-stepper and shared components: SubStepper, ProviderCard, InfoAccordion, OrgOnboardingLayout
- [ ] 03-02-PLAN.md - Organization onboarding pages: Connect HRIS, Connect Calendar, Connect Task, Configure Governance, Onboarding Success, Upload CSV dialog

### Phase 4: Integration Infrastructure
**Goal**: Secure foundation for all provider integrations with encrypted tokens and reliable webhooks
**Depends on**: Phase 3
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. OAuth tokens are encrypted with AES-256 before storage (never plain text)
  2. Expired tokens are refreshed automatically without user intervention
  3. Webhook endpoints exist for all providers and respond within timeout limits
  4. Webhook signatures are verified per provider specification before processing
  5. Duplicate webhook events are handled idempotently (no duplicate data)
  6. All integration data is scoped to organization (no cross-tenant leakage)

**Data Model Note:**
Define the `Employee` collection schema here. Employees are imported data (NOT app users) used for:
- Matching meeting attendees by email
- Calculating meeting costs via hourlyRate
See REQUIREMENTS.md "Data Model Clarification" section for full schema.

**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md - Foundation: AES-256-GCM encryption library, integration types, employee types and schema
- [x] 04-02-PLAN.md - Repositories and services: Integration repo with encrypted credentials, employee repo, token refresh service
- [x] 04-03-PLAN.md - Webhooks and security: Signature verification, queue-based processing, Firestore security rules

### Phase 5: Calendar Integration
**Goal**: Users can connect Google or Microsoft calendars and sync meeting data
**Depends on**: Phase 4
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06
**Success Criteria** (what must be TRUE):
  1. User can connect Google Workspace calendar via OAuth flow
  2. User can connect Microsoft 365 calendar via OAuth flow
  3. System imports calendar events with meeting title, attendees, and duration
  4. System receives real-time updates when meetings change via webhooks
  5. System catches missed webhook events through periodic polling fallback
  6. User sees clear explanation of what will and won't be tracked before connecting
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md - OAuth flows and SDK setup: googleapis, @azure/msal-node, CalendarEvent types, Google/Microsoft OAuth endpoints
- [ ] 05-02-PLAN.md - Calendar sync: CalendarEvent repository, SyncState tracking, full/incremental sync with syncToken/deltaLink
- [ ] 05-03-PLAN.md - Webhooks and UI: Webhook registration, webhook handlers, polling fallback, frontend Connect button wiring

### Phase 6: HRIS Integration
**Goal**: Users can import employee data (including hourly rates) from their HR system
**Depends on**: Phase 4
**Requirements**: HRIS-01, HRIS-02, HRIS-03, HRIS-04, HRIS-05, HRIS-06, HRIS-07
**Success Criteria** (what must be TRUE):
  1. User can connect BambooHR via OAuth and import employees
  2. User can connect Rippling via Finch unified API and import employees
  3. User can connect Gusto via Finch unified API and import employees
  4. User can upload CSV file as alternative when no HRIS available
  5. System imports employee name, email, role, department, and hourly rate
  6. System calculates hourly rate from annual salary when hourly not provided
  7. User sees explanation of what employee data will be imported before connecting

**Data Model Note:**
This phase imports data into the `Employee` collection (schema defined in Phase 4).
Remember: Employees are NOT app users (OrganizationMembers). They are imported data used for:
- Matching meeting attendees by company email
- Calculating meeting costs based on hourlyRate
See REQUIREMENTS.md "Data Model Clarification" section for the distinction.

**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md - BambooHR OAuth: BambooHR service, OAuth routes, HRIS sync service for employee import
- [ ] 06-02-PLAN.md - Finch integration: Finch SDK, Connect sessions, employee sync for Rippling/Gusto
- [ ] 06-03-PLAN.md - CSV and frontend wiring: PapaParse parsing, employee import API, connect-hris OAuth handlers

### Phase 7: Task Management Integration
**Goal**: Users can connect task management tools and sync task data for ROI tracking
**Depends on**: Phase 4
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, TASK-06
**Success Criteria** (what must be TRUE):
  1. User can connect Asana workspace via OAuth
  2. User can connect ClickUp workspace via OAuth
  3. User can connect Linear workspace via OAuth
  4. System imports tasks with creation date, completion status, and assignees
  5. System imports time tracking data where available from provider
  6. User sees explanation of what task data will be imported before connecting
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md - Foundation: Install asana and @linear/sdk, create Task/TaskSyncState types
- [ ] 07-02-PLAN.md - Provider services: Asana, ClickUp, Linear OAuth services and routes, token refresh
- [ ] 07-03-PLAN.md - Sync and frontend: TaskSyncService, task repository, connect-task page wiring

### Phase 8: Governance Configuration
**Goal**: Users can configure thresholds and rules that power meeting cost governance
**Depends on**: Phase 5, Phase 6
**Requirements**: GOV-01, GOV-02, GOV-03, GOV-04, GOV-05, GOV-06
**Success Criteria** (what must be TRUE):
  1. User can set meeting cost threshold (meetings exceeding $X require approval)
  2. User can set low ROI threshold (meetings below X ROI flagged for review)
  3. User can set approval email address for routing high-cost meetings
  4. User can configure dashboard auto-refresh interval
  5. User can enable or disable pull-to-refresh functionality
  6. Governance settings persist per organization across sessions
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md - Backend infrastructure: GovernanceSettings type, Zod schema, repository method, service method, PATCH /organizations/:id/governance endpoint
- [ ] 08-02-PLAN.md - Frontend wiring: useUpdateGovernance hook, react-hook-form integration, add missing approvalEmail field, persist settings to API

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

Note: Phases 5, 6, and 7 all depend on Phase 4 and can be parallelized if needed. Phase 8 depends on both Phase 5 (calendar data) and Phase 6 (employee costs) to calculate ROI.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. User Onboarding | 1/2 | In Progress | - |
| 2. Plan & Billing | 3/3 | Complete | 2026-02-26 |
| 3. Organization Onboarding UI | 2/2 | Complete | 2026-02-27 |
| 4. Integration Infrastructure | 3/3 | Complete | 2026-02-27 |
| 5. Calendar Integration | 3/3 | Complete | 2026-02-27 |
| 6. HRIS Integration | 3/3 | Complete | 2026-02-27 |
| 7. Task Management Integration | 3/3 | Complete | 2026-02-27 |
| 8. Governance Configuration | 0/2 | Not started | - |

---
*Roadmap created: 2026-02-26*
*Last updated: 2026-02-27 - Phase 8 plans created*
