/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/pages/auth/reset-password/index.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-26
 ** github: @aiqbalsyah
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { getErrorMessage } from "@/lib/utils";
import { passwordSchema } from "@klayim/shared/schemas";
import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      password: "",
    },
    onSubmit: async ({ value }) => {
      if (otp.length !== 6) {
        setError("Please enter the complete 6-digit code");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            token: otp,
            password: value.password,
          }),
        });

        const data = await response.json();

        if (data.success) {
          router.push("/auth/signin?reset=success");
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

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(getErrorMessage(data.error));
      }
    } catch {
      setError("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border px-2">
        <CardHeader className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex flex-col items-center justify-center gap-2">
            <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
          </Link>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Reset your password</h1>
            <p className="text-muted-foreground text-sm">
              Enter the code we sent to:
              <br />
              <span className="text-foreground font-medium">{email}</span>
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* OTP Input */}
          <div className="flex flex-col items-center gap-2">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
              disabled={isLoading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* New Password Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              {/* Password Field */}
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    const result = passwordSchema.safeParse(value);
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
                      <FieldLabel htmlFor={field.name}>New Password</FieldLabel>
                      <InputGroup className="h-11">
                        <InputGroupInput
                          id={field.name}
                          name={field.name}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your new password"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          disabled={isLoading}
                          aria-invalid={isInvalid}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            type="button"
                            size="icon-sm"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
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
                    disabled={!canSubmit || otp.length !== 6 || isLoading || isSubmitting}
                    className="h-11 w-full"
                  >
                    Reset Password
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>

          {/* Resend Link */}
          <p className="text-muted-foreground text-center text-sm">
            Didn&apos;t receive a code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-foreground font-medium hover:underline disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          </p>

          {/* Back to Sign In */}
          <p className="text-muted-foreground text-center text-sm">
            <Link href="/auth/signin" className="text-primary hover:underline">
              Back to Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
