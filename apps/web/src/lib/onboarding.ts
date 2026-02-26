// Onboarding step definitions
export const ONBOARDING_STEPS = [
  { id: "create-account", label: "Create Account", href: "/auth/signup" },
  { id: "account-details", label: "Account Details", href: "/onboarding/account-details" },
  { id: "setup-organization", label: "Setup Organization", href: "/onboarding/setup-organization" },
  { id: "onboarding", label: "Onboarding", href: "/dashboard" }, // Points to org onboarding in Phase 3
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

// Get current step index from pathname
export function getCurrentStepIndex(pathname: string): number {
  const stepIndex = ONBOARDING_STEPS.findIndex(
    (step) => pathname === step.href || pathname.startsWith(step.href + "/")
  );
  return stepIndex >= 0 ? stepIndex : 0;
}

// Determine step state
export function getStepState(
  stepIndex: number,
  currentIndex: number,
  userOnboardingCompleted: boolean,
  hasOrganization: boolean
): "completed" | "active" | "pending" {
  // Step 0 (Create Account) is always completed if user is here
  if (stepIndex === 0) return "completed";

  // Step 1 (Account Details) - completed if onboardingCompleted is true
  if (stepIndex === 1) {
    if (userOnboardingCompleted) return "completed";
    if (currentIndex === 1) return "active";
    return "pending";
  }

  // Step 2 (Setup Organization) - completed if has organization
  if (stepIndex === 2) {
    if (hasOrganization) return "completed";
    if (currentIndex === 2) return "active";
    return "pending";
  }

  // Step 3 (Onboarding) - active after org creation
  if (stepIndex === 3) {
    if (currentIndex === 3) return "active";
    return "pending";
  }

  return "pending";
}
