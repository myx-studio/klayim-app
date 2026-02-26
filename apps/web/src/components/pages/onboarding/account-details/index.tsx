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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  nameSchema,
  onboardingPasswordSchema,
  PASSWORD_REQUIREMENTS,
} from "@klayim/shared/schemas";
import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff, Check, Circle } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { env } from "next-runtime-env";

// Password Checklist Component
const PasswordChecklist = ({ password }: { password: string }) => {
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = req.test(password);
        return (
          <li
            key={req.id}
            className={cn(
              "flex items-center gap-2 text-sm",
              met ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {met ? <Check className="size-4" /> : <Circle className="size-4" />}
            {req.label}
          </li>
        );
      })}
    </ul>
  );
};

// Password Match Indicator Component
const PasswordMatchIndicator = ({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword: string;
}) => {
  if (confirmPassword.length === 0) return null;

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1 text-sm",
        passwordsMatch ? "text-green-600" : "text-destructive"
      )}
    >
      {passwordsMatch ? (
        <>
          <Check className="size-4" /> Passwords match
        </>
      ) : (
        <>
          <Circle className="size-4" /> Passwords do not match
        </>
      )}
    </p>
  );
};

const AccountDetailsPage = () => {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      setError(null);

      try {
        const apiUrl = env("NEXT_PUBLIC_API_URL");
        const response = await fetch(`${apiUrl}/api/v1/auth/complete-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: value.name,
            password: value.password,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Update session to reflect completed profile
          await updateSession();
          router.push("/onboarding/setup-organization");
        } else {
          setError(data.error || "Failed to complete profile");
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
          <h1 className="text-xl font-semibold">Complete Your Account</h1>
          <p className="text-muted-foreground text-sm">
            Enter your details to get started
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Display email (read-only per user decision) */}
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            value={session?.user?.email || ""}
            disabled
            className="h-11 bg-muted"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Email verified and cannot be changed
          </p>
        </Field>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            {/* Full Name Field */}
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  const result = nameSchema.safeParse(value);
                  if (!result.success) {
                    return result.error.errors[0]?.message;
                  }
                  return undefined;
                },
              }}
            >
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      placeholder="Enter your full name"
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

            {/* Password Field with Live Checklist - wrapped in Subscribe for real-time updates */}
            <form.Subscribe
              selector={(state) => [
                state.values.password,
                state.values.confirmPassword,
              ]}
            >
              {([passwordValue, confirmPasswordValue]) => (
                <>
                  {/* Password Field */}
                  <form.Field
                    name="password"
                    validators={{
                      onChange: ({ value }) => {
                        const result = onboardingPasswordSchema.safeParse(value);
                        if (!result.success) {
                          // Don't show error message here - use checklist instead
                          return undefined;
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                        <InputGroup className="h-11">
                          <InputGroupInput
                            id={field.name}
                            name={field.name}
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            disabled={isLoading}
                          />
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton
                              type="button"
                              size="icon-sm"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={
                                showPassword
                                  ? "Hide password"
                                  : "Show password"
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </InputGroupButton>
                          </InputGroupAddon>
                        </InputGroup>

                        {/* Live Password Checklist (per user decision) */}
                        <PasswordChecklist password={passwordValue as string} />
                      </Field>
                    )}
                  </form.Field>

                  {/* Confirm Password Field with Live Match Indicator */}
                  <form.Field
                    name="confirmPassword"
                    validators={{
                      onChange: ({ value }) => {
                        if (value.length > 0 && value !== passwordValue) {
                          return "Passwords do not match";
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Confirm Password
                          </FieldLabel>
                          <InputGroup className="h-11">
                            <InputGroupInput
                              id={field.name}
                              name={field.name}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              value={field.state.value}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              onBlur={field.handleBlur}
                              disabled={isLoading}
                              aria-invalid={isInvalid}
                            />
                            <InputGroupAddon align="inline-end">
                              <InputGroupButton
                                type="button"
                                size="icon-sm"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                                aria-label={
                                  showConfirmPassword
                                    ? "Hide password"
                                    : "Show password"
                                }
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </InputGroupButton>
                            </InputGroupAddon>
                          </InputGroup>

                          {/* Live Match Indicator (per user decision) */}
                          <PasswordMatchIndicator
                            password={passwordValue as string}
                            confirmPassword={confirmPasswordValue as string}
                          />
                        </Field>
                      );
                    }}
                  </form.Field>
                </>
              )}
            </form.Subscribe>

            {/* Error Message */}
            {error && (
              <p className="text-destructive text-center text-sm">{error}</p>
            )}

            {/* Submit Button - Always enabled per user decision */}
            <Button type="submit" disabled={isLoading} className="h-11 w-full">
              {isLoading ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default AccountDetailsPage;
