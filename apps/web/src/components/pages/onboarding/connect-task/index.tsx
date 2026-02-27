"use client";

import { InfoAccordion } from "@/components/onboarding/info-accordion";
import { OrgOnboardingLayout } from "@/components/onboarding/org-onboarding-layout";
import { ProviderCard } from "@/components/onboarding/provider-card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Provider icon placeholder components
const AsanaIcon = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-100">
    <span className="text-lg font-bold text-rose-600">A</span>
  </div>
);

const ClickUpIcon = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
    <span className="text-lg font-bold text-purple-600">CU</span>
  </div>
);

const LinearIcon = () => (
  <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
    <span className="text-primary text-lg font-bold">L</span>
  </div>
);

const ConnectTaskPage = () => {
  const router = useRouter();

  const handleBack = () => {
    router.push("/onboarding/connect-calendar");
  };

  const handleSkip = () => {
    router.push("/onboarding/configure-governance");
  };

  const handleNext = () => {
    router.push("/onboarding/configure-governance");
  };

  const handleConnectAsana = () => {
    toast.info("Task integration coming soon");
  };

  const handleConnectClickUp = () => {
    toast.info("Task integration coming soon");
  };

  const handleConnectLinear = () => {
    toast.info("Task integration coming soon");
  };

  // Info accordion items for what we'll import
  const importItems = [
    { text: "Task creation and completion dates" },
    { text: "Task updates and reassignments" },
    { text: "Time to completion by task type" },
    { text: "Tasks assigned to external contractors" },
  ];

  return (
    <OrgOnboardingLayout
      title="Connect Task Management"
      description="Sync tasks and projects to track work alongside meetings"
      onBack={handleBack}
      onSkip={handleSkip}
      onNext={handleNext}
    >
      {/* Provider cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ProviderCard
          icon={<AsanaIcon />}
          name="Asana"
          description="Sync tasks and projects to keep meetings aligned with work"
          onConnect={handleConnectAsana}
        />
        <ProviderCard
          icon={<ClickUpIcon />}
          name="ClickUp"
          description="Sync tasks and projects to keep meetings aligned with work"
          onConnect={handleConnectClickUp}
        />
        <ProviderCard
          icon={<LinearIcon />}
          name="Linear"
          description="Sync tasks and projects to keep meetings aligned with work"
          onConnect={handleConnectLinear}
        />
      </div>

      {/* Info accordion */}
      <InfoAccordion title="What we'll import" items={importItems} />
    </OrgOnboardingLayout>
  );
};

export default ConnectTaskPage;
