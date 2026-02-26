# Feature Landscape: Provider API Capabilities

**Domain:** Meeting/Task ROI Tracking - Provider Integrations
**Researched:** 2026-02-26
**Overall Confidence:** MEDIUM (verified with official docs where possible)

## Executive Summary

This research documents what data each provider API can actually deliver for Klayim's meeting/task ROI calculations. The core requirement is calculating meeting costs using `(meeting duration) x (sum of attendee hourly rates)`. This requires reliable access to employee compensation data (from HRIS) and meeting/task data (from calendar/task management tools).

**Key Finding:** HRIS APIs have the most restrictive access patterns. Gusto and Rippling require formal partner agreements before production access. BambooHR is the most accessible for direct integration.

---

## HRIS Providers

### 1. BambooHR API

**Confidence:** HIGH (verified with official documentation)

#### Table Stakes - What We Can Definitely Get

| Data | API Field | Notes |
|------|-----------|-------|
| Employee ID | `id` | Unique identifier |
| Full Name | `firstName`, `lastName`, `displayName` | Required for attendee matching |
| Email | `workEmail` | Primary key for calendar attendee matching |
| Job Title | `jobTitle` | From historical table |
| Department | `department` | Organizational grouping |
| Employment Status | `status` | Active/Terminated/etc. |
| **Pay Rate** | `rate` | e.g., "56.00 USD" or "75000 USD" |
| **Pay Type** | `type` | "Hourly" or "Salary" |
| Pay Period | `paidPer` | Hour, Day, Week, Month, Quarter, Year |
| Exempt Status | `exempt` | Exempt/Non-exempt |
| Compensation History | `compensation` table | Historical pay changes with dates |
| Standard Hours/Week | Via Job tab | Required for hourly rate calculation from salary |

#### How to Calculate Hourly Rate

```
If type == "Hourly":
  hourlyRate = rate
If type == "Salary":
  hourlyRate = annualSalary / (standardHoursPerWeek * 52)
```

#### Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| 400 fields per request | Pagination needed for large orgs | Batch requests |
| API key per company | Requires customer action | OAuth-like flow via settings |
| Some fields require admin access | May not get compensation without proper role | Document required permissions |

#### Access Requirements

| Requirement | Details |
|-------------|---------|
| Authentication | HTTP Basic Auth with API key as username |
| Pricing | Included with BambooHR subscription |
| Partner Program | **NOT required** - direct API access available |
| Rate Limits | Not explicitly documented, reasonable usage expected |

#### Sources
- [BambooHR Get Employee](https://documentation.bamboohr.com/reference/get-employee-1)
- [BambooHR Table Name & Fields](https://documentation.bamboohr.com/docs/table-name-fields)
- [BambooHR Getting Started](https://documentation.bamboohr.com/docs/getting-started)

---

### 2. Rippling API

**Confidence:** MEDIUM (official docs require login for full access)

#### Table Stakes - What We Can Definitely Get

| Data | API Field | Notes |
|------|-----------|-------|
| Worker ID | `id` | Unique identifier |
| User Info | `user` | Name, email |
| Manager | `manager` | Reporting structure |
| Department | `department` | Organizational grouping |
| Employment Type | `employment_type` | Full-time, Part-time, Contractor |
| **Annual Salary** | `compensation.annualSalary` | e.g., "100000" |
| **Salary Unit** | `compensation.salaryUnit` | "Yearly" |
| **Salary Per Unit** | `compensation.salaryPerUnit` | For calculating periodic pay |
| **Currency** | `compensation.currency` | "USD" |
| Compensation Time Period | `compensation_time_period` | HOURLY or SALARIED |
| Legal Entity | `legal_entity` | Company entity |

#### How to Calculate Hourly Rate

```
If compensation_time_period == "HOURLY":
  hourlyRate = salaryPerUnit  // Already hourly
If compensation_time_period == "SALARIED":
  hourlyRate = annualSalary / 2080  // Standard 40hr/week * 52
```

#### Critical Limitation: Partner Program Required

| Requirement | Details |
|-------------|---------|
| Partner Application | Must apply through Rippling Partner program |
| Approval Timeline | Can take "a few weeks" per documentation |
| SSO/SAML Required | Must support User Management and Single Sign-On |
| Customer Requirement | Employers must purchase Identity & Access Management package |
| Token Expiry | 30 days of inactivity |

#### Impact Assessment

**BLOCKER for MVP:** Rippling requires formal partnership agreement. This is not a quick integration.

**Recommendation:** Defer Rippling to post-MVP. Use Finch or Merge as unified HRIS API to handle Rippling without direct partnership.

#### Sources
- [Rippling Partner Requirements](https://developer.rippling.com/docs/rippling-api/4c56660ae18e4-partner-requirements)
- [Rippling List Workers](https://developer.rippling.com/documentation/rest-api/reference/list-workers)
- [Rippling API Documentation PDF](https://go.rippling.com/rs/345-FHM-674/images/rippling-api-documentation.pdf)

---

### 3. Gusto API

**Confidence:** HIGH (verified with official documentation)

#### Table Stakes - What We Can Definitely Get

| Data | API Field | Notes |
|------|-----------|-------|
| Employee ID | `uuid` | Unique identifier |
| Full Name | Employee object | First, middle, last name |
| Email | `email` | For attendee matching |
| Job Title | Job object | Via jobs endpoint |
| **Pay Rate** | `rate` in compensation | Numeric value |
| **Payment Unit** | `payment_unit` | Hour, Week, Month, Year, Paycheck |
| **FLSA Status** | `flsa_status` | Determines hourly vs salaried |
| Hourly Compensations | `hourly_compensations` | Wages calculated by hour |
| Fixed Compensations | `fixed_compensations` | Salaries, bonuses, commissions |
| Effective Date | `effective_date` | When compensation started |

#### FLSA Status Mapping

| Status | Type | Hourly Rate Calculation |
|--------|------|------------------------|
| `Nonexempt` | Hourly | rate = hourly_compensations.rate |
| `Salaried Nonexempt` | Salaried + OT | rate = fixed_compensations.rate / (40 * 52) |
| `Exempt` | Salaried | rate = fixed_compensations.rate / 2080 |
| `Owner` | Owner | rate = paycheck_rate / hours_per_period |

#### Critical Limitation: Partner Program Required

| Requirement | Details |
|-------------|---------|
| Partnership Required | "Gusto Embedded is not able to support all partner use cases" |
| Pre-approval | Must connect with partnerships team before production |
| Demo Timeline | Up to 2 months from demo keys to production keys |
| Security Review | Commercial, security, and implementation reviews required |
| Program Types | App Integrations Program OR Gusto Embedded |

#### Access Paths

1. **Gusto Embedded** - Full payroll embedding (overkill for ROI tracking)
2. **App Integrations** - Better fit, but still gated

#### Impact Assessment

**BLOCKER for MVP:** Like Rippling, Gusto requires formal business development efforts.

**Recommendation:** Defer Gusto to post-MVP. Use Finch or Merge unified API as alternative.

#### Sources
- [Gusto Jobs and Compensations](https://docs.gusto.com/app-integrations/docs/jobs-and-compensations)
- [Gusto Embedded Introduction](https://docs.gusto.com/embedded-payroll/docs/introduction)
- [Gusto Payroll Fundamentals](https://docs.gusto.com/embedded-payroll/docs/payroll-fundamentals)

---

## Calendar Providers

### 4. Google Calendar API (Workspace)

**Confidence:** HIGH (verified with official documentation)

#### Table Stakes - What We Can Definitely Get

| Data | API Field | Notes |
|------|-----------|-------|
| Event ID | `id` | Unique identifier |
| Title | `summary` | Meeting name |
| Description | `description` | Meeting notes (HTML or text) |
| **Start Time** | `start.dateTime` | ISO 8601 with timezone |
| **End Time** | `end.dateTime` | ISO 8601 with timezone |
| **Duration** | Calculated | `end - start` |
| **Attendees** | `attendees[]` | Array of participants |
| Attendee Email | `attendees[].email` | For matching with HRIS |
| Attendee Response | `attendees[].responseStatus` | accepted, declined, tentative, needsAction |
| **Organizer** | `organizer.email` | Meeting creator |
| Location | `location` | Physical location text |
| Is Online Meeting | `conferenceData` | Google Meet info if present |
| Meeting URL | `conferenceData.entryPoints[].uri` | Join URL |
| Recurrence | `recurrence` | RRULE for recurring meetings |
| Status | `status` | confirmed, tentative, cancelled |
| Is All Day | `isAllDay` | Exclude from cost calculations |
| Created At | `createdDateTime` | When event was created |

#### How to Calculate Meeting Cost

```typescript
const durationMinutes = (end - start) / 60000;
const attendeeCost = attendees
  .filter(a => a.responseStatus === 'accepted')
  .reduce((sum, attendee) => {
    const employee = findEmployeeByEmail(attendee.email);
    return sum + (employee?.hourlyRate || 0) * (durationMinutes / 60);
  }, 0);
```

#### Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| `maxAttendees` parameter | Large meetings may truncate attendees | Request with high limit or paginate |
| External attendees | No HRIS data for non-employees | Track as "external" with $0 or average cost |
| Declined attendees still returned | Need to filter by responseStatus | Filter in application code |
| Free/busy only for some users | May not get full details for all calendars | Require appropriate OAuth scopes |

#### Access Requirements

| Requirement | Details |
|-------------|---------|
| Authentication | OAuth 2.0 |
| Scopes | `calendar.readonly` or `calendar.events.readonly` |
| Pricing | Free (part of Google Workspace API) |
| Rate Limits | Per-user and per-project limits apply |
| Partner Program | **NOT required** |

#### Webhooks (Push Notifications)

Google Calendar supports push notifications via webhooks. Can receive real-time updates for:
- Event created
- Event updated
- Event deleted

#### Sources
- [Google Calendar Events Reference](https://developers.google.com/workspace/calendar/api/v3/reference/events)
- [Google Calendar Concepts](https://developers.google.com/workspace/calendar/api/concepts/events-calendars)
- [Google Calendar Create Events](https://developers.google.com/workspace/calendar/api/guides/create-events)

---

### 5. Microsoft Graph API (Outlook/Teams)

**Confidence:** HIGH (verified with official Microsoft documentation)

#### Table Stakes - What We Can Definitely Get

| Data | API Field | Notes |
|------|-----------|-------|
| Event ID | `id` | Unique identifier (can be immutable) |
| Subject | `subject` | Meeting title |
| Body | `body` | HTML or text content |
| **Start** | `start.dateTime` + `start.timeZone` | Event start |
| **End** | `end.dateTime` + `end.timeZone` | Event end |
| **Duration** | Calculated | `end - start` |
| **Attendees** | `attendees[]` | Collection of Attendee objects |
| Attendee Email | `attendees[].emailAddress.address` | For HRIS matching |
| Attendee Type | `attendees[].type` | required, optional, resource |
| Response Status | `attendees[].status.response` | none, organizer, tentativelyAccepted, accepted, declined, notResponded |
| **Organizer** | `organizer.emailAddress` | Meeting creator |
| Location | `location` / `locations[]` | Physical or virtual locations |
| **Is Online Meeting** | `isOnlineMeeting` | Boolean flag |
| Online Meeting Provider | `onlineMeetingProvider` | teamsForBusiness, skypeForBusiness, etc. |
| **Join URL** | `onlineMeeting.joinUrl` | Teams/Skype join link |
| Recurrence | `recurrence` | PatternedRecurrence object |
| Is Cancelled | `isCancelled` | Boolean |
| Is All Day | `isAllDay` | Exclude from cost calculations |
| Categories | `categories[]` | Color categories |
| Importance | `importance` | low, normal, high |

#### Teams Meeting Integration

When `isOnlineMeeting: true` and `onlineMeetingProvider: "teamsForBusiness"`:
- Full parity with Outlook UI experience
- Access to join URL, dial-in numbers
- Video conferencing and lobby features available to users

#### Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Max 500 attendees | Large all-hands may truncate | Rare edge case for most orgs |
| Group calendars different | Different behavior for M365 groups | Handle separately |
| No attachments for group events | Minor | N/A for ROI tracking |
| Reminders only for user calendars | Minor | N/A for ROI tracking |

#### Access Requirements

| Requirement | Details |
|-------------|---------|
| Authentication | OAuth 2.0 / Microsoft Identity Platform |
| Scopes | `Calendars.Read` or `Calendars.ReadWrite` |
| Pricing | Free (part of Microsoft Graph) |
| Rate Limits | Service-specific limits |
| Partner Program | **NOT required** |

#### Webhooks (Change Notifications)

Microsoft Graph supports webhooks for calendar changes via the `/subscriptions` endpoint.

#### Sources
- [Microsoft Graph Event Resource](https://learn.microsoft.com/en-us/graph/api/resources/event?view=graph-rest-1.0)
- [Microsoft Graph Calendar Overview](https://learn.microsoft.com/en-us/graph/api/resources/calendar-overview?view=graph-rest-1.0)
- [Choose Online Meeting API](https://learn.microsoft.com/en-us/graph/choose-online-meeting-api)
- [Outlook Calendar Online Meetings](https://learn.microsoft.com/en-us/graph/outlook-calendar-online-meetings)

---

## Task Management Providers

### 6. Asana API

**Confidence:** HIGH (verified with official documentation)

#### Table Stakes - What We Can Definitely Get

| Data | API Field | Notes |
|------|-----------|-------|
| Task ID | `gid` | Globally unique identifier |
| Task Name | `name` | Task title |
| Description | `notes` or `html_notes` | Task details |
| Assignee | `assignee` | User object |
| Assignee Email | `assignee.email` | For HRIS matching |
| Project | `projects[]` | Container(s) for task |
| Created At | `created_at` | When task was created |
| Completed At | `completed_at` | When task was completed |
| Due Date | `due_on` / `due_at` | Deadline |
| **Time Estimate** | `estimated_minutes` | Estimated time (native feature) |
| **Time Tracked** | `time_tracking_entries` | Actual time logged |
| Tags | `tags[]` | Task labels |
| Custom Fields | `custom_fields[]` | Organization-specific data |

#### Time Tracking Fields (Native Feature)

| Data | API Field | Notes |
|------|-----------|-------|
| Entry ID | `gid` | Unique identifier |
| **Duration** | `duration_minutes` | Time tracked in minutes |
| Date | `entered_on` | When time was logged |
| Created By | `created_by` | User who logged time |
| Task | `task` | Associated task |
| Approval Status | `approval_status` | DRAFT, SUBMITTED, APPROVED, REJECTED |
| Billable Status | `billable_status` | billable, nonBillable, notApplicable |
| Description | `description` | Notes about the work |

#### Critical Limitation: Plan Tier Required

| Plan | Time Tracking Available | API Access |
|------|------------------------|------------|
| Basic (Free) | No | Yes |
| Premium | No | Yes |
| **Advanced** | **Yes** | Yes |
| **Enterprise** | **Yes** | Yes |
| **Enterprise+** | **Yes** | Yes |

**Time tracking requires Advanced plan or higher.**

#### Rate Limits

| Tier | Limit |
|------|-------|
| Free | Lower (unspecified) |
| Premium+ | 1,500 requests/minute |

Plus cost-based limits for expensive queries.

#### Sources
- [Asana Time Tracking Entries](https://developers.asana.com/reference/time-tracking-entries)
- [Asana Rate Limits](https://developers.asana.com/docs/rate-limits)
- [Asana Time Tracking Feature](https://asana.com/features/resource-management/time-tracking)
- [Asana Forum: Time Tracking API Update](https://forum.asana.com/t/new-time-tracking-entries-api-query-by-project-portfolio-or-user/1099480)

---

### 7. ClickUp API

**Confidence:** HIGH (verified with official documentation)

#### Table Stakes - What We Can Definitely Get

| Data | API Field | Notes |
|------|-----------|-------|
| Task ID | `id` | Unique identifier |
| Task Name | `name` | Task title |
| Description | `description` | Task details |
| Assignees | `assignees[]` | Array of user IDs |
| Status | `status` | Task status |
| Priority | `priority` | Urgency level |
| Created Date | `date_created` | Unix timestamp |
| Due Date | `due_date` | Deadline |
| Time Estimate | `time_estimate` | In milliseconds |
| Space/Folder/List | Hierarchical | Organizational structure |
| Tags | `tags[]` | Task labels |
| Custom Fields | `custom_fields[]` | Organization-specific |

#### Time Tracking Fields

| Data | Endpoint | Notes |
|------|----------|-------|
| Time Entries | `GET /team/{team_id}/time_entries` | Within date range |
| Entry Duration | `duration` | In milliseconds (negative = running) |
| Entry Start | `start` | Unix timestamp |
| Entry End | `end` | Unix timestamp |
| Entry User | `user` | Who tracked time |
| Task Context | `task.id`, `task.name`, `task.status` | Full task context |
| Space/Folder/List | Included | Full hierarchy context |
| Tags | `task.tags[]` | Task tags included |
| Running Timer | `GET /team/{team_id}/time_entries/current` | Currently tracking |
| Entry History | `GET /team/{team_id}/time_entries/{timer_id}/history` | Change log |
| Time in Status | Via ClickApp | How long in each status |

#### Access Requirements

| Requirement | Details |
|-------------|---------|
| Authentication | API Token or OAuth 2.0 |
| Pricing | Time tracking available on **all plans** |
| Rate Limits | Documented per endpoint |
| Partner Program | **NOT required** |

**Major Advantage:** Time tracking is available on all ClickUp plans, unlike Asana which requires Advanced+.

#### Sources
- [ClickUp Get Time Entries](https://developer.clickup.com/reference/gettimeentrieswithinadaterange)
- [ClickUp Tasks](https://developer.clickup.com/docs/tasks)
- [ClickUp Time Tracking Intro](https://help.clickup.com/hc/en-us/articles/6304291811479-Intro-to-time-tracking)
- [ClickUp Time Entry History](https://developer.clickup.com/reference/gettimeentryhistory)

---

### 8. Linear API

**Confidence:** MEDIUM (GraphQL schema verified, time tracking is newer feature)

#### Table Stakes - What We Can Definitely Get

| Data | GraphQL Field | Notes |
|------|---------------|-------|
| Issue ID | `id` | Unique identifier |
| Title | `title` | Issue name |
| Description | `description` | Markdown content |
| Assignee | `assignee` | User object |
| Team | `team` | Team container |
| Project | `project` | Project container |
| Cycle | `cycle` | Sprint/iteration |
| **Created At** | `createdAt` | Issue creation time |
| **Started At** | `startedAt` | When work began |
| **Completed At** | `completedAt` | When issue closed |
| **Canceled At** | `canceledAt` | If canceled |
| State | `state` | Current workflow state |
| Priority | `priority` | Urgency level |
| Estimate | `estimate` | Story points |
| Labels | `labels` | Issue labels |

#### Time Tracking (2026 Feature)

Linear added native time-in-status tracking in 2026:

| Data | Access Method | Notes |
|------|---------------|-------|
| **Time in Status** | Hover on status indicator | Cumulative time per status |
| Status History | `IssueHistory` | Track state transitions |
| Cycle Time | Calculated | `completedAt - startedAt` |
| Lead Time | Calculated | `completedAt - createdAt` |
| Bottleneck Detection | Filter by time in status | e.g., "In Review > 7 days" |

#### Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No explicit time logging | Users don't log hours | Calculate from status times |
| Time tracking is implicit | Different mental model | Use cycle time metrics instead |
| Rate limits | 500-1500 req/hour depending on auth | Batch queries |

#### Access Requirements

| Requirement | Details |
|-------------|---------|
| Authentication | API Key or OAuth 2.0 |
| API Type | GraphQL |
| Pricing | All plans (Starter and up) |
| Rate Limits | 500-1500 requests/hour |
| Partner Program | **NOT required** |

#### Sources
- [Linear Developers GraphQL](https://linear.app/developers/graphql)
- [Linear API Schema](https://github.com/linear/linear/blob/master/packages/sdk/src/schema.graphql)
- [Linear Changelog](https://linear.app/changelog)
- [Screenful: Lead and Cycle Times](https://screenful.com/blog/tracking-lead-and-cycle-times-of-linear-issues)

---

## Payment Provider

### 9. Stripe API

**Confidence:** HIGH (verified with official documentation)

#### Table Stakes - What We Can Definitely Get

| Data | API Endpoint / Field | Notes |
|------|---------------------|-------|
| Customer ID | `customer.id` | Unique identifier |
| Subscription ID | `subscription.id` | Unique subscription |
| Subscription Status | `subscription.status` | active, past_due, canceled, etc. |
| Plan/Price | `subscription.items[].price` | Subscribed plan |
| Current Period | `current_period_start`, `current_period_end` | Billing cycle |
| Trial End | `trial_end` | Trial expiration |
| Cancel At | `cancel_at` | Scheduled cancellation |
| Payment Method | `payment_method` | Card, bank, etc. |
| Invoices | `invoice` object | Billing history |
| Invoice Status | `invoice.status` | draft, open, paid, void |

#### Webhook Events

| Event | When Fired | Action |
|-------|------------|--------|
| `customer.subscription.created` | New subscription | Provision access |
| `customer.subscription.updated` | Plan change, renewal | Update entitlements |
| `customer.subscription.deleted` | Subscription ended | Revoke access |
| `customer.subscription.trial_will_end` | 3 days before trial ends | Send reminder |
| `invoice.paid` | Payment successful | Confirm access |
| `invoice.payment_failed` | Payment failed | Handle retry |
| `invoice.payment_action_required` | 3DS/SCA needed | Request auth |

#### Customer Portal

Stripe provides a hosted customer portal for:
- Subscription management (upgrade/downgrade)
- Payment method updates
- Invoice history
- Cancellation

**Zero custom UI needed** for customer self-service billing.

#### Access Requirements

| Requirement | Details |
|-------------|---------|
| Authentication | API Key (secret key for server) |
| Pricing | Transaction-based (2.9% + $0.30 per transaction for cards) |
| Partner Program | **NOT required** |
| Webhooks | Built-in, retry for 3 days on failure |

#### Sources
- [Stripe Subscriptions Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Stripe Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [Stripe Build Subscriptions](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Stripe Subscriptions API](https://docs.stripe.com/api/subscriptions)

---

## Summary: Integration Priority Matrix

### MVP Integrations (No Partner Agreements Required)

| Provider | Category | Compensation Data | Time Data | Difficulty |
|----------|----------|-------------------|-----------|------------|
| **BambooHR** | HRIS | Yes (rate, type) | N/A | Low |
| **Google Calendar** | Calendar | N/A | Yes (duration, attendees) | Low |
| **Microsoft Graph** | Calendar | N/A | Yes (duration, attendees) | Low |
| **ClickUp** | Task Mgmt | N/A | Yes (all plans) | Low |
| **Stripe** | Payment | N/A | N/A | Low |

### Post-MVP Integrations (Partner Agreements or Unified API Required)

| Provider | Category | Blocker | Alternative |
|----------|----------|---------|-------------|
| **Rippling** | HRIS | Partner application required | Use Finch or Merge |
| **Gusto** | HRIS | Partner application required | Use Finch or Merge |
| **Asana** | Task Mgmt | Time tracking requires Advanced+ plan | Track via custom fields or ClickUp |
| **Linear** | Task Mgmt | Implicit time tracking (no explicit logging) | Calculate from status times |

### Unified HRIS API Alternative

For accessing Rippling and Gusto without direct partnerships:

| Provider | What It Does | Pros | Cons |
|----------|--------------|------|------|
| [Finch](https://www.tryfinch.com/) | Unified HRIS API | Handles partner agreements | Additional cost, latency |
| [Merge](https://www.merge.dev/) | Unified HRIS API | Handles partner agreements | Additional cost, latency |

**Recommendation:** For MVP, integrate BambooHR directly + CSV upload fallback. Post-MVP, add Finch/Merge for broader HRIS coverage including Rippling/Gusto.

---

## Feature Dependencies

```
HRIS Integration → Employee Hourly Rates
Calendar Integration → Meeting Events + Attendees
Employee Hourly Rates + Meeting Events → Meeting Cost Calculation
Meeting Cost + ROI Thresholds → Governance Alerts

Task Integration → Task Time Data
Employee Hourly Rates + Task Time → Task Cost Calculation
```

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time salary updates | Privacy concerns, complexity | Daily/weekly sync with historical tracking |
| Editing employee salaries | Out of scope, use HRIS | Read-only integration |
| Direct payroll integration | Compliance nightmare | Just read compensation data |
| Video call transcription | Scope creep, privacy | Focus on calendar metadata only |
| Building own time tracker | Reinventing the wheel | Integrate with existing tools |

## MVP Feature Recommendation

**Prioritize:**
1. BambooHR integration (compensation data)
2. CSV employee upload (fallback for any HRIS)
3. Google Calendar integration (most common)
4. Microsoft Graph integration (enterprise coverage)
5. Stripe subscription billing

**Defer:**
- Rippling/Gusto (require partner agreements)
- Asana time tracking (plan tier restriction)
- Linear (implicit time tracking model)
- ClickUp (lower priority than calendar)

**Phase 2:**
- Add Finch/Merge for unified HRIS
- Add task management integrations
- Add governance/alerting features
