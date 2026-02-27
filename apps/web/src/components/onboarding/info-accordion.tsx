/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/onboarding/info-accordion.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-27
 ** github: @aiqbalsyah
 */

"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, HelpCircle, X } from "lucide-react";
import * as React from "react";

// Info item type definition
export interface InfoItem {
  /** Item text to display */
  text: string;
  /** If true, shows green check; if false, shows red X (defaults to true/positive) */
  positive?: boolean;
}

export interface InfoAccordionProps {
  /** Accordion header text (e.g., "What we'll import") */
  title: string;
  /** List of items to display in the accordion content */
  items: InfoItem[];
  /** Whether accordion starts expanded (default: false) */
  defaultOpen?: boolean;
  /** Number of columns for grid layout (default: 1) */
  columns?: 1 | 2 | 3;
  /** Optional footer content (e.g., download button) */
  footer?: React.ReactNode;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * InfoAccordion component for expandable info sections.
 * Shows a help icon + title, expands to show checklist items with positive/negative indicators.
 */
function InfoAccordion({
  title,
  items,
  defaultOpen = false,
  columns = 1,
  footer,
  className,
}: InfoAccordionProps) {
  const accordionValue = defaultOpen ? "info" : undefined;

  const gridClass =
    columns === 3
      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
      : columns === 2
        ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
        : "flex flex-col gap-3";

  return (
    <Card className={cn("w-full p-4", className)} data-slot="info-accordion">
      <Accordion type="single" collapsible defaultValue={accordionValue}>
        <AccordionItem value="info" className="border-b-0">
          <AccordionTrigger className="py-0 hover:no-underline">
            <span className="flex items-center gap-3 text-sm font-semibold">
              <span className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <HelpCircle className="text-muted-foreground h-4 w-4" />
              </span>
              {title}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className={cn(gridClass, "pt-4")}>
              {items.map((item, index) => {
                const isPositive = item.positive !== false;
                return (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    {isPositive ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                        <X className="h-4 w-4 text-red-500" aria-hidden="true" />
                      </span>
                    )}
                    <span>{item.text}</span>
                  </li>
                );
              })}
            </ul>
            {footer && <div className="pt-4">{footer}</div>}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

export { InfoAccordion };
