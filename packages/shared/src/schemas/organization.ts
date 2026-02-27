import { z } from "zod";

export const organizationMemberRoleSchema = z.enum([
  "owner",
  "administrator",
  "editor",
  "viewer",
]);

export const planTypeSchema = z.enum([
  "free",
  "starter",
  "professional",
  "enterprise",
]);

export const organizationOnboardingStepSchema = z.enum([
  "profile",
  "plan",
  "import_employees",
  "connect_calendar",
  "connect_tasks",
  "time_governance",
  "complete",
]);

// Legacy alias for backwards compatibility
export const onboardingStepSchema = organizationOnboardingStepSchema;

export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase, alphanumeric, and can contain hyphens"
  );

// Organization name validation schema (for onboarding)
// 2-50 chars, alphanumeric + spaces + hyphens, requires at least one letter/number
export const organizationNameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be at most 50 characters")
  .regex(
    /^[a-zA-Z0-9\s-]+$/,
    "Only letters, numbers, spaces, and hyphens allowed"
  )
  .refine(
    (val) => /[a-zA-Z0-9]/.test(val),
    "Name must contain at least one letter or number"
  )
  .transform((val) => val.trim());

// Schema for creating organization during onboarding (name only, slug auto-generated)
export const onboardingCreateOrganizationSchema = z.object({
  name: organizationNameSchema,
});

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  slug: slugSchema.optional(),
  logo: z.string().url("Invalid logo URL").optional(),
  description: z.string().max(500, "Description must be at most 500 characters").optional(),
  website: z.string().url("Invalid website URL").optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: slugSchema.optional(),
  logo: z.string().url().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  website: z.string().url().optional().nullable(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: organizationMemberRoleSchema,
});

export const updateMemberRoleSchema = z.object({
  role: organizationMemberRoleSchema,
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const updateOnboardingSchema = z.object({
  currentStep: organizationOnboardingStepSchema.optional(),
  completedStep: organizationOnboardingStepSchema.optional(),
  skippedStep: organizationOnboardingStepSchema.optional(),
});

export const completeOnboardingStepSchema = z.object({
  step: organizationOnboardingStepSchema,
  skip: z.boolean().optional().default(false),
});

// Governance settings schema for cost tracking and alerts
export const governanceSettingsSchema = z.object({
  meetingCostThresholdCents: z.number().int().min(0).max(10000000), // 0 to $100,000
  lowRoiThreshold: z.number().min(0).max(100),                       // 0 to 100x
  dashboardRefreshMinutes: z.number().refine(
    (val) => [15, 30, 60, 120].includes(val),
    { message: "Dashboard refresh must be 15, 30, 60, or 120 minutes" }
  ),
  pullToRefreshEnabled: z.boolean(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type OnboardingCreateOrganizationInput = z.infer<typeof onboardingCreateOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type GovernanceSettingsInput = z.infer<typeof governanceSettingsSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>;
export type CompleteOnboardingStepInput = z.infer<typeof completeOnboardingStepSchema>;
