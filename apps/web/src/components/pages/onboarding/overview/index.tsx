"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SetupStepCardProps {
  number: number;
  title: string;
  description: string;
  imageSrc: string;
}

const SetupStepCard = ({ number, title, description, imageSrc }: SetupStepCardProps) => {
  return (
    <div className="bg-card relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border p-6">
      {/* Illustration - positioned behind text */}
      <div className="absolute right-0 bottom-0 z-0">
        <Image
          src={imageSrc}
          alt={title}
          width={180}
          height={180}
          className="object-contain opacity-90"
        />
      </div>

      {/* Content - above image */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* Step number badge */}
        <div className="bg-muted text-muted-foreground mb-4 flex size-8 items-center justify-center rounded-lg text-sm font-medium">
          {number}
        </div>

        {/* Title */}
        <h3 className="text-2xl font-semibold leading-tight whitespace-pre-line">{title}</h3>

        {/* Description */}
        <p className="text-muted-foreground mt-auto text-sm">{description}</p>
      </div>
    </div>
  );
};

const OnboardingOverviewPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name || "there";

  const setupSteps = [
    {
      number: 1,
      title: "Connect\nHRIS",
      description: "Import employee data and rates",
      imageSrc: "/images/onboarding/connect-hris.png",
    },
    {
      number: 2,
      title: "Connect\nCalendars & Task",
      description: "Sync team meeting data",
      imageSrc: "/images/onboarding/connect-calendar.png",
    },
    {
      number: 3,
      title: "Configure\nGovernance",
      description: "Set thresholds and rules",
      imageSrc: "/images/onboarding/configure-governance.png",
    },
  ];

  const handleStartSetup = () => {
    // Navigate to first setup step (Connect HRIS)
    router.push("/onboarding/connect-hris");
  };

  return (
    <div className="flex w-full flex-col items-center gap-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <Link href="/" className="flex flex-col items-center justify-center gap-2">
          <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Welcome to Klayim, {userName}!</h1>
          <p className="text-muted-foreground text-sm">
            Let&apos;s get you set up in 3 quick steps
          </p>
        </div>
      </div>

      {/* Setup Step Cards */}
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        {setupSteps.map((step) => (
          <SetupStepCard
            key={step.number}
            number={step.number}
            title={step.title}
            description={step.description}
            imageSrc={step.imageSrc}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <p className="text-muted-foreground text-sm">This will take about 15 minutes</p>
        <Button onClick={handleStartSetup} className="h-11 w-full" size="lg">
          Start Setup
        </Button>
      </div>
    </div>
  );
};

export default OnboardingOverviewPage;
