/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/ui/sub-stepper.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-27
 ** github: @aiqbalsyah
 */

"use client";

import { cva } from "class-variance-authority";
import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

// Step state type (reuse from stepper)
export type SubStepState = "completed" | "active" | "pending";

// SubStep type definition
export interface SubStep {
  id: string;
  label: string;
}

// SubStepper Props
export interface SubStepperProps {
  steps: SubStep[];
  currentStep: number; // 0-indexed
  className?: string;
}

// CVA variants for step icon container
const subStepIconVariants = cva(
  "flex items-center justify-center rounded-full transition-colors shrink-0 h-5 w-5",
  {
    variants: {
      state: {
        completed: "bg-emerald-100 text-emerald-600",
        active: "bg-primary/10 text-primary",
        pending: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      state: "pending",
    },
  }
);

// CVA variants for step label
const subStepLabelVariants = cva("text-sm whitespace-nowrap", {
  variants: {
    state: {
      completed: "text-foreground font-medium",
      active: "text-foreground font-semibold",
      pending: "text-muted-foreground font-medium",
    },
  },
  defaultVariants: {
    state: "pending",
  },
});

// Connector line variants
const connectorVariants = cva("h-px w-8 transition-colors mx-3", {
  variants: {
    completed: {
      true: "bg-emerald-300",
      false: "bg-muted",
    },
  },
  defaultVariants: {
    completed: false,
  },
});

function getStepState(stepIndex: number, currentStep: number): SubStepState {
  if (stepIndex < currentStep) return "completed";
  if (stepIndex === currentStep) return "active";
  return "pending";
}

// Single step item
interface SubStepItemProps {
  step: SubStep;
  stepIndex: number;
  currentStep: number;
  showConnector: boolean;
}

function SubStepItem({ step, stepIndex, currentStep, showConnector }: SubStepItemProps) {
  const state = getStepState(stepIndex, currentStep);

  return (
    <div className="flex items-center">
      <div
        aria-current={state === "active" ? "step" : undefined}
        className="flex items-center gap-2"
      >
        <div className={cn(subStepIconVariants({ state }))}>
          {state === "completed" ? (
            <Check className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Circle className="h-2 w-2 fill-current" aria-hidden="true" />
          )}
        </div>
        <span className={cn(subStepLabelVariants({ state }))}>{step.label}</span>
      </div>

      {showConnector && (
        <div
          className={cn(connectorVariants({ completed: stepIndex < currentStep }))}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Main SubStepper component
function SubStepper({ steps, currentStep, className }: SubStepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)} data-slot="sub-stepper">
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <SubStepItem
            key={step.id}
            step={step}
            stepIndex={index}
            currentStep={currentStep}
            showConnector={index < steps.length - 1}
          />
        ))}
      </div>
    </nav>
  );
}

export { SubStepper, subStepIconVariants, subStepLabelVariants };
