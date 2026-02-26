"use client";

import { useRecaptcha } from "@/components/providers/recaptcha-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, getErrorMessage } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

type FormStatus = "idle" | "loading" | "success" | "error";

const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const { executeRecaptcha, isLoaded } = useRecaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus("error");
      setMessage("Please enter your email address");
      return;
    }

    setStatus("loading");

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha("newsletter_subscribe");

      if (!recaptchaToken) {
        setStatus("error");
        setMessage("reCAPTCHA verification failed. Please try again.");
        return;
      }

      // Submit to API
      const response = await fetch("/api/v1/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        setEmail("");
      } else {
        setStatus("error");
        setMessage(getErrorMessage(data.error));
      }
    } catch (error) {
      setStatus("error");
      setMessage("Failed to subscribe. Please try again later.");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-primary-yellow/20 flex w-full items-center justify-center gap-3 rounded-xl p-6">
        <CheckCircle2 className="size-6 text-emerald-500" />
        <p className="font-medium">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(
            "h-12 flex-1 rounded-xl border-2 bg-white px-4",
            status === "error" && "border-red-500"
          )}
          disabled={status === "loading"}
        />
        <Button
          type="submit"
          size="lg"
          className="h-12 rounded-xl px-8"
          disabled={status === "loading" || !isLoaded}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Subscribing...
            </>
          ) : (
            "Notify Me"
          )}
        </Button>
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="size-4" />
          <span>{message}</span>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        We respect your privacy. Unsubscribe at any time.
      </p>

      {!isLoaded && (
        <p className="text-muted-foreground text-xs">Loading security verification...</p>
      )}
    </form>
  );
};

export default NewsletterForm;
