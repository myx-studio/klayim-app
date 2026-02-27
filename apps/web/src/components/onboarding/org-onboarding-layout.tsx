/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/onboarding/org-onboarding-layout.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-27
 ** github: @aiqbalsyah
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { SubStepper } from "@/components/ui/sub-stepper";
import { ORG_ONBOARDING_STEPS } from "@/lib/org-onboarding";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

export interface OrgOnboardingLayoutProps {
  /** Page content */
  children: React.ReactNode;
  /** Page title (e.g., "Connect HRIS") */
  title: string;
  /** Page description */
  description: string;
  /** Current step index (0, 1, or 2) */
  currentStep: number;
  /** Optional back button handler - if provided, shows back button */
  onBack?: () => void;
  /** Skip button handler */
  onSkip: () => void;
  /** Next/Complete button handler */
  onNext: () => void;
  /** Label for next button (default: "Next") */
  nextLabel?: React.ReactNode;
  /** Show skip button (default: true) */
  showSkip?: boolean;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * OrgOnboardingLayout provides consistent structure for all organization onboarding pages.
 * Includes sub-stepper, back navigation, title/description, content slot, and action buttons.
 */
function OrgOnboardingLayout({
  children,
  title,
  description,
  currentStep,
  onBack,
  onSkip,
  onNext,
  nextLabel = "Next",
  showSkip = true,
  className,
}: OrgOnboardingLayoutProps) {
  // Map steps for SubStepper (only need id and label)
  const subSteps = ORG_ONBOARDING_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
  }));

  return (
    <div className={cn("relative mx-auto w-full max-w-2xl", className)} data-slot="org-onboarding-layout">
      {/* Back button (top-left, outside card) */}
      {onBack && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute -top-12 left-0"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Sub-stepper (above card) */}
      <div className="mb-6">
        <SubStepper steps={subSteps} currentStep={currentStep} />
      </div>

      {/* Main card */}
      <Card className="w-full border px-2">
        <CardHeader className="flex flex-col items-center gap-4 text-center">
          {/* Klayim logo */}
          <Link href="/" className="flex flex-col items-center justify-center gap-2">
            <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
          </Link>

          {/* Title and description */}
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </CardHeader>

        {/* Page-specific content */}
        <CardContent className="flex flex-col gap-6">{children}</CardContent>

        {/* Action buttons */}
        <CardFooter className="flex gap-3 pt-4">
          {showSkip && (
            <Button variant="outline" onClick={onSkip} className="h-11 flex-1">
              Skip for Now
            </Button>
          )}
          <Button onClick={onNext} className={cn("h-11", showSkip ? "flex-1" : "w-full")}>
            {nextLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export { OrgOnboardingLayout };
