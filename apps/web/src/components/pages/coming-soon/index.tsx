"use client";

import { FadeIn } from "@/components/motion";
import { RecaptchaProvider } from "@/components/providers/recaptcha-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import NewsletterForm from "./newsletter-form";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

const ComingSoonPage = () => {
  // Debug: log if reCAPTCHA key is missing
  if (!RECAPTCHA_SITE_KEY) {
    console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set");
  }

  return (
    <RecaptchaProvider siteKey={RECAPTCHA_SITE_KEY}>
      <div
        className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-16"
        style={{
          background: "url('/images/bg-particle.png') repeat",
        }}
      >
        <div className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
          {/* Logo */}
          <FadeIn>
            <Link href="/">
              <Image src="/images/logo/full.svg" alt="Klayim" width={150} height={40} />
            </Link>
          </FadeIn>

          {/* Title */}
          <FadeIn delay={0.1}>
            <h1 className="text-4xl font-semibold md:text-5xl lg:text-6xl">Coming Soon</h1>
          </FadeIn>

          {/* Description */}
          <FadeIn delay={0.2}>
            <p className="text-muted-foreground text-lg md:text-xl">
              We're working on something exciting. Track the ROI of your meetings and tasks with
              Klayim. Subscribe to be the first to know when we launch.
            </p>
          </FadeIn>

          {/* Newsletter Form */}
          <FadeIn delay={0.3} className="w-full">
            <NewsletterForm />
          </FadeIn>

          {/* Back to Home */}
          <FadeIn delay={0.4}>
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link href="/">← Back to Home</Link>
            </Button>
          </FadeIn>
        </div>
      </div>
    </RecaptchaProvider>
  );
};

export default ComingSoonPage;
