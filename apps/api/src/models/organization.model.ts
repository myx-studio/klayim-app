import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OnboardingStatus,
  OnboardingStep,
} from "@klayim/shared/types";

export class OrganizationEntity implements Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
  stripeCustomerId?: string;
  activePlan?: Organization["activePlan"];
  memberCount: number;
  onboarding?: OnboardingStatus;
  createdAt: string;
  updatedAt?: string;

  constructor(data: Organization) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.logo = data.logo;
    this.description = data.description;
    this.website = data.website;
    this.stripeCustomerId = data.stripeCustomerId;
    this.activePlan = data.activePlan;
    this.memberCount = data.memberCount;
    this.onboarding = data.onboarding;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static create(id: string, input: CreateOrganizationInput): OrganizationEntity {
    const now = new Date().toISOString();
    return new OrganizationEntity({
      id,
      name: input.name,
      slug: input.slug || generateSlug(input.name),
      logo: input.logo,
      description: input.description,
      website: input.website,
      memberCount: 1, // Owner is first member
      onboarding: {
        currentStep: "profile",
        completedSteps: [],
        skippedSteps: [],
        startedAt: now,
      },
      createdAt: now,
    });
  }

  update(input: UpdateOrganizationInput): OrganizationEntity {
    return new OrganizationEntity({
      ...this.toJSON(),
      ...input,
      updatedAt: new Date().toISOString(),
    });
  }

  completeOnboardingStep(step: OnboardingStep, skip = false): OrganizationEntity {
    if (!this.onboarding) {
      return this;
    }

    const steps: OnboardingStep[] = ["profile", "invite", "plan", "payment", "complete"];
    const currentIndex = steps.indexOf(this.onboarding.currentStep);
    const stepIndex = steps.indexOf(step);

    // Can only complete current step
    if (stepIndex !== currentIndex) {
      return this;
    }

    const completedSteps = skip
      ? this.onboarding.completedSteps
      : [...this.onboarding.completedSteps, step];

    const skippedSteps = skip
      ? [...this.onboarding.skippedSteps, step]
      : this.onboarding.skippedSteps;

    const nextStep = steps[currentIndex + 1] || "complete";
    const isComplete = nextStep === "complete";

    return new OrganizationEntity({
      ...this.toJSON(),
      onboarding: {
        ...this.onboarding,
        currentStep: nextStep,
        completedSteps,
        skippedSteps,
        completedAt: isComplete ? new Date().toISOString() : undefined,
      },
      updatedAt: new Date().toISOString(),
    });
  }

  incrementMemberCount(): OrganizationEntity {
    return new OrganizationEntity({
      ...this.toJSON(),
      memberCount: this.memberCount + 1,
      updatedAt: new Date().toISOString(),
    });
  }

  decrementMemberCount(): OrganizationEntity {
    return new OrganizationEntity({
      ...this.toJSON(),
      memberCount: Math.max(1, this.memberCount - 1),
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): Organization {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      logo: this.logo,
      description: this.description,
      website: this.website,
      stripeCustomerId: this.stripeCustomerId,
      activePlan: this.activePlan,
      memberCount: this.memberCount,
      onboarding: this.onboarding,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}
