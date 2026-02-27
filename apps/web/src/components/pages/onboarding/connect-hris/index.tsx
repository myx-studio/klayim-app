"use client";

import { InfoAccordion } from "@/components/onboarding/info-accordion";
import { OrgOnboardingLayout } from "@/components/onboarding/org-onboarding-layout";
import { ProviderCard } from "@/components/onboarding/provider-card";
import { UploadCsvDialog } from "@/components/onboarding/upload-csv-dialog";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// Provider icon placeholder components
const BambooHRIcon = () => (
  <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
    <span className="text-primary text-lg font-bold">BH</span>
  </div>
);

const RipplingIcon = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
    <span className="text-lg font-bold text-blue-600">R</span>
  </div>
);

const GustoIcon = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
    <span className="text-lg font-bold text-orange-600">G</span>
  </div>
);

const ConnectHrisPage = () => {
  const router = useRouter();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const handleSkip = () => {
    router.push("/onboarding/connect-calendar");
  };

  const handleNext = () => {
    router.push("/onboarding/connect-calendar");
  };

  const handleConnectBambooHR = () => {
    toast.info("BambooHR integration coming soon");
  };

  const handleConnectRippling = () => {
    toast.info("Rippling integration coming soon");
  };

  const handleConnectGusto = () => {
    toast.info("Gusto integration coming soon");
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:support@klayim.com?subject=HRIS Integration Request";
  };

  // Info accordion items for what we'll import
  const importItems = [
    { text: "Employee names and emails" },
    { text: "Roles and departments" },
    { text: "Hourly rates (calculated from salaries)" },
    { text: "Employment status (active, contractor)" },
  ];

  return (
    <>
      <OrgOnboardingLayout
        title="Connect HRIS"
        description="Import employee data and rates from your HR system"
        onSkip={handleSkip}
        onNext={handleNext}
      >
        {/* Provider cards grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ProviderCard
            icon={<BambooHRIcon />}
            name="BambooHR"
            description="Sync employee data and hourly rates using BambooHR"
            onConnect={handleConnectBambooHR}
          />
          <ProviderCard
            icon={<RipplingIcon />}
            name="Rippling"
            description="Sync employee data and hourly rates using Rippling"
            onConnect={handleConnectRippling}
          />
          <ProviderCard
            icon={<GustoIcon />}
            name="Gusto"
            description="Sync employee data and hourly rates using Gusto"
            onConnect={handleConnectGusto}
          />
        </div>

        {/* Fallback section */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <p className="text-muted-foreground text-sm">Don't see your HRIS?</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
            <Button variant="outline" onClick={handleContactSupport}>
              Contact Support
            </Button>
          </div>
        </div>

        {/* Info accordion */}
        <InfoAccordion title="What we'll import" items={importItems} />
      </OrgOnboardingLayout>

      {/* Upload CSV Dialog */}
      <UploadCsvDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
    </>
  );
};

export default ConnectHrisPage;
