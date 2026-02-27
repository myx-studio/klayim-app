import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PricingPlan } from "@klayim/shared";
import { Check, CircleCheck } from "lucide-react";
import Link from "next/link";

interface PricingItemProps {
  plan: PricingPlan;
  // Optional props for selectable mode (onboarding)
  isSelected?: boolean;
  onSelect?: () => void;
}

const PricingItem = ({ plan, isSelected, onSelect }: PricingItemProps) => {
  const isSelectable = typeof onSelect === "function";

  const content = (
    <>
      <div className="p-6 text-xl font-bold">
        <h3>{plan.name}</h3>
      </div>
      {/* Selected indicator */}
      {isSelected && (
        <div className="bg-primary absolute top-3 right-3 z-10 rounded-full p-1">
          <Check className="size-4 text-white" />
        </div>
      )}
      <Card
        className="relative flex-1 overflow-hidden border-0"
        style={{
          boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.10)",
        }}
      >
        <CardHeader>
          <CardTitle className="text-base font-light">{plan.description}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Price */}
          <div className="flex flex-col gap-1">
            {plan.price !== null ? (
              <span className="text-4xl font-semibold">${plan.price}</span>
            ) : (
              <span className="text-3xl font-semibold">{plan.priceLabel}</span>
            )}
            {plan.paymentType && (
              <span className="text-muted-foreground text-sm">{plan.paymentType}</span>
            )}
          </div>

          {/* Divider */}
          <div className="border-muted-foreground/30 border-t border-dashed" />

          {/* Features */}
          <ul className="flex flex-col gap-3">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <CircleCheck className="size-5 shrink-0 text-emerald-400" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>

        {!isSelectable && (
          <CardFooter className="mt-auto pt-6">
            <Button
              asChild
              className="group-hover:bg-primary-yellow group-hover:text-primary-yellow-foreground w-full transition-colors duration-300"
              size="lg"
            >
              <Link href={plan.ctaLink}>{plan.cta}</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </>
  );

  // Selectable mode (for onboarding)
  if (isSelectable) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl text-left shadow-sm transition-all duration-300 ease-in-out hover:scale-105",
          isSelected
            ? "bg-primary-yellow ring-primary scale-105 ring-2"
            : "bg-secondary-accent hover:bg-primary-yellow"
        )}
      >
        {content}
      </button>
    );
  }

  // Link mode (for home page)
  return (
    <div className="group bg-secondary-accent hover:bg-primary-yellow flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl shadow-sm transition-all duration-300 ease-in-out hover:scale-105">
      {content}
    </div>
  );
};

export default PricingItem;
