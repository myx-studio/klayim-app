/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/pages/auth/forgot-password/index.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-26
 ** github: @aiqbalsyah
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/utils";
import { emailSchema } from "@klayim/shared/schemas";
import { useForm } from "@tanstack/react-form";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ForgotPasswordPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        });

        const data = await response.json();

        if (data.success) {
          // Redirect to reset password page with email
          router.push(`/auth/reset-password?email=${encodeURIComponent(value.email)}`);
        } else {
          setError(getErrorMessage(data.error));
          setIsLoading(false);
        }
      } catch {
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border px-2">
        <CardHeader className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex flex-col items-center justify-center gap-2">
            <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
          </Link>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Forgot password?</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email address and we&apos;ll send you a code to reset your password.
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Forgot Password Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              {/* Email Field */}
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    const result = emailSchema.safeParse(value);
                    if (!result.success) {
                      return result.error.errors[0]?.message;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        placeholder="Enter your email"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={isLoading}
                        className="h-11"
                        aria-invalid={isInvalid}
                      />
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
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || isLoading || isSubmitting}
                    className="h-11 w-full"
                  >
                    Send Reset Code
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>

          {/* Back to Sign In */}
          <p className="text-muted-foreground text-center text-sm">
            Remember your password?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
