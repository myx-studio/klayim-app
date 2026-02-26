/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/ui/stepper.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-26
 ** github: @aiqbalsyah
 */

"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronRight, Loader } from "lucide-react";

import { cn } from "@/lib/utils";

// Step state type
export type StepState = "completed" | "active" | "pending";

// Step type definition
export interface Step {
  id: string;
  label: string;
}

// Stepper Props
export interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  className?: string;
  stepStates?: StepState[]; // Optional override for individual step states
}

// CVA variants for step icon container
const stepIconVariants = cva(
  "flex items-center justify-center rounded-full transition-colors shrink-0",
  {
    variants: {
      state: {
        completed: "bg-emerald-100 text-emerald-600",
        active: "bg-primary/10 text-primary",
        pending: "bg-muted text-muted-foreground",
      },
      size: {
        default: "h-8 w-8",
        sm: "h-6 w-6",
      },
    },
    defaultVariants: {
      state: "pending",
      size: "default",
    },
  }
);

// CVA variants for step label
const stepLabelVariants = cva("text-sm font-medium whitespace-nowrap", {
  variants: {
    state: {
      completed: "text-foreground",
      active: "text-foreground font-semibold",
      pending: "text-muted-foreground",
    },
  },
  defaultVariants: {
    state: "pending",
  },
});

function getStepState(stepIndex: number, currentStep: number): StepState {
  if (stepIndex < currentStep) return "completed";
  if (stepIndex === currentStep) return "active";
  return "pending";
}

// Single step component
interface StepItemProps extends VariantProps<typeof stepIconVariants> {
  step: Step;
  stepIndex: number;
  currentStep: number;
  showConnector: boolean;
  stateOverride?: StepState;
}

function StepItem({
  step,
  stepIndex,
  currentStep,
  showConnector,
  size,
  stateOverride,
}: StepItemProps) {
  const state = stateOverride ?? getStepState(stepIndex, currentStep);

  return (
    <div className="flex items-center">
      <div
        aria-current={state === "active" ? "step" : undefined}
        className="flex items-center gap-2"
      >
        <div className={cn(stepIconVariants({ state, size }))}>
          {state === "completed" ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Loader className="h-4 w-4" />
          )}
        </div>
        <span className={cn(stepLabelVariants({ state }))}>{step.label}</span>
      </div>

      {showConnector && (
        <ChevronRight className="text-muted-foreground mx-3 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}

// Mobile stepper view
interface MobileStepperProps {
  steps: Step[];
  currentStep: number;
}

function MobileStepper({ steps, currentStep }: MobileStepperProps) {
  const currentLabel = steps[currentStep]?.label || "";
  const total = steps.length;
  const current = Math.min(currentStep + 1, total);

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <span className="text-foreground text-sm font-medium">
        Step {current} of {total}
      </span>
      <span className="text-muted-foreground ml-2 max-w-50 truncate text-sm">{currentLabel}</span>
    </div>
  );
}

// Main Stepper component
function Stepper({ steps, currentStep, className, stepStates }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      {/* Desktop view - hidden on mobile */}
      <div className="hidden items-center justify-center md:flex">
        {steps.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            stepIndex={index}
            currentStep={currentStep}
            showConnector={index < steps.length - 1}
            stateOverride={stepStates?.[index]}
          />
        ))}
      </div>

      {/* Mobile view - visible only on mobile */}
      <div className="md:hidden">
        <MobileStepper steps={steps} currentStep={currentStep} />
        {/* Progress bar for mobile */}
        <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </nav>
  );
}

export { stepIconVariants, stepLabelVariants, Stepper };
