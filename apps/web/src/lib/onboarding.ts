// Main onboarding step definitions (account setup flow)
export const ONBOARDING_STEPS = [
  { id: "create-account", label: "Create Account", href: "/auth/signup" },
  { id: "account-details", label: "Account Details", href: "/onboarding/account-details" },
  { id: "setup-organization", label: "Setup Organization", href: "/onboarding/setup-organization" },
  { id: "onboarding", label: "Onboarding", href: "/onboarding/overview" },
] as const;

// Organization onboarding step definitions (integration setup flow)
export const ORG_ONBOARDING_STEPS = [
  { id: "connect-hris", label: "Connect HRIS", href: "/onboarding/connect-hris" },
  { id: "connect-calendar", label: "Connect Calendar", href: "/onboarding/connect-calendar" },
  { id: "connect-task", label: "Connect Task", href: "/onboarding/connect-task" },
  { id: "configure-governance", label: "Configure Governance", href: "/onboarding/configure-governance" },
] as const;

// CSV Upload step definitions (sub-flow of Connect HRIS)
export const CSV_UPLOAD_STEPS = [
  { id: "upload", label: "Upload", href: "/onboarding/upload-csv" },
  { id: "validate", label: "Validate", href: "/onboarding/upload-csv/validate" },
  { id: "confirm", label: "Confirm", href: "/onboarding/upload-csv/confirm" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];
export type OrgOnboardingStepId = (typeof ORG_ONBOARDING_STEPS)[number]["id"];
export type CsvUploadStepId = (typeof CSV_UPLOAD_STEPS)[number]["id"];

// Check if pathname is in org onboarding flow
export function isOrgOnboardingPage(pathname: string): boolean {
  return (
    pathname === "/onboarding/connect-hris" ||
    pathname === "/onboarding/connect-calendar" ||
    pathname === "/onboarding/connect-task" ||
    pathname === "/onboarding/configure-governance"
  );
}

// Check if pathname is in CSV upload flow
export function isCsvUploadPage(pathname: string): boolean {
  return pathname.startsWith("/onboarding/upload-csv");
}

// Get CSV upload step index from pathname
export function getCsvUploadStepIndex(pathname: string): number {
  if (pathname === "/onboarding/upload-csv") return 0;
  if (pathname === "/onboarding/upload-csv/validate") return 1;
  if (pathname === "/onboarding/upload-csv/confirm") return 2;
  return 0;
}

// Get org onboarding step index from pathname
export function getOrgStepIndex(pathname: string): number {
  if (pathname === "/onboarding/connect-hris") return 0;
  if (pathname === "/onboarding/connect-calendar") return 1;
  if (pathname === "/onboarding/connect-task") return 2;
  if (pathname === "/onboarding/configure-governance") return 3;
  return 0;
}

// Get current step index from pathname
export function getCurrentStepIndex(pathname: string): number {
  // Plan selection and payment pages are part of Setup Organization step
  if (
    pathname === "/onboarding/plan-selection" ||
    pathname === "/onboarding/payment-success"
  ) {
    return 2; // Setup Organization step
  }

  // Connect HRIS, Calendar, Governance pages are part of Onboarding step
  if (
    pathname.startsWith("/onboarding/connect-") ||
    pathname.startsWith("/onboarding/configure-")
  ) {
    return 3; // Onboarding step
  }

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
  hasOrganization: boolean,
  hasPlan?: boolean
): "completed" | "active" | "pending" {
  // Step 0 (Create Account) is always completed if user is here
  if (stepIndex === 0) return "completed";

  // Step 1 (Account Details) - completed if onboardingCompleted is true
  if (stepIndex === 1) {
    if (userOnboardingCompleted) return "completed";
    if (currentIndex === 1) return "active";
    return "pending";
  }

  // Step 2 (Setup Organization) - completed if has organization and plan
  if (stepIndex === 2) {
    if (hasOrganization && hasPlan) return "completed";
    if (currentIndex === 2) return "active";
    return "pending";
  }

  // Step 3 (Onboarding) - active if on this step
  if (stepIndex === 3) {
    if (currentIndex === 3) return "active";
    return "pending";
  }

  return "pending";
}
