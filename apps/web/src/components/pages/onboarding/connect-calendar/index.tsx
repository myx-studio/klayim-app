"use client";

import { InfoAccordion } from "@/components/onboarding/info-accordion";
import { OrgOnboardingLayout } from "@/components/onboarding/org-onboarding-layout";
import { ProviderCard } from "@/components/onboarding/provider-card";
import { getGoogleAuthUrl, getMicrosoftAuthUrl, getIntegrations } from "@/lib/api/integrations";
import type { Integration } from "@klayim/shared";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const ConnectCalendarPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // State for integrations and loading
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState({
    google: false,
    microsoft: false,
    fetching: true,
  });

  // Get organization ID from session
  const organizationId = (session?.user as { defaultOrganizationId?: string })?.defaultOrganizationId;

  // Get current redirect URL for OAuth callback
  const getRedirectUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/onboarding/connect-calendar`;
    }
    return "/onboarding/connect-calendar";
  }, []);

  // Find connected integrations by provider
  const googleIntegration = integrations.find(
    (i) => i.provider === "google_calendar" && i.status === "connected"
  );
  const microsoftIntegration = integrations.find(
    (i) => i.provider === "microsoft_calendar" && i.status === "connected"
  );

  // Fetch existing integrations on mount
  useEffect(() => {
    const fetchIntegrations = async () => {
      if (!organizationId) {
        setLoading((prev) => ({ ...prev, fetching: false }));
        return;
      }

      try {
        const data = await getIntegrations(organizationId);
        setIntegrations(data);
      } catch (error) {
        console.error("Failed to fetch integrations:", error);
      } finally {
        setLoading((prev) => ({ ...prev, fetching: false }));
      }
    };

    fetchIntegrations();
  }, [organizationId]);

  // Handle OAuth callback status from URL parameters
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const provider = searchParams.get("provider");
    const email = searchParams.get("email");
    const message = searchParams.get("message");

    if (success === "true") {
      const providerName = provider === "google_calendar" ? "Google Calendar" : "Microsoft Calendar";
      toast.success(`${providerName} connected successfully!${email ? ` (${email})` : ""}`);
      // Clear query params from URL
      router.replace("/onboarding/connect-calendar", { scroll: false });
      // Refresh integrations
      if (organizationId) {
        getIntegrations(organizationId).then(setIntegrations).catch(console.error);
      }
    } else if (error) {
      const providerName = provider === "google_calendar" ? "Google Calendar" : "Microsoft Calendar";
      const errorMessage = message || `Failed to connect ${providerName}`;
      toast.error(errorMessage);
      // Clear query params from URL
      router.replace("/onboarding/connect-calendar", { scroll: false });
    }
  }, [searchParams, router, organizationId]);

  const handleSkip = () => {
    router.push("/onboarding/connect-task");
  };

  const handleNext = () => {
    router.push("/onboarding/connect-task");
  };

  const handleConnectGoogle = async () => {
    if (!organizationId) {
      toast.error("Please complete organization setup first");
      return;
    }

    setLoading((prev) => ({ ...prev, google: true }));

    try {
      const redirectUrl = getRedirectUrl();
      const { url } = await getGoogleAuthUrl(organizationId, redirectUrl);
      // Redirect to OAuth authorization URL
      window.location.href = url;
    } catch (error) {
      console.error("Failed to get Google auth URL:", error);
      toast.error("Failed to initiate Google connection");
      setLoading((prev) => ({ ...prev, google: false }));
    }
  };

  const handleConnectMicrosoft = async () => {
    if (!organizationId) {
      toast.error("Please complete organization setup first");
      return;
    }

    setLoading((prev) => ({ ...prev, microsoft: true }));

    try {
      const redirectUrl = getRedirectUrl();
      const { url } = await getMicrosoftAuthUrl(organizationId, redirectUrl);
      // Redirect to OAuth authorization URL
      window.location.href = url;
    } catch (error) {
      console.error("Failed to get Microsoft auth URL:", error);
      toast.error("Failed to initiate Microsoft connection");
      setLoading((prev) => ({ ...prev, microsoft: false }));
    }
  };

  // Info accordion items for what we'll track (CAL-06)
  const trackItems = [
    { text: "Meeting titles and durations" },
    { text: "Attendee lists and responses" },
    { text: "Recurring meeting patterns" },
    { text: "Meeting room bookings" },
  ];

  // Info accordion items for what we don't track (CAL-06)
  const dontTrackItems = [
    { text: "Meeting recordings or transcripts", positive: false },
    { text: "Meeting content or discussions", positive: false },
    { text: "Individual messages or chat", positive: false },
  ];

  return (
    <OrgOnboardingLayout
      title="Connect Calendars"
      description="Sync team meeting data from your calendar"
      onSkip={handleSkip}
      onNext={handleNext}
    >
      {/* Provider cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProviderCard
          icon={
            <Image
              src="/images/onboarding/calendar/google.svg"
              alt="Google Workspace"
              width={48}
              height={48}
            />
          }
          name="Google Workspace"
          description="Sync calendars and check team availability in real time"
          onConnect={handleConnectGoogle}
          connected={!!googleIntegration}
          connectedEmail={googleIntegration?.accountEmail}
          loading={loading.google}
          disabled={loading.fetching}
        />
        <ProviderCard
          icon={
            <Image
              src="/images/onboarding/calendar/microsoft.svg"
              alt="Microsoft 365"
              width={48}
              height={48}
            />
          }
          name="Microsoft 365"
          description="Sync calendars and check team availability in real time"
          onConnect={handleConnectMicrosoft}
          connected={!!microsoftIntegration}
          connectedEmail={microsoftIntegration?.accountEmail}
          loading={loading.microsoft}
          disabled={loading.fetching}
        />
      </div>

      {/* Info accordions - CAL-06 requirement */}
      <InfoAccordion title="What we'll track" items={trackItems} />
      <InfoAccordion title="What we don't track" items={dontTrackItems} />
    </OrgOnboardingLayout>
  );
};

export default ConnectCalendarPage;
