// Types take precedence - they are the canonical definitions
export * from "./types/index.js";

// Re-export only schemas (not the inferred types which duplicate types/)
export {
  // Common schemas
  paginationSchema,
  // User schemas
  createUserSchema,
  updateUserSchema,
  // Auth schemas
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  // Organization schemas
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  completeOnboardingStepSchema,
  slugSchema,
  planTypeSchema,
  // Subscription schemas
  subscriptionCheckoutSchema,
  planChangeSchema,
} from "./schemas/index.js";

// Config
export * from "./config/index.js";
