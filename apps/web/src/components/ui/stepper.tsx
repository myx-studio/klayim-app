/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/ui/stepper.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-26
 ** github: @aiqbalsyah
 */

"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// Step state type (moved before StepperProps for reference)
export type StepState = "completed" | "active" | "pending";

// Step type definition
export interface Step {
  id: string;
  label: string;
  href?: string;
}

// Stepper Props
export interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  onStepClick?: (stepIndex: number) => void;
  className?: string;
  stepStates?: StepState[]; // Optional override for individual step states
}

// CVA variants for step circle states
const stepCircleVariants = cva(
  "flex items-center justify-center rounded-full transition-colors font-medium",
  {
    variants: {
      state: {
        completed:
          "bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90",
        active: "border-2 border-primary bg-background text-primary",
        pending: "bg-muted text-muted-foreground cursor-not-allowed",
      },
      size: {
        default: "h-10 w-10 text-sm",
        sm: "h-8 w-8 text-xs",
      },
    },
    defaultVariants: {
      state: "pending",
      size: "default",
    },
  }
);

// CVA variants for connector line
const connectorVariants = cva("h-0.5 flex-1 transition-colors", {
  variants: {
    state: {
      completed: "bg-primary",
      pending: "bg-muted",
    },
  },
  defaultVariants: {
    state: "pending",
  },
});

// CVA variants for step label
const stepLabelVariants = cva(
  "mt-2 text-xs font-medium text-center max-w-[80px] line-clamp-2",
  {
    variants: {
      state: {
        completed: "text-primary",
        active: "text-primary font-semibold",
        pending: "text-muted-foreground",
      },
    },
    defaultVariants: {
      state: "pending",
    },
  }
);

function getStepState(stepIndex: number, currentStep: number): StepState {
  if (stepIndex < currentStep) return "completed";
  if (stepIndex === currentStep) return "active";
  return "pending";
}

// Single step component
interface StepItemProps extends VariantProps<typeof stepCircleVariants> {
  step: Step;
  stepIndex: number;
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  showConnector: boolean;
  stateOverride?: StepState; // Optional state override
}

function StepItem({
  step,
  stepIndex,
  currentStep,
  onStepClick,
  showConnector,
  size,
  stateOverride,
}: StepItemProps) {
  // Use override if provided, otherwise compute from currentStep
  const state = stateOverride ?? getStepState(stepIndex, currentStep);
  const isClickable = state === "completed" && onStepClick;

  const handleClick = () => {
    if (isClickable) {
      onStepClick(stepIndex);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onStepClick(stepIndex);
    }
  };

  return (
    <div className="flex items-center flex-1 last:flex-initial">
      <div className="flex flex-col items-center">
        <div
          role={isClickable ? "button" : undefined}
          tabIndex={isClickable ? 0 : undefined}
          aria-current={state === "active" ? "step" : undefined}
          aria-label={`${step.label}${state === "completed" ? " (completed)" : state === "active" ? " (current)" : " (pending)"}`}
          className={cn(stepCircleVariants({ state, size }))}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          {state === "completed" ? (
            <Check className="h-5 w-5" aria-hidden="true" />
          ) : (
            <span>{stepIndex + 1}</span>
          )}
        </div>
        <span className={cn(stepLabelVariants({ state }))}>{step.label}</span>
      </div>
      {showConnector && (
        <div
          className={cn(
            connectorVariants({
              // Use state-based connector: completed if this step is completed
              state: state === "completed" ? "completed" : "pending",
            }),
            "mx-2 mb-6"
          )}
          aria-hidden="true"
        />
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
    <div className="flex items-center justify-between py-2 px-1">
      <span className="text-sm font-medium text-foreground">
        Step {current} of {total}
      </span>
      <span className="text-sm text-muted-foreground truncate ml-2 max-w-[200px]">
        {currentLabel}
      </span>
    </div>
  );
}

// Main Stepper component
function Stepper({ steps, currentStep, onStepClick, className, stepStates }: StepperProps) {
  return (
    <nav
      aria-label="Progress"
      className={cn("w-full", className)}
    >
      {/* Desktop view - hidden on mobile */}
      <ol className="hidden md:flex items-start justify-between">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "flex items-center",
              index < steps.length - 1 ? "flex-1" : ""
            )}
          >
            <StepItem
              step={step}
              stepIndex={index}
              currentStep={currentStep}
              onStepClick={onStepClick}
              showConnector={index < steps.length - 1}
              stateOverride={stepStates?.[index]}
            />
          </li>
        ))}
      </ol>

      {/* Mobile view - visible only on mobile */}
      <div className="md:hidden">
        <MobileStepper steps={steps} currentStep={currentStep} />
        {/* Progress bar for mobile */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </nav>
  );
}

export { Stepper, stepCircleVariants, connectorVariants, stepLabelVariants };
