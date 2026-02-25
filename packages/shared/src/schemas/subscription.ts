import { z } from "zod";
import { planTypeSchema } from "./organization.js";

export const subscriptionCheckoutSchema = z.object({
  planType: planTypeSchema,
  successUrl: z.string().url("Invalid success URL"),
  cancelUrl: z.string().url("Invalid cancel URL"),
});

export const planChangeSchema = z.object({
  newPlanType: planTypeSchema,
});

export type SubscriptionCheckoutInput = z.infer<typeof subscriptionCheckoutSchema>;
export type PlanChangeInput = z.infer<typeof planChangeSchema>;
