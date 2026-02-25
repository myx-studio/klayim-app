"use client";

import { FadeIn } from "@/components/motion";

const HowItWorks = () => {
  return (
    <section className="relative flex w-full flex-col items-center justify-center py-10 md:py-16">
      <div className="container flex flex-col items-center justify-center gap-8 px-6 md:gap-12">
        {/* Header */}
        <div className="flex max-w-2xl flex-col items-center justify-center gap-4 text-center md:gap-6">
          <FadeIn>
            <h2 className="text-3xl font-semibold md:text-4xl md:leading-14 lg:text-5xl">
              How Klayim Works
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-base font-light md:text-xl">
              Meetings should earn their place on your calendar.
            </p>
          </FadeIn>
        </div>

        {/* Grid */}
        <div className="flex w-full max-w-6xl flex-col gap-4 md:gap-6">
          {/* Row 1: 3 cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {[0, 1, 2].map((i) => (
              <FadeIn key={i} delay={0.1 * i} direction="up">
                <div className="bg-secondary-accent/50 h-64 rounded-2xl transition-transform duration-300 hover:scale-105" />
              </FadeIn>
            ))}
          </div>

          {/* Row 2: 2 cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {[0, 1].map((i) => (
              <FadeIn key={i} delay={0.3 + 0.1 * i} direction="up">
                <div className="bg-secondary-accent/50 h-64 rounded-2xl transition-transform duration-300 hover:scale-105" />
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
