"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PaymentStatus = "loading" | "success" | "failed";

const PaymentSuccessPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;

    if (!sessionId) {
      setStatus("failed");
      return;
    }

    hasProcessed.current = true;

    const verifyAndUpdateSession = async () => {
      try {
        await updateSession({ activePlan: "active" });
        setStatus("success");
      } catch (error) {
        console.error("Failed to update session:", error);
        setStatus("success");
      }
    };

    verifyAndUpdateSession();
  }, [sessionId, updateSession]);

  const handleContinue = () => {
    router.push("/onboarding/overview");
  };

  const handleRetry = () => {
    router.push("/onboarding/plan-selection");
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md">
        <Card className="w-full border px-2">
          <CardHeader className="flex flex-col items-center gap-4 text-center">
            <Link href="/" className="flex flex-col items-center justify-center gap-2">
              <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 py-8">
            <Spinner className="size-12" />
            <div className="text-center">
              <h1 className="text-xl font-semibold">Processing Payment</h1>
              <p className="text-muted-foreground text-sm">
                Please wait while we confirm your payment...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mx-auto max-w-md">
        <Card className="w-full border px-2">
          <CardHeader className="flex flex-col items-center gap-4 text-center">
            <Link href="/" className="flex flex-col items-center justify-center gap-2">
              <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 py-8">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="size-10 text-red-600" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold">Payment Failed</h1>
              <p className="text-muted-foreground text-sm">
                Something went wrong with your payment. Please try again.
              </p>
            </div>
            <Button onClick={handleRetry} className="h-11 w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="w-full border px-2">
        <CardHeader className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex flex-col items-center justify-center gap-2">
            <Image src="/images/logo/symbol.svg" alt="Klayim" width={32} height={32} />
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="size-10 text-green-600" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold">Payment Successful</h1>
            <p className="text-muted-foreground text-sm">
              Thank you for your purchase. Your plan has been activated.
            </p>
          </div>
          <Button onClick={handleContinue} className="h-11 w-full">
            Continue Setup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;
