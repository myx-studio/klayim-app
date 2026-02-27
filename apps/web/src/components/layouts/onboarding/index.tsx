"use client";

import { Spinner } from "@/components/ui/spinner";
import { Stepper } from "@/components/ui/stepper";
import {
  ONBOARDING_STEPS,
  ORG_ONBOARDING_STEPS,
  getCurrentStepIndex,
  getStepState,
  isOrgOnboardingPage,
  getOrgStepIndex,
} from "@/lib/onboarding";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Extended user type for onboarding session data
interface OnboardingUser {
  onboardingCompleted?: boolean;
  defaultOrganizationId?: string;
  activePlan?: string;
}

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check if we're on org onboarding pages
  const isOrgOnboarding = isOrgOnboardingPage(pathname);
  const currentIndex = isOrgOnboarding ? getOrgStepIndex(pathname) : getCurrentStepIndex(pathname);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [status, router]);

  // Derive step states from user data (cast to access extended properties)
  const user = session?.user as OnboardingUser | undefined;
  const userOnboardingCompleted = user?.onboardingCompleted ?? false;
  const hasOrganization = !!user?.defaultOrganizationId;
  const hasPlan = !!user?.activePlan;

  // Use org onboarding steps when on those pages, otherwise main onboarding steps
  const steps = isOrgOnboarding
    ? ORG_ONBOARDING_STEPS.map((step, index) => ({
        ...step,
        state: index < currentIndex ? "completed" as const : index === currentIndex ? "active" as const : "pending" as const,
      }))
    : ONBOARDING_STEPS.map((step, index) => ({
        ...step,
        state: getStepState(index, currentIndex, userOnboardingCompleted, hasOrganization, hasPlan),
      }));

  // Don't render if not authenticated (but allow loading state to keep children mounted)
  if (status === "unauthenticated") {
    return null;
  }

  // Show loading overlay on initial load only (when no session yet)
  const isInitialLoading = status === "loading" && !session;

  if (isInitialLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background: "url('/images/bg-particle.png') repeat",
        }}
      >
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "url('/images/bg-particle.png') repeat",
      }}
    >
      {/* Stepper - fixed at top */}
      <div className="fixed top-0 z-10 w-full px-4 py-4">
        <div className="mx-auto w-full max-w-4xl">
          <Stepper
            steps={steps.map((s) => ({ id: s.id, label: s.label }))}
            currentStep={currentIndex}
            stepStates={steps.map((s) => s.state)}
          />
        </div>
      </div>

      {/* Content - centered */}
      <div className="flex min-h-screen flex-col items-center justify-start p-4 py-30">
        <div className="w-full max-w-4xl">{children}</div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
