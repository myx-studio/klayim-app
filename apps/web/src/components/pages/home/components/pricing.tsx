"use client";

import { FadeIn } from "@/components/motion";
import { pricingPlans } from "@klayim/shared";
import PricingItem from "../../../shared/pricing-item";

const Pricing = () => {
  return (
    <section className="relative flex w-full flex-col items-center justify-center py-10 md:py-16">
      <div className="container flex flex-col items-center justify-center gap-8 px-6 md:gap-12">
        {/* Header */}
        <div className="flex max-w-2xl flex-col items-center justify-center gap-4 text-center md:gap-6">
          <FadeIn>
            <h2 className="text-3xl font-semibold md:text-4xl md:leading-14 lg:text-5xl">
              Simple Pricing
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-base font-light md:text-xl">
              Pay once. Use forever. No subscriptions.
            </p>
          </FadeIn>
        </div>

        {/* Pricing Cards */}
        <div className="grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {pricingPlans.map((plan, index) => (
            <FadeIn key={plan.id} delay={0.1 * index} direction="up">
              <PricingItem plan={plan} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
