/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/pages/auth/verify-email/index.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-26
 ** github: @aiqbalsyah
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { getErrorMessage } from "@/lib/utils";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const VerifyEmailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: otp }),
      });

      const data = await response.json();

      if (data.success && data.data?.loginToken) {
        // Auto-login with the loginToken
        const result = await signIn("credentials", {
          loginToken: data.data.loginToken,
          redirect: false,
        });

        if (result?.ok) {
          // Redirect to onboarding to complete profile
          router.push("/onboarding/account-details");
        } else {
          setError("Failed to sign in. Please try logging in manually.");
          setIsLoading(false);
        }
      } else {
        setError(getErrorMessage(data.error));
        setIsLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
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
            <h1 className="text-2xl font-semibold">We&apos;ve emailed you a code</h1>
            <p className="text-muted-foreground text-sm">
              To complete your account setup, enter the code we sent to:
              <br />
              <span className="text-foreground font-medium">{email}</span>
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-6">
          {/* OTP Input */}
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

          {/* Error Message */}
          {error && <p className="text-destructive text-center text-sm">{error}</p>}

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={otp.length !== 6 || isLoading}
            className="h-11 w-full"
          >
            Verify
          </Button>

          {/* Resend Link */}
          <p className="text-muted-foreground text-center text-sm">
            Didn&apos;t receive an email?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-foreground font-medium hover:underline disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend email"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
