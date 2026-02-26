"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { organizationNameSchema } from "@klayim/shared/schemas";
import { useForm } from "@tanstack/react-form";
import { Check, Loader2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { env } from "next-runtime-env";

const SetupOrganizationPage = () => {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      setError(null);

      try {
        const apiUrl = env("NEXT_PUBLIC_API_URL");
        const response = await fetch(`${apiUrl}/api/v1/organizations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: value.name.trim(),
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Update session with new organization
          await updateSession();
          // Redirect to plan selection (Phase 2)
          router.push("/onboarding/plan-selection");
        } else {
          setError(data.error || "Failed to create organization");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <Card className="w-full border px-2">
      <CardHeader className="flex flex-col items-center gap-4 text-center">
        <Link
          href="/"
          className="flex flex-col items-center justify-center gap-2"
        >
          <Image
            src="/images/logo/symbol.svg"
            alt="Klayim"
            width={32}
            height={32}
          />
          <Image
            src="/images/logo/text.svg"
            alt="Klayim"
            width={140}
            height={40}
          />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Create Your Organization</h1>
          <p className="text-muted-foreground text-sm">
            Set up your workspace to get started
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
                    const apiUrl = env("NEXT_PUBLIC_API_URL");
                    const response = await fetch(
                      `${apiUrl}/api/v1/organizations/check-name?name=${encodeURIComponent(value.trim())}`,
                      { credentials: "include" }
                    );
                    const data = await response.json();

                    if (!data.success) {
                      return "Unable to verify name availability";
                    }

                    if (!data.data.available) {
                      return data.data.suggestion
                        ? `Name already taken. Try "${data.data.suggestion}"?`
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
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const isValidating = field.state.meta.isValidating;
                const isValid =
                  field.state.meta.isTouched &&
                  field.state.meta.isValid &&
                  field.state.value.length >= 2;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Organization Name
                    </FieldLabel>
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
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isValidating && (
                          <Loader2 className="text-muted-foreground size-4 animate-spin" />
                        )}
                        {!isValidating && isValid && (
                          <Check className="size-4 text-green-600" />
                        )}
                        {!isValidating && isInvalid && (
                          <X className="text-destructive size-4" />
                        )}
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      2-50 characters. Letters, numbers, spaces, and hyphens
                      only.
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
            {error && (
              <p className="text-destructive text-center text-sm">{error}</p>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={isLoading} className="h-11 w-full">
              {isLoading ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Creating...
                </>
              ) : (
                "Create Organization"
              )}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default SetupOrganizationPage;
