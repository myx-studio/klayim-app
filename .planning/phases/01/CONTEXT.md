# Phase 1 Context: User Onboarding

**Captured:** 2026-02-26
**Method:** /gsd:discuss-phase

## Requirements Covered

- UONB-01: User can complete account details (name, password) after email verification
- UONB-02: User can create organization with name during onboarding
- UONB-03: User sees onboarding progress stepper

## Decisions Captured

### Account Form Design

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Name field structure | Single "Full Name" field | Simpler UX, matches Figma design |
| Password requirements display | Live checklist | Real-time feedback as user types |
| Confirm password feedback | Live match indicator | Immediate visual confirmation |
| Password visibility toggle | Eye toggle on both fields | Standard UX pattern |
| Email field behavior | Display only (not editable) | Email already verified, prevent confusion |
| Validation timing | On blur + submit | Balance between feedback and annoyance |
| Continue button state | Always enabled | Submit to see what needs fixing |
| Loading state UI | Disable form + spinner overlay | Prevent double submission, clear feedback |
| Password requirements | 8+ chars, uppercase, number, special char | Standard security requirements |
| Error message placement | Below each field | Clear association with invalid field |

### Progress Stepper

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Completed step indicator | Checkmark + filled background | Clear visual completion signal |
| Step navigation | Clickable completed steps | Allow users to go back and edit |
| Mobile display | Collapsed "Step X of Y" indicator | Save screen space on mobile |

### Organization Creation

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Name validation | Min 2 + max 50 chars + alphanumeric/spaces/hyphens | Reasonable limits, clean names |
| Name uniqueness | Globally unique | Prevent confusion between organizations |
| Uniqueness check | Real-time debounced check | Immediate feedback before submission |
| Creator role | Owner | Full permissions for organization creator |

### Flow & Transitions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| After account details | Go to Setup Organization | Complete user profile before billing |
| After organization creation | Go to Plan Selection (Phase 2) | Billing before integrations |
| Page transitions | Slide animations (left/right) | Smooth wizard-like flow |
| Resume behavior | Resume where user left off | Track progress, don't lose work |

## UI Reference

Figma screens in `/Users/ardiansyahiqbal/Downloads/onboading-klayim/`:
- `02-account-detail.png` - Account details form
- `03-setup-org.png` - Organization creation

## Technical Notes

### Account Details Form
- Fields: Full Name, Password, Confirm Password
- Email displayed but not editable (from verification)
- Real-time password strength checklist
- Real-time confirm password match indicator
- Debounced validation on blur

### Progress Stepper Component
- Steps: Create Account → Account Details → Setup Organization → Onboarding
- Completed: checkmark icon + filled color
- Current: highlighted/active state
- Future: muted/disabled state
- Mobile: "Step 2 of 4" text format

### Organization Creation
- Single field: Organization Name
- Real-time uniqueness check (debounced 300ms)
- Validation: 2-50 chars, alphanumeric + spaces + hyphens
- On success: create org, assign user as owner, redirect to Plan Selection

### State Persistence
- Track onboarding progress in user/organization document
- On login, check progress and redirect to appropriate step
- Steps: account_details → setup_organization → (Phase 2: plan_selection)

## Open Questions

None - all gray areas resolved.

---
*Context captured: 2026-02-26*
