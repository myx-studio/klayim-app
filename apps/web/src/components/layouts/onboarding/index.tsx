"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Stepper } from "@/components/ui/stepper";
import {
  ONBOARDING_STEPS,
  getCurrentStepIndex,
  getStepState,
} from "@/lib/onboarding";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

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
  const { data: session } = useSession();
  const currentIndex = getCurrentStepIndex(pathname);
  const prevIndex = useRef(currentIndex);
  const [direction, setDirection] = useState(0);

  // Track direction for slide animation
  useEffect(() => {
    setDirection(currentIndex > prevIndex.current ? 1 : -1);
    prevIndex.current = currentIndex;
  }, [currentIndex]);

  // Derive step states from user data (cast to access extended properties)
  const user = session?.user as OnboardingUser | undefined;
  const userOnboardingCompleted = user?.onboardingCompleted ?? false;
  const hasOrganization = !!user?.defaultOrganizationId;

  const steps = ONBOARDING_STEPS.map((step, index) => ({
    ...step,
    state: getStepState(
      index,
      currentIndex,
      userOnboardingCompleted,
      hasOrganization
    ),
  }));

  const handleStepClick = (stepIndex: number) => {
    const step = steps[stepIndex];
    // Only allow clicking completed steps (per user decision)
    if (step.state === "completed" && step.href) {
      router.push(step.href);
    }
  };

  // Page transition variants (per user decision - slide left/right)
  const pageVariants: Variants = {
    initial: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { type: "tween", duration: 0.3, ease: "easeInOut" },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
      transition: { type: "tween", duration: 0.3, ease: "easeInOut" },
    }),
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "url('/images/bg-particle.png') repeat",
      }}
    >
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        {/* Stepper - shown above the card */}
        <div className="mb-8 w-full max-w-md">
          <Stepper
            steps={steps.map((s) => ({ id: s.id, label: s.label, href: s.href }))}
            currentStep={currentIndex}
            onStepClick={handleStepClick}
            stepStates={steps.map((s) => s.state)}
          />
        </div>

        {/* Content with slide animation */}
        <div className="relative w-full max-w-md overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={pathname}
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
