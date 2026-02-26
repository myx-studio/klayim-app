import { z } from "zod";
import { planTypeSchema } from "./organization.js";

// Schema for checkout plans (excludes free and enterprise)
export const checkoutPlanTypeSchema = z.enum(["starter", "professional"]);

// Re-export the subscription checkout schema as billing checkout
export { subscriptionCheckoutSchema as createCheckoutSessionSchema } from "./subscription.js";

export const contactSalesSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  message: z.string().optional(),
});

export const createPortalSessionSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  returnUrl: z.string().url("Invalid return URL"),
});

export type ContactSalesInput = z.infer<typeof contactSalesSchema>;
export type CreatePortalSessionInput = z.infer<typeof createPortalSessionSchema>;
export type CheckoutPlanType = z.infer<typeof checkoutPlanTypeSchema>;
