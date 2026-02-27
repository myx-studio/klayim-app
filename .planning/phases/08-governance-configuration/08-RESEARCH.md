# Phase 8: Governance Configuration - Research

**Researched:** 2026-02-27
**Domain:** Settings persistence, Firestore document updates, form validation
**Confidence:** HIGH

## Summary

Phase 8 completes the governance configuration feature by adding backend persistence to the existing UI created in Phase 3. The implementation is straightforward because it follows existing patterns established in the codebase. The Organization document already has a `timeGovernance` field placeholder (though with different field names), the project uses react-hook-form with Zod validation, and there are clear examples of similar PATCH endpoints and React Query mutations.

The primary challenge is mapping the UI requirements (GOV-01 through GOV-06) to the existing data model. The current `TimeGovernanceSettings` interface has fields focused on time limits (meetingTimeThreshold, focusTimeMinimum) rather than cost governance (meetingCostThreshold, lowRoiThreshold). This interface needs to be updated to match the actual governance requirements.

**Primary recommendation:** Update `TimeGovernanceSettings` to match actual UI fields, add Zod validation schema, create `PATCH /organizations/:id/governance` endpoint, and wire the configure-governance page to use react-hook-form with React Query mutation.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GOV-01 | User can set meeting cost threshold (meetings > $X require approval) | New `meetingCostThresholdCents` field in GovernanceSettings, stored as integer cents to avoid floating point |
| GOV-02 | User can set low ROI threshold (meetings < X ROI flagged for review) | New `lowRoiThreshold` field (decimal, e.g., 1.0x) |
| GOV-03 | User can set approval email for routing high-cost meetings | New `approvalEmail` field with email validation - NOTE: Current UI is missing this field, needs to be added |
| GOV-04 | User can configure dashboard auto-refresh interval | New `dashboardRefreshMinutes` field (15, 30, 60, 120 options) |
| GOV-05 | User can enable/disable pull-to-refresh | New `pullToRefreshEnabled` boolean field |
| GOV-06 | System stores governance settings per organization | Settings stored as `governanceSettings` field on Organization document |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 4.3.6 (web) / 3.24.0 (api) | Schema validation | Already used for all API validation |
| react-hook-form | 7.71.2 | Form state management | Already installed and used (EnterpriseForm example) |
| @hookform/resolvers | 5.2.2 | Zod resolver for react-hook-form | Already installed |
| @tanstack/react-query | 5.90.21 | Server state & mutations | Already used for all API calls |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast notifications | Success/error feedback on save |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-hook-form | useState (current) | useState works but lacks validation, error handling, and dirty state tracking that react-hook-form provides for free |
| Separate governance collection | Organization subdocument | Subdocument is simpler and matches existing patterns (onboarding, activePlan are subdocuments on Organization) |

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Files fit existing structure:

```
packages/shared/src/
├── types/organization.ts        # UPDATE: GovernanceSettings interface
├── schemas/organization.ts      # ADD: governanceSettingsSchema
apps/api/src/
├── routes/organization.route.ts # ADD: PATCH /:id/governance endpoint
├── services/organization.service.ts  # ADD: updateGovernanceSettings method
├── repositories/organization.repository.ts  # ADD: updateGovernance method
apps/web/src/
├── components/pages/onboarding/configure-governance/index.tsx  # UPDATE: wire to API
├── hooks/use-organization.ts    # ADD: useUpdateGovernance mutation
```

### Pattern 1: Subdocument Settings on Organization

**What:** Governance settings stored as a nested object field on the Organization document, not a separate collection.

**When to use:** Settings that belong to exactly one organization and are always fetched together with organization data.

**Example (existing pattern from activePlan):**
```typescript
// packages/shared/src/types/organization.ts
export interface Organization extends Timestamps {
  id: string;
  name: string;
  // ... other fields
  activePlan?: ActivePlan;           // Existing subdocument pattern
  governanceSettings?: GovernanceSettings;  // New subdocument
}
```

**Why:** Reduces Firestore reads (no join needed), atomic updates, and matches existing codebase patterns.

### Pattern 2: PATCH Endpoint for Partial Updates

**What:** Dedicated PATCH endpoint that only updates the governance settings portion of the Organization document.

**When to use:** When updating a specific subset of a document without affecting other fields.

**Example (following existing updateOrganization pattern):**
```typescript
// apps/api/src/routes/organization.route.ts
organizations.patch(
  "/:id/governance",
  zValidator("json", governanceSettingsSchema),
  async (c) => {
    const userId = c.get("userId") as string | undefined;
    const id = c.req.param("id");

    if (!userId) {
      return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
    }

    const input = c.req.valid("json");
    const result = await organizationService.updateGovernanceSettings(id, input, userId);

    if ("error" in result) {
      const status = result.error === "Permission denied" ? 403 : 400;
      return c.json<ApiResponse<null>>({ success: false, error: result.error }, status);
    }

    return c.json<ApiResponse<GovernanceSettings>>({
      success: true,
      data: result,
    });
  }
);
```

### Pattern 3: React Query Mutation with Optimistic Updates

**What:** useMutation hook that immediately updates local cache before server confirmation.

**When to use:** Settings forms where instant feedback improves UX and rollback on error is acceptable.

**Example (following existing useUpdateOrganization pattern):**
```typescript
// apps/web/src/hooks/use-organization.ts
export function useUpdateGovernance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GovernanceSettingsInput }) => {
      const response = await fetcher<ApiResponse<GovernanceSettings>>(
        `/organizations/${id}/governance`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );

      if (!response.success) {
        throw new FetchError(400, response.error || "Failed to update governance settings");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}
```

### Anti-Patterns to Avoid

- **Separate governance collection:** Don't create `governance_settings` collection. Settings belong to one org, subdocument is simpler.
- **Storing dollars as decimals:** Use cents (integer) for `meetingCostThresholdCents` to avoid floating-point precision issues.
- **Multiple API calls to save:** Use a single PATCH endpoint that accepts all governance fields, not one endpoint per field.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | Zod schema + react-hook-form | Already used everywhere, handles edge cases |
| Form state management | useState for each field | react-hook-form useForm | Provides dirty state, validation, error handling |
| Cache invalidation | Manual refetch calls | React Query invalidateQueries | Handles race conditions, stale data automatically |
| Currency handling | Float/decimal for dollars | Integer cents | Avoids floating point precision errors |

**Key insight:** The existing codebase already has all the patterns needed. The task is to follow them, not invent new approaches.

## Common Pitfalls

### Pitfall 1: Missing approvalEmail Field in UI

**What goes wrong:** The current configure-governance page from Phase 3 does not have the approvalEmail input field, even though GOV-03 requires it and the UI reference document specifies it.

**Why it happens:** The Phase 3 implementation may have deferred this field to Phase 8, or it was accidentally omitted.

**How to avoid:** Add the approvalEmail input field to the UI as part of this phase. The UI reference shows it should be between lowRoiThreshold and dashboardRefresh.

**Warning signs:** Verification will fail GOV-03 if the field is not present.

### Pitfall 2: Incorrect Default Values on First Load

**What goes wrong:** Form shows empty fields or undefined values when organization has no governance settings yet (null/undefined).

**Why it happens:** GovernanceSettings is optional on Organization, so it may not exist for organizations created before this feature.

**How to avoid:** Define sensible defaults in the frontend when governanceSettings is undefined:
```typescript
const defaults = {
  meetingCostThresholdCents: 50000,  // $500
  lowRoiThreshold: 1.0,
  approvalEmail: "",
  dashboardRefreshMinutes: 30,
  pullToRefreshEnabled: true,
};
```

**Warning signs:** Controlled/uncontrolled component React warnings, NaN in number inputs.

### Pitfall 3: Cents vs Dollars Mismatch

**What goes wrong:** User enters $500, API stores 500, but it's supposed to be cents (50000).

**Why it happens:** UI displays dollars, backend stores cents for precision.

**How to avoid:** Convert at the boundary:
- UI displays/accepts dollars
- Schema accepts dollars and converts to cents for API
- Or API accepts dollars and converts internally

**Warning signs:** Thresholds are 100x too high or too low.

### Pitfall 4: Permission Check Missing

**What goes wrong:** Any member can change governance settings.

**Why it happens:** Forgetting to add role check in the endpoint.

**How to avoid:** Follow existing pattern - only `owner` or `administrator` can modify settings:
```typescript
const role = await organizationMemberRepository.getUserRole(id, userId);
if (!role || !["owner", "administrator"].includes(role)) {
  return { error: "Permission denied" };
}
```

**Warning signs:** Viewers can modify settings during manual testing.

### Pitfall 5: Stale Organization Data After Save

**What goes wrong:** After saving governance settings, other parts of the UI show old organization data.

**Why it happens:** Not invalidating the organization query cache after mutation.

**How to avoid:** Call `queryClient.invalidateQueries({ queryKey: ["organization"] })` in mutation's onSuccess.

**Warning signs:** User has to refresh page to see updated settings.

## Code Examples

### GovernanceSettings Type Definition
```typescript
// packages/shared/src/types/organization.ts
// Source: Based on project patterns and GOV-01 through GOV-06 requirements

export interface GovernanceSettings {
  meetingCostThresholdCents: number;  // Meetings > $X require approval (stored as cents)
  lowRoiThreshold: number;             // Meetings < X ROI flagged (decimal, e.g., 1.0)
  approvalEmail: string;               // Email for approval routing
  dashboardRefreshMinutes: number;     // Auto-refresh interval (15, 30, 60, 120)
  pullToRefreshEnabled: boolean;       // Enable/disable pull-to-refresh
}
```

### Zod Validation Schema
```typescript
// packages/shared/src/schemas/organization.ts
// Source: Following existing schema patterns in project

export const governanceSettingsSchema = z.object({
  meetingCostThresholdCents: z.number().int().min(0).max(10000000),  // 0 to $100,000
  lowRoiThreshold: z.number().min(0).max(100),  // 0 to 100x
  approvalEmail: z.string().email("Invalid email address"),
  dashboardRefreshMinutes: z.number().refine(
    (val) => [15, 30, 60, 120].includes(val),
    "Refresh interval must be 15, 30, 60, or 120 minutes"
  ),
  pullToRefreshEnabled: z.boolean(),
});

export type GovernanceSettingsInput = z.infer<typeof governanceSettingsSchema>;
```

### Repository Update Method
```typescript
// apps/api/src/repositories/organization.repository.ts
// Source: Following existing updateOnboardingStep pattern

async updateGovernance(
  id: string,
  settings: GovernanceSettings
): Promise<Organization | null> {
  const doc = await this.collection.doc(id).get();

  if (!doc.exists) {
    return null;
  }

  await this.collection.doc(id).update({
    governanceSettings: settings,
    updatedAt: new Date().toISOString(),
  });

  return this.findById(id);
}
```

### Form with react-hook-form
```typescript
// apps/web/src/components/pages/onboarding/configure-governance/index.tsx
// Source: Following EnterpriseForm pattern

const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  setValue,
  watch,
} = useForm<GovernanceFormData>({
  resolver: zodResolver(governanceFormSchema),
  defaultValues: {
    meetingCostThreshold: organization?.governanceSettings?.meetingCostThresholdCents
      ? organization.governanceSettings.meetingCostThresholdCents / 100
      : 500,
    lowRoiThreshold: organization?.governanceSettings?.lowRoiThreshold ?? 1.0,
    approvalEmail: organization?.governanceSettings?.approvalEmail ?? "",
    dashboardRefresh: String(organization?.governanceSettings?.dashboardRefreshMinutes ?? 30),
    pullToRefresh: organization?.governanceSettings?.pullToRefreshEnabled ?? true,
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TimeGovernanceSettings (time-focused) | GovernanceSettings (cost-focused) | Phase 8 | Need to update or replace existing interface |
| Local useState | react-hook-form + API | Phase 8 | Settings now persist across sessions |

**Note on existing TimeGovernanceSettings:**
The current `TimeGovernanceSettings` interface in organization.ts has these fields:
- meetingTimeThreshold (hours per day)
- focusTimeMinimum (hours per day)
- afterHoursLimit (hours per week)
- meetingFreeCap (days per week)
- alertsEnabled (boolean)

These are NOT the same as the governance requirements (GOV-01 through GOV-06). Options:
1. **Recommended:** Add new `GovernanceSettings` interface for cost governance, keep `TimeGovernanceSettings` for future use
2. Replace `TimeGovernanceSettings` entirely (may break future v2 features)

## Open Questions

1. **What happens to existing TimeGovernanceSettings?**
   - What we know: The interface exists in types/organization.ts but appears unused
   - What's unclear: Whether this was for v2 features or was a draft that was superseded
   - Recommendation: Add new `GovernanceSettings` interface alongside it. Don't delete TimeGovernanceSettings in case it's planned for v2.

2. **Should approvalEmail allow empty value?**
   - What we know: GOV-03 says "set approval email" but doesn't specify if required
   - What's unclear: Whether high-cost meetings can proceed without an approval email
   - Recommendation: Make it optional (allow empty string) for MVP, but show warning in UI if empty

## Sources

### Primary (HIGH confidence)
- Organization types: `/Users/ardiansyahiqbal/dev-app/myx/klayim/packages/shared/src/types/organization.ts`
- Organization schemas: `/Users/ardiansyahiqbal/dev-app/myx/klayim/packages/shared/src/schemas/organization.ts`
- Organization routes: `/Users/ardiansyahiqbal/dev-app/myx/klayim/apps/api/src/routes/organization.route.ts`
- Organization service: `/Users/ardiansyahiqbal/dev-app/myx/klayim/apps/api/src/services/organization.service.ts`
- Organization repository: `/Users/ardiansyahiqbal/dev-app/myx/klayim/apps/api/src/repositories/organization.repository.ts`
- Configure governance UI: `/Users/ardiansyahiqbal/dev-app/myx/klayim/apps/web/src/components/pages/onboarding/configure-governance/index.tsx`
- React Query hooks: `/Users/ardiansyahiqbal/dev-app/myx/klayim/apps/web/src/hooks/use-organization.ts`
- Form component example: `/Users/ardiansyahiqbal/dev-app/myx/klayim/apps/web/src/components/pages/onboarding/plan-selection/enterprise-form.tsx`

### Secondary (MEDIUM confidence)
- UI Reference: `/Users/ardiansyahiqbal/dev-app/myx/klayim/.planning/phases/03-organization-onboarding-ui/UI-REFERENCE.md`
- Requirements: `/Users/ardiansyahiqbal/dev-app/myx/klayim/.planning/REQUIREMENTS.md`
- Stack documentation: `/Users/ardiansyahiqbal/dev-app/myx/klayim/.planning/codebase/STACK.md`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use with clear examples
- Architecture: HIGH - Following established patterns exactly
- Pitfalls: HIGH - Based on direct code analysis and requirement comparison

**Research date:** 2026-02-27
**Valid until:** N/A - This is feature implementation following established patterns
