# Klayim - Meeting & Task ROI Tracker

## What This Is

Klayim is a B2B SaaS platform that helps organizations track the ROI of their meetings and tasks by connecting to their existing tools (HRIS, Calendar, Task Management) and providing governance controls. It calculates meeting costs based on employee hourly rates and surfaces low-ROI meetings for review.

## Core Value

Organizations can see the true cost of their meetings and make data-driven decisions about time governance.

## Requirements

### Validated

- Auth pages (signin, signup, verify-email, forgot-password, reset-password) — existing
- User CRUD with email/password authentication — existing
- Organization CRUD with member management — existing
- NextAuth session management with credentials provider — existing
- Shared types and Zod schemas — existing

### Active

**User Onboarding:**
- [ ] Account details completion (name, password) after email verification
- [ ] Organization creation during onboarding
- [ ] Plan selection with 3 tiers (Individual $49, Team $149, Enterprise custom)
- [ ] Stripe payment integration for subscription billing

**Organization Onboarding:**
- [ ] Onboarding overview page with 3-step wizard
- [ ] HRIS integration (BambooHR, Rippling, Gusto)
- [ ] CSV employee data upload as alternative to HRIS
- [ ] Calendar integration (Google Workspace, Microsoft 365)
- [ ] Task management integration (Asana, ClickUp, Linear)
- [ ] Governance settings configuration

**Integrations:**
- [ ] OAuth flows for all providers
- [ ] Real-time webhook handlers for data sync
- [ ] Employee data import (names, emails, roles, hourly rates)
- [ ] Calendar event sync (meetings, attendees, duration)
- [ ] Task data sync (creation dates, completion, assignees)

**Governance:**
- [ ] Meeting cost threshold alerts
- [ ] Low ROI threshold flagging
- [ ] Approval email routing
- [ ] Dashboard auto-refresh settings

### Out of Scope

- Mobile app — web-first approach
- Video conferencing integration — focus on calendar metadata only
- Direct Slack/Teams integration — v2 consideration
- Custom HRIS beyond the 3 supported — CSV covers edge cases

## Context

**Existing Codebase:**
- Monorepo with pnpm workspaces: `apps/web` (Next.js 16), `apps/api` (Hono + Firebase Functions), `packages/shared`
- Clean Architecture on backend: types → models → repositories → usecases → services → routes
- Firebase stack: Firestore, Cloud Functions, Storage
- Frontend: NextAuth, React Query, TanStack Form, shadcn/Radix UI, Tailwind CSS
- Zod schemas for cross-layer validation

**UI Design:**
- Complete Figma designs available in `/Users/ardiansyahiqbal/Downloads/onboading-klayim/`
- 10 screens covering full onboarding flow
- Design system matches existing shadcn components

**Authentication:**
- Auth pages already implemented and functional
- Email-only signup flow with verification
- Profile completion during onboarding (name, password)

## Constraints

- **Tech Stack**: Must use existing Firebase + Next.js + Hono stack
- **Providers**: OAuth integration requires developer accounts on each platform
- **HRIS APIs**: Some may require partner agreements (Gusto, Rippling)
- **Webhooks**: Need public URL for webhook endpoints (Firebase Functions provides this)
- **Data Privacy**: Employee salary data must be handled securely

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Real OAuth connections vs mock | Need actual data for ROI calculations | — Pending |
| Real-time webhooks vs polling | Immediate updates, less API calls | — Pending |
| Stripe for payments | Industry standard, good Next.js integration | — Pending |
| All 3 HRIS providers in v1 | Cover majority of SMB market | — Pending |

---
*Last updated: 2026-02-26 after project initialization*
