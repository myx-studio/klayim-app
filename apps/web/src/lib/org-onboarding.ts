/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/lib/org-onboarding.ts
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-27
 ** github: @aiqbalsyah
 */

import { type StepState } from "@/components/ui/stepper";

// Organization onboarding step definitions (3 steps)
export const ORG_ONBOARDING_STEPS = [
  { id: "connect-hris", label: "Connect HRIS", href: "/onboarding/connect-hris" },
  {
    id: "connect-calendars-task",
    label: "Connect Calendars & Task",
    href: "/onboarding/connect-calendar",
  },
  {
    id: "configure-governance",
    label: "Configure Governance",
    href: "/onboarding/configure-governance",
  },
] as const;

export type OrgOnboardingStepId = (typeof ORG_ONBOARDING_STEPS)[number]["id"];

/**
 * Get organization onboarding step index from pathname
 * Returns step index (0, 1, or 2) based on current path
 */
export function getOrgStepIndex(pathname: string): number {
  // Step 0: Connect HRIS (includes CSV upload alternative)
  if (pathname === "/onboarding/connect-hris" || pathname === "/onboarding/upload-csv") {
    return 0;
  }

  // Step 1: Connect Calendars & Task (both calendar and task pages)
  if (pathname === "/onboarding/connect-calendar" || pathname === "/onboarding/connect-task") {
    return 1;
  }

  // Step 2: Configure Governance
  if (pathname === "/onboarding/configure-governance") {
    return 2;
  }

  // Default to first step
  return 0;
}

/**
 * Get step state based on current position
 * Returns "completed" | "active" | "pending"
 */
export function getOrgStepState(stepIndex: number, currentIndex: number): StepState {
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}
