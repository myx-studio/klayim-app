"use client";

import { InfoAccordion } from "@/components/onboarding/info-accordion";
import { OrgOnboardingLayout } from "@/components/onboarding/org-onboarding-layout";
import { ProviderCard } from "@/components/onboarding/provider-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBambooHRAuthUrl, createFinchSession, exchangeFinchCode } from "@/lib/api/hris";
import { useOrganization } from "@/hooks/use-organization";
import { useFinchConnect } from "@tryfinch/react-connect";
import { Users, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const ConnectHrisPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();

  // State for BambooHR domain dialog
  const [showBambooHRDialog, setShowBambooHRDialog] = useState(false);
  const [bambooHRDomain, setBambooHRDomain] = useState("");

  // Loading states
  const [loading, setLoading] = useState({
    bamboohr: false,
    finch: false,
  });

  // Get organization ID from session/context
  const organizationId = organization?.id;
  const organizationName = organization?.name || "";

  // Get current redirect URL for OAuth callback
  const getRedirectUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/onboarding/connect-hris`;
    }
    return "/onboarding/connect-hris";
  }, []);

  // Finch Connect hook for Rippling/Gusto
  const { open: openFinchConnect } = useFinchConnect({
    onSuccess: async ({ code }) => {
      if (!organizationId) return;
      try {
        const result = await exchangeFinchCode(code, organizationId);
        toast.success(`Connected to ${result.companyName}`);
        router.push("/onboarding/connect-calendar");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to complete connection");
      } finally {
        setLoading((prev) => ({ ...prev, finch: false }));
      }
    },
    onError: ({ errorMessage }) => {
      toast.error(errorMessage);
      setLoading((prev) => ({ ...prev, finch: false }));
    },
    onClose: () => {
      setLoading((prev) => ({ ...prev, finch: false }));
    },
  });

  // Handle OAuth callback status from URL parameters
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const provider = searchParams.get("provider");
    const message = searchParams.get("message");

    if (success === "true") {
      const providerName =
        provider === "bamboohr"
          ? "BambooHR"
          : provider === "rippling"
            ? "Rippling"
            : provider === "gusto"
              ? "Gusto"
              : "HRIS";
      toast.success(`${providerName} connected successfully!`);
      // Clear query params from URL
      router.replace("/onboarding/connect-hris", { scroll: false });
    } else if (error) {
      const errorMessage = message || "Failed to connect HRIS provider";
      toast.error(errorMessage);
      // Clear query params from URL
      router.replace("/onboarding/connect-hris", { scroll: false });
    }
  }, [searchParams, router]);

  const handleSkip = () => {
    router.push("/onboarding/connect-calendar");
  };

  const handleNext = () => {
    router.push("/onboarding/connect-calendar");
  };

  const handleConnectBambooHR = async () => {
    if (!organizationId) {
      toast.error("Please complete organization setup first");
      return;
    }

    // Show dialog if domain not yet set
    if (!bambooHRDomain) {
      setShowBambooHRDialog(true);
      return;
    }

    setLoading((prev) => ({ ...prev, bamboohr: true }));

    try {
      const redirectUrl = getRedirectUrl();
      const { url } = await getBambooHRAuthUrl(organizationId, redirectUrl, bambooHRDomain);
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect BambooHR");
      setLoading((prev) => ({ ...prev, bamboohr: false }));
    }
  };

  const handleBambooHRDialogSubmit = async () => {
    if (!bambooHRDomain.trim()) {
      toast.error("Please enter your BambooHR subdomain");
      return;
    }

    setShowBambooHRDialog(false);
    // Domain is set, now trigger the OAuth flow
    await handleConnectBambooHR();
  };

  const handleConnectWithFinch = async () => {
    if (!organizationId) {
      toast.error("Please complete organization setup first");
      return;
    }

    setLoading((prev) => ({ ...prev, finch: true }));

    try {
      const { sessionId } = await createFinchSession(organizationId, organizationName);
      // Open Finch Connect modal
      openFinchConnect({ sessionId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect");
      setLoading((prev) => ({ ...prev, finch: false }));
    }
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
            icon={
              <Image
                src="/images/onboarding/hris/bamboohr.svg"
                alt="BambooHR"
                width={48}
                height={48}
              />
            }
            name="BambooHR"
            description="Sync employee data and hourly rates using BambooHR"
            onConnect={handleConnectBambooHR}
            loading={loading.bamboohr}
          />
          <ProviderCard
            icon={
              <Image
                src="/images/onboarding/hris/rippling.svg"
                alt="Rippling"
                width={48}
                height={48}
              />
            }
            name="Rippling"
            description="Sync employee data and hourly rates using Rippling"
            onConnect={handleConnectWithFinch}
            loading={loading.finch}
          />
          <ProviderCard
            icon={
              <Image src="/images/onboarding/hris/gusto.svg" alt="Gusto" width={48} height={48} />
            }
            name="Gusto"
            description="Sync employee data and hourly rates using Gusto"
            onConnect={handleConnectWithFinch}
            loading={loading.finch}
          />
        </div>

        {/* Fallback section */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <p className="text-muted-foreground text-sm">Don&apos;t see your HRIS?</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/onboarding/upload-csv")}>
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

      {/* BambooHR Domain Dialog */}
      <Dialog open={showBambooHRDialog} onOpenChange={setShowBambooHRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect BambooHR</DialogTitle>
            <DialogDescription>
              Enter your BambooHR subdomain to connect. This is the part before .bamboohr.com in
              your BambooHR URL.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bamboohr-domain">BambooHR Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="bamboohr-domain"
                  placeholder="yourcompany"
                  value={bambooHRDomain}
                  onChange={(e) => setBambooHRDomain(e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground text-sm">.bamboohr.com</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Example: If your BambooHR URL is acme.bamboohr.com, enter &quot;acme&quot;
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBambooHRDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBambooHRDialogSubmit} disabled={!bambooHRDomain.trim()}>
              {loading.bamboohr ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConnectHrisPage;
