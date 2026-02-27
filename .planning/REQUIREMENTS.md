# Requirements: Klayim Onboarding & Integrations

**Defined:** 2026-02-26
**Core Value:** Organizations can see the true cost of their meetings and make data-driven decisions about time governance.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### User Onboarding

- [x] **UONB-01**: User can complete account details (name, password) after email verification
- [ ] **UONB-02**: User can create organization with name during onboarding
- [x] **UONB-03**: User sees onboarding progress stepper (Create Account → Account Details → Setup Organization → Onboarding)

### Plan & Billing

- [x] **BILL-01**: User can view 3 plan tiers (Individual $49, Team $149, Enterprise custom)
- [x] **BILL-02**: User can select Individual or Team plan and pay via Stripe Checkout
- [x] **BILL-03**: User on Enterprise plan can request contact with sales
- [x] **BILL-04**: System creates Stripe subscription and stores subscription ID
- [x] **BILL-05**: System handles Stripe webhooks (payment success, failure, cancellation)

### Organization Onboarding

- [x] **OONB-01**: User sees organization onboarding overview with 3-step wizard
- [x] **OONB-02**: User can navigate through Connect HRIS → Connect Calendars & Task → Configure Governance
- [x] **OONB-03**: User can skip optional onboarding steps
- [x] **OONB-04**: User sees onboarding completion page with "What happens next"

### HRIS Integration

- [ ] **HRIS-01**: User can connect BambooHR via OAuth
- [ ] **HRIS-02**: User can connect to Rippling via Finch unified API
- [ ] **HRIS-03**: User can connect to Gusto via Finch unified API
- [ ] **HRIS-04**: User can upload employee CSV as alternative to HRIS
- [ ] **HRIS-05**: System imports employee data (name, email, role, department, hourly rate)
- [ ] **HRIS-06**: System calculates hourly rate from annual salary if needed
- [ ] **HRIS-07**: User sees "What we'll import" explanation before connecting

### Calendar Integration

- [x] **CAL-01**: User can connect Google Workspace calendar via OAuth
- [x] **CAL-02**: User can connect Microsoft 365 calendar via OAuth
- [x] **CAL-03**: System syncs calendar events (meetings, attendees, duration)
- [ ] **CAL-04**: System receives real-time updates via webhooks
- [ ] **CAL-05**: System falls back to polling if webhooks miss events
- [ ] **CAL-06**: User sees "What we'll track" and "What we don't track" explanations

### Task Management Integration

- [ ] **TASK-01**: User can connect Asana workspace via OAuth
- [ ] **TASK-02**: User can connect ClickUp workspace via OAuth
- [ ] **TASK-03**: User can connect Linear workspace via OAuth
- [ ] **TASK-04**: System syncs task data (creation date, completion, assignees)
- [ ] **TASK-05**: System syncs time tracking data where available
- [ ] **TASK-06**: User sees "What we'll import" explanation before connecting

### Governance Configuration

- [ ] **GOV-01**: User can set meeting cost threshold (meetings > $X require approval)
- [ ] **GOV-02**: User can set low ROI threshold (meetings < X ROI flagged for review)
- [ ] **GOV-03**: User can set approval email for routing high-cost meetings
- [ ] **GOV-04**: User can configure dashboard auto-refresh interval
- [ ] **GOV-05**: User can enable/disable pull-to-refresh
- [ ] **GOV-06**: System stores governance settings per organization

### Infrastructure

- [x] **INFRA-01**: System encrypts OAuth tokens with Cloud KMS before storing in Firestore
- [x] **INFRA-02**: System handles token refresh automatically
- [x] **INFRA-03**: System provides webhook endpoints for all providers
- [x] **INFRA-04**: System verifies webhook signatures per provider spec
- [x] **INFRA-05**: System implements idempotent webhook processing
- [x] **INFRA-06**: System enforces multi-tenant data isolation (org-scoped collections)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Additional HRIS

- **HRIS-V2-01**: Direct Rippling API integration (after partner approval)
- **HRIS-V2-02**: Direct Gusto API integration (after partner approval)

### Additional Task Tools

- **TASK-V2-01**: Jira integration
- **TASK-V2-02**: Monday.com integration
- **TASK-V2-03**: Trello integration

### Notifications

- **NOTF-01**: User receives email when meeting exceeds cost threshold
- **NOTF-02**: User receives weekly governance summary email
- **NOTF-03**: Admin receives approval requests for high-cost meetings

### Advanced Governance

- **GOV-V2-01**: Per-department governance rules
- **GOV-V2-02**: Meeting-free day enforcement
- **GOV-V2-03**: Focus time protection rules

## Data Model Clarification: Employee vs OrganizationMember

**Important distinction** between two concepts that may seem similar but serve different purposes:

### Employee (Imported Data)

Employees are **NOT app users**. They are data records imported from HRIS systems (BambooHR, Rippling, Gusto) or CSV uploads. Used for:
- **Matching meeting attendees** - Email addresses match against calendar invites
- **Calculating meeting costs** - Hourly rates determine cost per meeting

**Schema:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Auto-generated document ID |
| organizationId | string | Multi-tenant isolation key |
| fullName | string | Employee's full name |
| email | string | Company email (for attendee matching) |
| hourlyRate | number | Calculated or provided hourly rate |
| annualSalary | number? | Optional; used to calculate hourlyRate if not provided |
| department | string | Employee's department |
| title | string | Job title/role |
| employmentStatus | enum | 'active' | 'contractor' | 'terminated' |
| source | enum | 'bamboohr' | 'rippling' | 'gusto' | 'csv' |
| externalId | string? | ID from source system for sync |
| createdAt | timestamp | When imported |
| updatedAt | timestamp | Last sync update |

**Key Points:**
- Employees do NOT have login credentials
- Employees do NOT access the Klayim app
- Data is read-only from Klayim's perspective (synced from source)
- Multiple employees may share a domain but are not app users

### OrganizationMember (App Users)

OrganizationMembers are **actual users** who log into Klayim. They:
- View dashboards and analytics
- Configure governance rules
- Manage integrations
- Invite other members

**Schema:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Auto-generated document ID |
| organizationId | string | Multi-tenant isolation key |
| userId | string | Reference to User document |
| role | enum | 'owner' | 'admin' | 'manager' | 'viewer' |
| invitedBy | string? | userId of inviter |
| joinedAt | timestamp | When joined organization |

**Key Points:**
- OrganizationMembers have login credentials (via User)
- OrganizationMembers can be linked to an Employee record (optional)
- Role determines permissions within organization

### Relationship

```
User (auth)
  └── OrganizationMember (app access + role)
        └── Employee (optional link for cost tracking)
```

A user might exist as an OrganizationMember (they use the app) and also have a corresponding Employee record (imported from HRIS). This link enables the system to calculate the cost of meetings they organize or attend.

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first approach; mobile v2+ |
| Video conferencing content | Privacy concerns; metadata only |
| Slack/Teams integration | v2 after core value proven |
| Direct Rippling/Gusto API | Requires partner approval (4-12 weeks); using Finch instead |
| Apple Calendar | Enterprise focus; Google + Microsoft cover 95%+ |
| Custom HRIS integrations | CSV upload covers edge cases |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UONB-01 | Phase 1 | Complete |
| UONB-02 | Phase 1 | Pending |
| UONB-03 | Phase 1 | Complete |
| BILL-01 | Phase 2 | Complete |
| BILL-02 | Phase 2 | Complete |
| BILL-03 | Phase 2 | Complete |
| BILL-04 | Phase 2 | Complete |
| BILL-05 | Phase 2 | Complete |
| OONB-01 | Phase 3 | Complete |
| OONB-02 | Phase 3 | Complete |
| OONB-03 | Phase 3 | Complete |
| OONB-04 | Phase 3 | Complete |
| INFRA-01 | Phase 4 | Complete |
| INFRA-02 | Phase 4 | Complete |
| INFRA-03 | Phase 4 | Complete |
| INFRA-04 | Phase 4 | Complete |
| INFRA-05 | Phase 4 | Complete |
| INFRA-06 | Phase 4 | Complete |
| CAL-01 | Phase 5 | Complete |
| CAL-02 | Phase 5 | Complete |
| CAL-03 | Phase 5 | Complete |
| CAL-04 | Phase 5 | Pending |
| CAL-05 | Phase 5 | Pending |
| CAL-06 | Phase 5 | Pending |
| HRIS-01 | Phase 6 | Pending |
| HRIS-02 | Phase 6 | Pending |
| HRIS-03 | Phase 6 | Pending |
| HRIS-04 | Phase 6 | Pending |
| HRIS-05 | Phase 6 | Pending |
| HRIS-06 | Phase 6 | Pending |
| HRIS-07 | Phase 6 | Pending |
| TASK-01 | Phase 7 | Pending |
| TASK-02 | Phase 7 | Pending |
| TASK-03 | Phase 7 | Pending |
| TASK-04 | Phase 7 | Pending |
| TASK-05 | Phase 7 | Pending |
| TASK-06 | Phase 7 | Pending |
| GOV-01 | Phase 8 | Pending |
| GOV-02 | Phase 8 | Pending |
| GOV-03 | Phase 8 | Pending |
| GOV-04 | Phase 8 | Pending |
| GOV-05 | Phase 8 | Pending |
| GOV-06 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-27 after Phase 4 completion*
