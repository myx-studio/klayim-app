import { z } from "zod";

export const newsletterSubscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  recaptchaToken: z.string().min(1, "reCAPTCHA verification required"),
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;
