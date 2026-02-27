import type { Timestamps } from "./common.js";

export type OrganizationMemberRole = "owner" | "administrator" | "editor" | "viewer";

export type PlanType = "free" | "starter" | "professional" | "enterprise";

export type PlanStatus = "active" | "expired" | "cancelled";

// Subscription status for Stripe webhooks
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "expired";

// Organization onboarding steps
export type OrganizationOnboardingStep =
  | "profile"               // Set org name, logo, description
  | "plan"                  // Select subscription plan & payment
  | "import_employees"      // Import employee data
  | "connect_calendar"      // Connect calendar (Google, Outlook, etc.)
  | "connect_tasks"         // Connect task management (Jira, Asana, etc.)
  | "time_governance"       // Set threshold for time governance
  | "complete";             // Onboarding finished

// Legacy alias for backwards compatibility
export type OnboardingStep = OrganizationOnboardingStep;

export interface OrganizationOnboardingStatus {
  currentStep: OrganizationOnboardingStep;
  completedSteps: OrganizationOnboardingStep[];
  skippedSteps: OrganizationOnboardingStep[];
  startedAt: string;
  completedAt?: string;
}

// Legacy alias for backwards compatibility
export type OnboardingStatus = OrganizationOnboardingStatus;

// Time governance settings
export interface TimeGovernanceSettings {
  meetingTimeThreshold: number;      // Max hours per day for meetings
  focusTimeMinimum: number;          // Min hours per day for focus time
  afterHoursLimit: number;           // Max hours per week for after-hours work
  meetingFreeCap: number;            // Min meeting-free days per week
  alertsEnabled: boolean;
}

// Governance settings for cost tracking and alerts
export interface GovernanceSettings {
  meetingCostThresholdCents: number;   // Cost threshold in cents (e.g., 50000 = $500)
  lowRoiThreshold: number;              // ROI threshold (e.g., 1.0 = 1x)
  dashboardRefreshMinutes: number;      // Dashboard refresh interval (15, 30, 60, or 120)
  pullToRefreshEnabled: boolean;        // Enable pull-to-refresh on mobile
}

// Calendar integration (UI placeholders - actual integrations use types/calendar.ts)
export type UICalendarProvider = "google" | "outlook" | "apple";

export interface CalendarConnection {
  id: string;
  provider: UICalendarProvider;
  email: string;
  connected: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
}

// Task management integration (UI placeholders - actual integrations use types/task.ts)
export type UITaskProvider = "jira" | "asana" | "monday" | "trello" | "clickup" | "linear";

export interface TaskConnection {
  id: string;
  provider: UITaskProvider;
  workspaceId?: string;
  workspaceName?: string;
  connected: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
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
  status: PlanStatus | SubscriptionStatus; // Allow both for flexibility
  startDate: string;
  endDate?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart?: string; // ISO date
  currentPeriodEnd?: string;   // ISO date
  cancelAtPeriodEnd?: boolean;
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
  onboarding?: OrganizationOnboardingStatus;
  // Integrations
  calendarConnections?: CalendarConnection[];
  taskConnections?: TaskConnection[];
  // Settings
  timeGovernance?: TimeGovernanceSettings;
  governanceSettings?: GovernanceSettings;
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
  stripeCustomerId?: string;
  activePlan?: ActivePlan;
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

export function getNextOnboardingStep(org: Organization): OrganizationOnboardingStep | null {
  if (!org.onboarding || org.onboarding.currentStep === "complete") {
    return null;
  }

  const steps: OrganizationOnboardingStep[] = [
    "profile",
    "plan",
    "import_employees",
    "connect_calendar",
    "connect_tasks",
    "time_governance",
    "complete",
  ];
  const currentIndex = steps.indexOf(org.onboarding.currentStep);

  if (currentIndex < steps.length - 1) {
    return steps[currentIndex + 1];
  }

  return null;
}
