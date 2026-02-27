"use client";

import { InfoAccordion } from "@/components/onboarding/info-accordion";
import { OrgOnboardingLayout } from "@/components/onboarding/org-onboarding-layout";
import { ProviderCard } from "@/components/onboarding/provider-card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Provider icon placeholder components
const GoogleWorkspaceIcon = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
    <span className="text-lg font-bold text-red-600">GW</span>
  </div>
);

const Microsoft365Icon = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
    <span className="text-lg font-bold text-blue-600">M</span>
  </div>
);

const ConnectCalendarPage = () => {
  const router = useRouter();

  const handleBack = () => {
    router.push("/onboarding/connect-hris");
  };

  const handleSkip = () => {
    router.push("/onboarding/connect-task");
  };

  const handleNext = () => {
    router.push("/onboarding/connect-task");
  };

  const handleConnectGoogle = () => {
    toast.info("Calendar integration coming soon");
  };

  const handleConnectMicrosoft = () => {
    toast.info("Calendar integration coming soon");
  };

  // Info accordion items for what we'll track
  const trackItems = [
    { text: "Meeting titles and durations" },
    { text: "Attendee lists and responses" },
    { text: "Recurring meeting patterns" },
    { text: "Meeting room bookings" },
  ];

  // Info accordion items for what we don't track
  const dontTrackItems = [
    { text: "Meeting recordings or transcripts", positive: false },
    { text: "Meeting content or discussions", positive: false },
    { text: "Individual messages or chat", positive: false },
  ];

  return (
    <OrgOnboardingLayout
      title="Connect Calendars"
      description="Sync team meeting data from your calendar"
      currentStep={1}
      onBack={handleBack}
      onSkip={handleSkip}
      onNext={handleNext}
    >
      {/* Provider cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProviderCard
          icon={<GoogleWorkspaceIcon />}
          name="Google Workspace"
          description="Sync calendars and check team availability in real time"
          onConnect={handleConnectGoogle}
        />
        <ProviderCard
          icon={<Microsoft365Icon />}
          name="Microsoft 365"
          description="Sync calendars and check team availability in real time"
          onConnect={handleConnectMicrosoft}
        />
      </div>

      {/* Info accordions */}
      <InfoAccordion title="What we'll track" items={trackItems} />
      <InfoAccordion title="What we don't track" items={dontTrackItems} />
    </OrgOnboardingLayout>
  );
};

export default ConnectCalendarPage;
