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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
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
  /** Whether the provider is already connected */
  connected?: boolean;
  /** Connected account email to display */
  connectedEmail?: string;
  /** Loading state for the connect button */
  loading?: boolean;
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
  connected = false,
  connectedEmail,
  loading = false,
  disabled = false,
  className,
}: ProviderCardProps) {
  return (
    <Card
      data-slot="provider-card"
      className={cn("flex h-full min-h-[200px] flex-col justify-between p-6", className)}
    >
      <CardContent className="flex flex-col gap-4 p-0">
        {/* Provider icon with optional connected badge */}
        <div className="flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center">{icon}</div>
          {connected && (
            <Badge variant="outline" className="border-emerald-500 text-emerald-600">
              <Check className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          )}
        </div>

        {/* Provider info */}
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold">{name}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
          {connected && connectedEmail && (
            <p className="text-muted-foreground mt-1 truncate text-xs">{connectedEmail}</p>
          )}
        </div>
      </CardContent>

      {/* Connect button - show different state if connected */}
      {connected ? (
        <Button variant="outline" onClick={onConnect} disabled={disabled || loading} className="mt-4 w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reconnecting...
            </>
          ) : (
            "Reconnect"
          )}
        </Button>
      ) : (
        <Button onClick={onConnect} disabled={disabled || loading} className="mt-4 w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect"
          )}
        </Button>
      )}
    </Card>
  );
}

export { ProviderCard };
