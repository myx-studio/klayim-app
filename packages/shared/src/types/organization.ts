import type { Timestamps } from "./common.js";

export type OrganizationMemberRole = "owner" | "administrator" | "editor" | "viewer";

export type PlanType = "free" | "starter" | "professional" | "enterprise";

export type PlanStatus = "active" | "expired" | "cancelled";

export type OnboardingStep =
  | "profile"      // Set org name, logo, description
  | "invite"       // Invite team members
  | "plan"         // Select subscription plan
  | "payment"      // Complete payment (if paid plan)
  | "complete";    // Onboarding finished

export interface OnboardingStatus {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];
  startedAt: string;
  completedAt?: string;
}

export interface Plan {
  id: string;
  type: PlanType;
  name: string;
  price: number;
  currency: string;
  features: string[];
  maxMembers: number;
  maxStorage: number; // in GB
}

export interface ActivePlan {
  planId: string;
  planType: PlanType;
  status: PlanStatus;
  startDate: string;
  endDate?: string;
  stripeSubscriptionId?: string;
}

export interface Organization extends Timestamps {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
  stripeCustomerId?: string;
  activePlan?: ActivePlan;
  memberCount: number;
  onboarding?: OnboardingStatus;
}

export interface OrganizationMember extends Timestamps {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  invitedBy?: string;
  invitedAt?: string;
  joinedAt?: string;
}

export interface OrganizationInvitation extends Timestamps {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationMemberRole;
  invitedBy: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
}

// Input types
export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  logo?: string;
  description?: string;
  website?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
}

export interface InviteMemberInput {
  email: string;
  role: OrganizationMemberRole;
}

export interface UpdateMemberRoleInput {
  role: OrganizationMemberRole;
}

export interface UpdateOnboardingInput {
  currentStep?: OnboardingStep;
  completedStep?: OnboardingStep;
  skippedStep?: OnboardingStep;
}

// Response types
export interface OrganizationWithRole extends Organization {
  currentUserRole: OrganizationMemberRole;
}

export interface MemberWithUser {
  id: string;
  role: OrganizationMemberRole;
  joinedAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

// Onboarding helpers
export function isOnboardingComplete(org: Organization): boolean {
  return org.onboarding?.currentStep === "complete";
}

export function getNextOnboardingStep(org: Organization): OnboardingStep | null {
  if (!org.onboarding || org.onboarding.currentStep === "complete") {
    return null;
  }

  const steps: OnboardingStep[] = ["profile", "invite", "plan", "payment", "complete"];
  const currentIndex = steps.indexOf(org.onboarding.currentStep);

  if (currentIndex < steps.length - 1) {
    return steps[currentIndex + 1];
  }

  return null;
}
