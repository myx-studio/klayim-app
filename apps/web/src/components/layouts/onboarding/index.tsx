"use client";

import { Button } from "@/components/ui/button";
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
import { ArrowLeft } from "lucide-react";
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

  // Get back navigation path for org onboarding pages
  const getBackPath = (): string | null => {
    if (!isOrgOnboarding) return null;

    switch (pathname) {
      case "/onboarding/connect-hris":
        return "/onboarding/overview";
      case "/onboarding/connect-calendar":
        return "/onboarding/connect-hris";
      case "/onboarding/connect-task":
        return "/onboarding/connect-calendar";
      case "/onboarding/configure-governance":
        return "/onboarding/connect-task";
      default:
        return null;
    }
  };

  const backPath = getBackPath();

  const handleBack = () => {
    if (backPath) {
      router.push(backPath);
    }
  };

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
        <div className="mx-auto flex w-full max-w-4xl items-center gap-4">
          {/* Back button - only show on org onboarding pages */}
          {backPath ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              aria-label="Go back"
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" /> // Placeholder for alignment
          )}

          {/* Stepper */}
          <div className="flex-1">
            <Stepper
              steps={steps.map((s) => ({ id: s.id, label: s.label }))}
              currentStep={currentIndex}
              stepStates={steps.map((s) => s.state)}
            />
          </div>

          {/* Placeholder for right side alignment */}
          <div className="w-10 shrink-0" />
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
