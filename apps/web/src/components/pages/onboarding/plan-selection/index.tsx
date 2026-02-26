"use client";

import PricingItem from "@/components/shared/pricing-item";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { pricingPlans, type PlanType } from "@klayim/shared";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateCheckoutSession } from "@/hooks/use-billing";
import { EnterpriseForm } from "./enterprise-form";
import { useOrganization } from "@/hooks/use-organization";

// Map pricing plan IDs to billing PlanType
const PLAN_TYPE_MAP: Record<string, PlanType> = {
  individual: "starter",
  team: "professional",
};

const PlanSelectionPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { organization } = useOrganization();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);
  const createCheckout = useCreateCheckoutSession();

  const isEnterprise = selectedPlan === "enterprise";
  const organizationId = organization?.id || "";
  const userEmail = session?.user?.email || "";

  const handleContinue = async () => {
    if (!selectedPlan) return;

    // Enterprise plan - show contact form
    if (isEnterprise) {
      setShowEnterpriseForm(true);
      return;
    }

    if (!organizationId) {
      console.error("No organization ID available");
      return;
    }

    // Map pricing plan ID to PlanType for billing
    const planType = PLAN_TYPE_MAP[selectedPlan];
    if (!planType) {
      console.error("Invalid plan type:", selectedPlan);
      return;
    }

    try {
      const result = await createCheckout.mutateAsync({
        organizationId,
        planType,
        successUrl: `${window.location.origin}/onboarding/setup-organization`,
        cancelUrl: `${window.location.origin}/onboarding/plan-selection`,
      });

      // Redirect to Stripe Checkout
      window.location.href = result.checkoutUrl;
    } catch (error) {
      console.error("Checkout error:", error);
    }
  };

  // Show enterprise contact form
  if (showEnterpriseForm) {
    return (
      <div className="flex w-full flex-col items-center gap-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex flex-col items-center justify-center gap-2">
            <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
          </Link>
        </div>

        <EnterpriseForm
          organizationId={organizationId}
          defaultEmail={userEmail}
          onBack={() => setShowEnterpriseForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <Link href="/" className="flex flex-col items-center justify-center gap-2">
          <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Choose Your Plan</h1>
          <p className="text-muted-foreground text-sm">
            Select the plan that best fits your needs
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        {pricingPlans.map((plan) => (
          <PricingItem
            key={plan.id}
            plan={plan}
            isSelected={selectedPlan === plan.id}
            onSelect={() => setSelectedPlan(plan.id)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-md flex-col gap-4">
        <Button
          onClick={handleContinue}
          disabled={!selectedPlan || createCheckout.isPending}
          className="h-11 w-full"
          size="lg"
        >
          {createCheckout.isPending ? (
            <>
              <Spinner className="mr-2 size-4" />
              Processing...
            </>
          ) : isEnterprise ? (
            "Contact Sales"
          ) : (
            "Continue to Payment"
          )}
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          Not sure yet?{" "}
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-primary hover:underline"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
};

export default PlanSelectionPage;
