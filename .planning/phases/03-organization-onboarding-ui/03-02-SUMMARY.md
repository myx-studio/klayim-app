---
phase: 03-organization-onboarding-ui
plan: 02
subsystem: ui
tags: [react, onboarding, wizard, form, dialog]

# Dependency graph
requires:
  - phase: 03-01
    provides: OrgOnboardingLayout, ProviderCard, InfoAccordion, SubStepper components
provides:
  - Connect HRIS page with provider cards and CSV fallback
  - Connect Calendar page with Google and Microsoft cards
  - Connect Task page with Asana, ClickUp, Linear cards
  - Configure Governance page with form fields
  - Onboarding Success page with completion message
  - Upload CSV dialog for employee data import
affects: [03-03, 03-04, phase-06-integrations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Multi-step wizard with shared OrgOnboardingLayout
    - Provider cards with toast notifications for coming soon features
    - InfoAccordion for tracking and privacy information
    - Form fields with InputGroup for prefix/suffix styling

key-files:
  created:
    - apps/web/src/components/pages/onboarding/connect-hris/index.tsx
    - apps/web/src/components/pages/onboarding/connect-calendar/index.tsx
    - apps/web/src/components/pages/onboarding/connect-task/index.tsx
    - apps/web/src/components/pages/onboarding/configure-governance/index.tsx
    - apps/web/src/components/pages/onboarding/onboarding-success/index.tsx
    - apps/web/src/components/onboarding/upload-csv-dialog.tsx
    - apps/web/src/app/onboarding/connect-task/page.tsx
    - apps/web/src/app/onboarding/onboarding-success/page.tsx
  modified:
    - apps/web/src/components/onboarding/org-onboarding-layout.tsx

key-decisions:
  - "Provider cards use placeholder icons (initials) until actual logos are added"
  - "Toast notifications show 'coming soon' for integration buttons"
  - "Configure Governance uses local state only (API in Phase 8)"
  - "Onboarding Success page has unique layout without OrgOnboardingLayout"
  - "OrgOnboardingLayout nextLabel prop changed to React.ReactNode for icon support"

patterns-established:
  - "Integration pages: provider cards + fallback options + info accordions"
  - "Governance forms: InputGroup with prefix/suffix for currency and multiplier fields"

requirements-completed: [OONB-01, OONB-02, OONB-03, OONB-04]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 03 Plan 02: Onboarding Pages Summary

**Complete organization onboarding wizard with HRIS/Calendar/Task provider cards, governance configuration form, and success page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T03:34:46Z
- **Completed:** 2026-02-27T03:37:50Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Implemented Connect HRIS page with BambooHR, Rippling, Gusto provider cards and Upload CSV fallback
- Created Connect Calendar page with Google Workspace and Microsoft 365 integration cards
- Added Connect Task page with Asana, ClickUp, Linear provider cards
- Built Configure Governance form with cost threshold, ROI threshold, email, refresh settings
- Created Onboarding Success page with welcome message and next steps checklist
- Implemented Upload CSV dialog with drag-drop zone and template download

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Connect HRIS and Upload CSV Dialog** - `cad8401` (feat)
2. **Task 2: Implement Connect Calendar and Connect Task Pages** - `fc51716` (feat)
3. **Task 3: Implement Configure Governance and Onboarding Success Pages** - `c316d82` (feat)

## Files Created/Modified
- `apps/web/src/components/pages/onboarding/connect-hris/index.tsx` - HRIS integration page with provider cards
- `apps/web/src/components/onboarding/upload-csv-dialog.tsx` - Dialog for CSV employee data upload
- `apps/web/src/components/pages/onboarding/connect-calendar/index.tsx` - Calendar integration page
- `apps/web/src/components/pages/onboarding/connect-task/index.tsx` - Task management integration page
- `apps/web/src/app/onboarding/connect-task/page.tsx` - Route for task integration page
- `apps/web/src/components/pages/onboarding/configure-governance/index.tsx` - Governance settings form
- `apps/web/src/components/pages/onboarding/onboarding-success/index.tsx` - Success/completion page
- `apps/web/src/app/onboarding/onboarding-success/page.tsx` - Route for success page
- `apps/web/src/components/onboarding/org-onboarding-layout.tsx` - Updated nextLabel prop type

## Decisions Made
- Used placeholder icons (initials like "BH", "GW", "A") for provider cards - actual logos to be added later
- Toast notifications display "coming soon" messages for all integration connect buttons
- Configure Governance uses local React state only - API integration deferred to Phase 8
- Onboarding Success page has unique centered layout, not using OrgOnboardingLayout wrapper
- Changed OrgOnboardingLayout `nextLabel` prop from `string` to `React.ReactNode` to support icon in button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated OrgOnboardingLayout nextLabel prop type**
- **Found during:** Task 3 (Configure Governance page)
- **Issue:** Plan specified Check icon in "Complete Setup" button, but nextLabel prop was typed as string
- **Fix:** Changed nextLabel prop type from `string` to `React.ReactNode` in OrgOnboardingLayout
- **Files modified:** apps/web/src/components/onboarding/org-onboarding-layout.tsx
- **Verification:** TypeScript compilation passes
- **Committed in:** c316d82 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor type fix required for icon support in button. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All organization onboarding pages complete and navigable
- Full wizard flow: Overview -> HRIS -> Calendar -> Task -> Governance -> Success -> Dashboard
- Integration connect buttons ready for Phase 6 OAuth implementation
- Governance form state ready for Phase 8 API integration

## Self-Check: PASSED

- All 9 files verified (8 created, 1 modified)
- All 3 commits verified (cad8401, fc51716, c316d82)

---
*Phase: 03-organization-onboarding-ui*
*Completed: 2026-02-27*
