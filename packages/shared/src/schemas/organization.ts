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

export const onboardingStepSchema = z.enum([
  "profile",
  "invite",
  "plan",
  "payment",
  "complete",
]);

export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase, alphanumeric, and can contain hyphens"
  );

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
  currentStep: onboardingStepSchema.optional(),
  completedStep: onboardingStepSchema.optional(),
  skippedStep: onboardingStepSchema.optional(),
});

export const completeOnboardingStepSchema = z.object({
  step: onboardingStepSchema,
  skip: z.boolean().optional().default(false),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>;
export type CompleteOnboardingStepInput = z.infer<typeof completeOnboardingStepSchema>;
