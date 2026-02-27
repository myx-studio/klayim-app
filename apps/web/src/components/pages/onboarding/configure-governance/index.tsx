"use client";

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
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ConfigureGovernancePage = () => {
  const router = useRouter();

  // Form state (local state, no API integration yet - Phase 8)
  const [meetingCostThreshold, setMeetingCostThreshold] = useState("500");
  const [lowRoiThreshold, setLowRoiThreshold] = useState("1.0");
  const [dashboardRefresh, setDashboardRefresh] = useState("30");
  const [pullToRefresh, setPullToRefresh] = useState(true);

  const handleNext = () => {
    router.push("/onboarding/onboarding-success");
  };

  return (
    <OrgOnboardingLayout
      title="Configure Governance"
      description="Set thresholds and rules for your organization"
      onSkip={handleNext}
      onNext={handleNext}
      showSkip={false}
      nextLabel={
        <>
          <Check className="mr-2 h-4 w-4" />
          Complete Setup
        </>
      }
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
                value={meetingCostThreshold}
                onChange={(e) => setMeetingCostThreshold(e.target.value)}
              />
            </InputGroup>
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
                value={lowRoiThreshold}
                onChange={(e) => setLowRoiThreshold(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>x</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          {/* Dashboard Refresh */}
          <Field>
            <FieldLabel>Dashboard Refresh</FieldLabel>
            <FieldDescription>Auto-refresh every</FieldDescription>
            <Select value={dashboardRefresh} onValueChange={setDashboardRefresh}>
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
              onCheckedChange={(checked) => setPullToRefresh(checked === true)}
            />
            <FieldLabel htmlFor="pull-to-refresh">Enable pull-to-refresh</FieldLabel>
          </Field>
        </FieldGroup>
      </Card>
    </OrgOnboardingLayout>
  );
};

export default ConfigureGovernancePage;
