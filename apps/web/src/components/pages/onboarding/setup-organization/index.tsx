"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCreateOrganization, useUpdateOrganization, useOrganization } from "@/hooks/use-organization";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { organizationNameSchema } from "@klayim/shared/schemas";
import type { ApiResponse } from "@klayim/shared/types";
import { useForm } from "@tanstack/react-form";
import { Check, Loader2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CheckNameResponse {
  available: boolean;
  suggestion?: string;
}

const SetupOrganizationPage = () => {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { organization: existingOrg, isLoading: isLoadingOrg } = useOrganization();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();

  const isEditMode = !!existingOrg;

  const form = useForm({
    defaultValues: {
      name: existingOrg?.name || "",
    },
    onSubmit: async ({ value }) => {
      if (isEditMode && existingOrg) {
        // Update existing organization
        updateOrganization.mutate(
          { id: existingOrg.id, data: { name: value.name.trim() } },
          {
            onSuccess: async () => {
              router.push("/onboarding/plan-selection");
            },
          }
        );
      } else {
        // Create new organization
        createOrganization.mutate(
          { name: value.name.trim() },
          {
            onSuccess: async (data) => {
              await updateSession({
                defaultOrganizationId: data?.organization?.id,
              });
              router.push("/onboarding/plan-selection");
            },
          }
        );
      }
    },
  });

  // Update form default when org loads
  const nameField = form.getFieldValue("name");
  if (existingOrg?.name && !nameField) {
    form.setFieldValue("name", existingOrg.name);
  }

  const isLoading = createOrganization.isPending || updateOrganization.isPending || isLoadingOrg;
  const error = createOrganization.error?.message || updateOrganization.error?.message || null;

  return (
    <div className="mx-auto max-w-xl">
      <Card className="w-full border px-2">
        <CardHeader className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex flex-col items-center justify-center gap-2">
            <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">
              {isEditMode ? "Update Your Organization" : "Create Your Organization"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isEditMode ? "Update your workspace details" : "Set up your workspace to get started"}
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              {/* Organization Name Field with Debounced Uniqueness Check */}
              <form.Field
                name="name"
                asyncDebounceMs={300}
                validators={{
                  onChange: ({ value }) => {
                    // Sync validation first
                    const result = organizationNameSchema.safeParse(value);
                    if (!result.success) {
                      return result.error.errors[0]?.message;
                    }
                    return undefined;
                  },
                  onChangeAsync: async ({ value }) => {
                    // Skip uniqueness check if sync validation fails
                    const syncResult = organizationNameSchema.safeParse(value);
                    if (!syncResult.success) {
                      return undefined;
                    }

                    // Debounced API call for uniqueness (per user decision - 300ms)
                    try {
                      const response = await fetcher<ApiResponse<CheckNameResponse>>(
                        `/organizations/check-name?name=${encodeURIComponent(value.trim())}`
                      );

                      if (!response.success) {
                        return "Unable to verify name availability";
                      }

                      if (!response.data?.available) {
                        return response.data?.suggestion
                          ? `Name already taken. Try "${response.data.suggestion}"?`
                          : "Name already taken";
                      }

                      return undefined;
                    } catch {
                      return "Unable to verify name availability";
                    }
                  },
                }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  const isValidating = field.state.meta.isValidating;
                  const isValid =
                    field.state.meta.isTouched &&
                    field.state.meta.isValid &&
                    field.state.value.length >= 2;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Organization Name</FieldLabel>
                      <div className="relative">
                        <Input
                          id={field.name}
                          name={field.name}
                          type="text"
                          placeholder="Enter organization name"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          disabled={isLoading}
                          className={cn("h-11 pr-10")}
                          aria-invalid={isInvalid}
                        />
                        {/* Status indicator in input */}
                        <div className="absolute top-1/2 right-3 -translate-y-1/2">
                          {isValidating && (
                            <Loader2 className="text-muted-foreground size-4 animate-spin" />
                          )}
                          {!isValidating && isValid && <Check className="size-4 text-green-600" />}
                          {!isValidating && isInvalid && <X className="text-destructive size-4" />}
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        2-50 characters. Letters, numbers, spaces, and hyphens only.
                      </p>
                      {isInvalid && (
                        <FieldError
                          errors={field.state.meta.errors.map((err) => ({
                            message: typeof err === "string" ? err : String(err),
                          }))}
                        />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              {/* Error Message */}
              {error && <p className="text-destructive text-center text-sm">{error}</p>}

              {/* Submit Button */}
              <Button type="submit" disabled={isLoading} className="h-11 w-full">
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : isEditMode ? (
                  "Continue"
                ) : (
                  "Create Organization"
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupOrganizationPage;
