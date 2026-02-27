"use client";

import { useForm } from "react-hook-form";
import { OrgOnboardingLayout } from "@/components/onboarding/org-onboarding-layout";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization, useUpdateGovernance } from "@/hooks/use-organization";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface GovernanceFormValues {
  meetingCostThreshold: number;
  lowRoiThreshold: number;
  dashboardRefresh: string;
  pullToRefresh: boolean;
}

const ConfigureGovernancePage = () => {
  const router = useRouter();
  const { organization, isLoading: isLoadingOrg } = useOrganization();
  const updateGovernance = useUpdateGovernance();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<GovernanceFormValues>({
    defaultValues: {
      meetingCostThreshold: 500,
      lowRoiThreshold: 1.0,
      dashboardRefresh: "30",
      pullToRefresh: true,
    },
  });

  // Load existing settings when organization data is available
  useEffect(() => {
    if (organization?.governanceSettings) {
      const settings = organization.governanceSettings;
      reset({
        meetingCostThreshold: settings.meetingCostThresholdCents / 100,
        lowRoiThreshold: settings.lowRoiThreshold,
        dashboardRefresh: String(settings.dashboardRefreshMinutes),
        pullToRefresh: settings.pullToRefreshEnabled,
      });
    }
  }, [organization, reset]);

  const dashboardRefresh = watch("dashboardRefresh");
  const pullToRefresh = watch("pullToRefresh");

  const onSubmit = async (data: GovernanceFormValues) => {
    if (!organization) {
      toast.error("Organization not found");
      return;
    }

    // Validate ranges
    if (data.meetingCostThreshold < 0 || data.meetingCostThreshold > 100000) {
      toast.error("Meeting cost threshold must be between $0 and $100,000");
      return;
    }

    if (data.lowRoiThreshold < 0 || data.lowRoiThreshold > 100) {
      toast.error("Low ROI threshold must be between 0 and 100");
      return;
    }

    try {
      await updateGovernance.mutateAsync({
        id: organization.id,
        data: {
          meetingCostThresholdCents: Math.round(data.meetingCostThreshold * 100),
          lowRoiThreshold: data.lowRoiThreshold,
          dashboardRefreshMinutes: parseInt(data.dashboardRefresh, 10),
          pullToRefreshEnabled: data.pullToRefresh,
        },
      });

      toast.success("Settings saved");
      router.push("/onboarding/onboarding-success");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const isSubmitting = updateGovernance.isPending;

  return (
    <OrgOnboardingLayout
      title="Configure Governance"
      description="Set thresholds and rules for your organization"
      onSkip={() => router.push("/onboarding/onboarding-success")}
      onNext={handleSubmit(onSubmit)}
      showSkip={false}
      nextLabel={
        isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Complete Setup
          </>
        )
      }
      nextDisabled={isSubmitting || isLoadingOrg}
    >
      <Card className="p-6">
        <FieldGroup>
          {/* Meeting Cost Threshold */}
          <Field>
            <FieldLabel>Meeting Cost Threshold</FieldLabel>
            <FieldDescription>
              Meetings exceeding this cost will require manager approval
            </FieldDescription>
            <InputGroup className="h-11">
              <InputGroupAddon align="inline-start">
                <InputGroupText>$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                type="number"
                placeholder="500"
                min={0}
                max={100000}
                {...register("meetingCostThreshold", { valueAsNumber: true })}
              />
            </InputGroup>
            {errors.meetingCostThreshold && (
              <p className="text-destructive text-sm">{errors.meetingCostThreshold.message}</p>
            )}
          </Field>

          {/* Low ROI Threshold */}
          <Field>
            <FieldLabel>Low ROI Threshold</FieldLabel>
            <FieldDescription>
              Meetings with ROI below this will be flagged for review
            </FieldDescription>
            <InputGroup className="h-11">
              <InputGroupInput
                type="number"
                step="0.1"
                placeholder="1.0"
                min={0}
                max={100}
                {...register("lowRoiThreshold", { valueAsNumber: true })}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>x</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {errors.lowRoiThreshold && (
              <p className="text-destructive text-sm">{errors.lowRoiThreshold.message}</p>
            )}
          </Field>

          {/* Dashboard Refresh */}
          <Field>
            <FieldLabel>Dashboard Refresh</FieldLabel>
            <FieldDescription>Auto-refresh every</FieldDescription>
            <Select
              value={dashboardRefresh}
              onValueChange={(value) => setValue("dashboardRefresh", value)}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Select refresh interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Pull to Refresh */}
          <Field orientation="horizontal">
            <Checkbox
              id="pull-to-refresh"
              checked={pullToRefresh}
              onCheckedChange={(checked) => setValue("pullToRefresh", checked === true)}
            />
            <FieldLabel htmlFor="pull-to-refresh">Enable pull-to-refresh</FieldLabel>
          </Field>
        </FieldGroup>
      </Card>
    </OrgOnboardingLayout>
  );
};

export default ConfigureGovernancePage;
