"use client";

import { InfoAccordion } from "@/components/onboarding/info-accordion";
import { OrgOnboardingLayout } from "@/components/onboarding/org-onboarding-layout";
import { ProviderCard } from "@/components/onboarding/provider-card";
import { useOrganization } from "@/hooks/use-organization";
import { getAsanaAuthUrl, getClickUpAuthUrl, getLinearAuthUrl } from "@/lib/api/tasks";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const ConnectTaskPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();

  // Loading states
  const [loading, setLoading] = useState({
    asana: false,
    clickup: false,
    linear: false,
  });

  const organizationId = organization?.id;

  // Get current redirect URL for OAuth callback
  const getRedirectUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/onboarding/connect-task`;
    }
    return "/onboarding/connect-task";
  }, []);

  // Handle OAuth callback status from URL parameters
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const provider = searchParams.get("provider");
    const message = searchParams.get("message");

    if (success === "true") {
      const providerName =
        provider === "asana"
          ? "Asana"
          : provider === "clickup"
            ? "ClickUp"
            : provider === "linear"
              ? "Linear"
              : "Task provider";
      toast.success(`${providerName} connected successfully!`);
      // Clear query params from URL
      router.replace("/onboarding/connect-task", { scroll: false });
    } else if (error) {
      const errorMessage = message || "Failed to connect task provider";
      toast.error(errorMessage);
      // Clear query params from URL
      router.replace("/onboarding/connect-task", { scroll: false });
    }
  }, [searchParams, router]);

  const handleSkip = () => {
    router.push("/onboarding/configure-governance");
  };

  const handleNext = () => {
    router.push("/onboarding/configure-governance");
  };

  const handleConnectAsana = async () => {
    if (!organizationId) {
      toast.error("Please complete organization setup first");
      return;
    }

    setLoading((prev) => ({ ...prev, asana: true }));

    try {
      const redirectUrl = getRedirectUrl();
      const { url } = await getAsanaAuthUrl(organizationId, redirectUrl);
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect Asana");
      setLoading((prev) => ({ ...prev, asana: false }));
    }
  };

  const handleConnectClickUp = async () => {
    if (!organizationId) {
      toast.error("Please complete organization setup first");
      return;
    }

    setLoading((prev) => ({ ...prev, clickup: true }));

    try {
      const redirectUrl = getRedirectUrl();
      const { url } = await getClickUpAuthUrl(organizationId, redirectUrl);
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect ClickUp");
      setLoading((prev) => ({ ...prev, clickup: false }));
    }
  };

  const handleConnectLinear = async () => {
    if (!organizationId) {
      toast.error("Please complete organization setup first");
      return;
    }

    setLoading((prev) => ({ ...prev, linear: true }));

    try {
      const redirectUrl = getRedirectUrl();
      const { url } = await getLinearAuthUrl(organizationId, redirectUrl);
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect Linear");
      setLoading((prev) => ({ ...prev, linear: false }));
    }
  };

  // Info accordion items for what we'll import (TASK-06)
  const importItems = [
    { text: "Task creation and completion dates" },
    { text: "Task status and assignee information" },
    { text: "Time tracking data (Asana and ClickUp)" },
    { text: "Story point estimates (Linear)" },
    { text: "Project and workspace organization" },
  ];

  return (
    <OrgOnboardingLayout
      title="Connect Task Management"
      description="Sync tasks and projects to track work alongside meetings"
      onSkip={handleSkip}
      onNext={handleNext}
    >
      {/* Provider cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ProviderCard
          icon={
            <Image
              src="/images/onboarding/tasks/asana.svg"
              alt="Asana"
              width={48}
              height={48}
            />
          }
          name="Asana"
          description="Sync tasks and projects with time tracking data"
          onConnect={handleConnectAsana}
          loading={loading.asana}
        />
        <ProviderCard
          icon={
            <Image
              src="/images/onboarding/tasks/clickup.svg"
              alt="ClickUp"
              width={48}
              height={48}
            />
          }
          name="ClickUp"
          description="Sync tasks, lists, and time tracking data"
          onConnect={handleConnectClickUp}
          loading={loading.clickup}
        />
        <ProviderCard
          icon={
            <Image
              src="/images/onboarding/tasks/linear.svg"
              alt="Linear"
              width={48}
              height={48}
            />
          }
          name="Linear"
          description="Sync issues with status and estimate points"
          onConnect={handleConnectLinear}
          loading={loading.linear}
        />
      </div>

      {/* Info accordion - explains what data will be imported (TASK-06) */}
      <InfoAccordion title="What we'll import" items={importItems} />
    </OrgOnboardingLayout>
  );
};

export default ConnectTaskPage;
