import type { PlanType } from "./organization.js";

// Re-export subscription checkout types for billing context
export type { SubscriptionCheckoutInput as CheckoutSessionRequest } from "./subscription.js";
export type { SubscriptionCheckoutResponse as CheckoutSessionResponse } from "./subscription.js";

// Additional billing-specific types

export interface ContactSalesRequest {
  organizationId: string;
  name: string;
  email: string;
  company: string;
  message?: string;
}

export interface PortalSessionRequest {
  organizationId: string;
  returnUrl: string;
}

export interface PortalSessionResponse {
  portalUrl: string;
}

// Stripe-specific plan type for checkout (excludes free and enterprise)
export type CheckoutPlanType = Exclude<PlanType, "free" | "enterprise">;
