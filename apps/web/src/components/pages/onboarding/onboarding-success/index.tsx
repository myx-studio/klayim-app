"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const OnboardingSuccessPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name || "there";

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  // What happens next items
  const nextSteps = [
    "Your dashboard will populate with data within 24 hours",
    "Meeting costs are calculated automatically",
    "High-cost meetings will route to you for approval",
    "You'll receive weekly governance summaries",
  ];

  return (
    <div className="mx-auto max-w-xl py-8">
      {/* Logo */}
      <div className="mb-8 flex justify-center">
        <Link href="/" className="flex flex-col items-center justify-center gap-2">
          <Image src="/images/logo/symbol.svg" alt="Klayim" width={48} height={48} />
        </Link>
      </div>

      {/* Welcome Message */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Welcome to Klayim, {userName}!</h1>
        <p className="text-muted-foreground line-through">
          Let's get you set up in 3 quick steps
        </p>
        <p className="mt-1 text-emerald-600 font-medium">Setup complete!</p>
      </div>

      {/* What happens next Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">What happens next</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-3 w-3 text-emerald-600" />
                </div>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Go to Dashboard Button */}
      <Button onClick={handleGoToDashboard} className="h-11 w-full">
        Go to Dashboard
      </Button>
    </div>
  );
};

export default OnboardingSuccessPage;
