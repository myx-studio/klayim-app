/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/onboarding/provider-card.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-27
 ** github: @aiqbalsyah
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import * as React from "react";

export interface ProviderCardProps {
  /** Provider logo or icon (React node for flexibility) */
  icon: React.ReactNode;
  /** Provider name (e.g., "BambooHR") */
  name: string;
  /** Brief description of the provider */
  description: string;
  /** Callback when Connect button is clicked */
  onConnect: () => void;
  /** Optional disabled state */
  disabled?: boolean;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * ProviderCard component for integration provider selection.
 * Displays provider icon, name, description, and a Connect button.
 */
function ProviderCard({
  icon,
  name,
  description,
  onConnect,
  disabled = false,
  className,
}: ProviderCardProps) {
  return (
    <Card
      data-slot="provider-card"
      className={cn("flex h-full min-h-[200px] flex-col justify-between p-6", className)}
    >
      <CardContent className="flex flex-col gap-4 p-0">
        {/* Provider icon */}
        <div className="flex h-12 w-12 items-center justify-center">{icon}</div>

        {/* Provider info */}
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">{name}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </CardContent>

      {/* Connect button */}
      <Button onClick={onConnect} disabled={disabled} className="mt-4 w-full">
        Connect
      </Button>
    </Card>
  );
}

export { ProviderCard };
