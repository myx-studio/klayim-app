import { newsletterRepository } from "../repositories/newsletter.repository.js";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "";
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
}

export const newsletterService = {
  async verifyRecaptcha(token: string): Promise<{ success: boolean; score?: number }> {
    if (!RECAPTCHA_SECRET_KEY) {
      console.warn("RECAPTCHA_SECRET_KEY not configured, skipping verification");
      return { success: true, score: 1 };
    }

    try {
      const response = await fetch(RECAPTCHA_VERIFY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: RECAPTCHA_SECRET_KEY,
          response: token,
        }),
      });

      const data = (await response.json()) as RecaptchaResponse;

      // For reCAPTCHA v3, score is between 0.0 and 1.0
      // 1.0 is very likely a good interaction, 0.0 is very likely a bot
      if (data.success && data.score !== undefined) {
        return { success: data.score >= 0.5, score: data.score };
      }

      return { success: data.success };
    } catch (error) {
      console.error("reCAPTCHA verification failed:", error);
      return { success: false };
    }
  },

  async subscribe(
    email: string,
    recaptchaToken: string,
    source: string = "website"
  ): Promise<{ success: boolean; message: string; alreadySubscribed?: boolean }> {
    // Verify reCAPTCHA first
    const recaptchaResult = await this.verifyRecaptcha(recaptchaToken);
    if (!recaptchaResult.success) {
      return {
        success: false,
        message: "reCAPTCHA verification failed. Please try again.",
      };
    }

    // Check if already subscribed
    const existing = await newsletterRepository.findByEmail(email);

    if (existing) {
      if (existing.isActive) {
        return {
          success: true,
          message: "You're already subscribed to our newsletter!",
          alreadySubscribed: true,
        };
      }

      // Reactivate if previously unsubscribed
      await newsletterRepository.reactivate(existing.id);
      return {
        success: true,
        message: "Welcome back! Your subscription has been reactivated.",
      };
    }

    // Create new subscription
    await newsletterRepository.create(email, source);

    return {
      success: true,
      message: "Thank you for subscribing! We'll keep you updated.",
    };
  },
};
