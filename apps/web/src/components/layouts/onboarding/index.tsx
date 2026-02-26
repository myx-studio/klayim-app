"use client";

import { Spinner } from "@/components/ui/spinner";
import { Stepper } from "@/components/ui/stepper";
import { ONBOARDING_STEPS, getCurrentStepIndex, getStepState } from "@/lib/onboarding";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Extended user type for onboarding session data
interface OnboardingUser {
  onboardingCompleted?: boolean;
  defaultOrganizationId?: string;
}

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const currentIndex = getCurrentStepIndex(pathname);

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

  const steps = ONBOARDING_STEPS.map((step, index) => ({
    ...step,
    state: getStepState(index, currentIndex, userOnboardingCompleted, hasOrganization),
  }));

  // Show loading while checking auth
  if (status === "loading") {
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

  // Don't render if not authenticated
  if (!session) {
    return null;
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
        <div className="mx-auto max-w-3xl">
          <Stepper
            steps={steps.map((s) => ({ id: s.id, label: s.label }))}
            currentStep={currentIndex}
            stepStates={steps.map((s) => s.state)}
          />
        </div>
      </div>

      {/* Content - centered */}
      <div className="flex min-h-screen flex-col items-center justify-start p-4 py-30">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
