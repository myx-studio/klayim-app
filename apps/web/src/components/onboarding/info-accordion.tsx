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
  /** Optional className for additional styling */
  className?: string;
}

/**
 * InfoAccordion component for expandable info sections.
 * Shows a help icon + title, expands to show checklist items with positive/negative indicators.
 */
function InfoAccordion({ title, items, defaultOpen = false, className }: InfoAccordionProps) {
  const accordionValue = defaultOpen ? "info" : undefined;

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={accordionValue}
      className={cn("w-full", className)}
      data-slot="info-accordion"
    >
      <AccordionItem value="info" className="border-b-0">
        <AccordionTrigger className="py-3 hover:no-underline">
          <span className="flex items-center gap-2 text-sm font-medium">
            <HelpCircle className="text-muted-foreground h-4 w-4" />
            {title}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <ul className="flex flex-col gap-2 pt-1">
            {items.map((item, index) => {
              const isPositive = item.positive !== false;
              return (
                <li key={index} className="flex items-center gap-2 text-sm">
                  {isPositive ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                  )}
                  <span className="text-muted-foreground">{item.text}</span>
                </li>
              );
            })}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export { InfoAccordion };
