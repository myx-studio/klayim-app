/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/pages/auth/signup/index.tsx
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
import { Separator } from "@/components/ui/separator";
import { useSignup } from "@/hooks/use-auth";
import { emailSchema } from "@klayim/shared/schemas";
import { useForm } from "@tanstack/react-form";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SignUpPage = () => {
  const router = useRouter();
  const signup = useSignup();

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      signup.mutate(value, {
        onSuccess: () => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(value.email)}`);
        },
      });
    },
  });

  const handleGoogleSignUp = async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  const isLoading = signup.isPending;
  const error = signup.error?.message || null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border px-2">
        <CardHeader className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex flex-col items-center justify-center gap-2">
            <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
            <Image src="/images/logo/text.svg" alt="Klayim" width={140} height={40} />
          </Link>
          <p className="text-foreground text-base">Track the ROI of your meetings and tasks</p>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Sign Up Form */}
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
                    Sign Up
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>

          {/* Sign In Link */}
          <p className="text-muted-foreground text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign In
            </Link>
          </p>

          {/* OR Divider */}
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs uppercase">Or</span>
            <Separator className="flex-1" />
          </div>

          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignUp}
              disabled={isLoading}
              className="h-11 w-full"
            >
              <GoogleIcon className="size-5" />
              Continue with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Google Icon Component
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default SignUpPage;
