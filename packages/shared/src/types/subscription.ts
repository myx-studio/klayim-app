import type { Timestamps } from "./common.js";
import type { PlanType } from "./organization.js";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface PaymentRecord extends Timestamps {
  id: string;
  organizationId: string;
  planId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  paidAt?: string;
  failedAt?: string;
  refundedAt?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionCheckoutInput {
  planType: PlanType;
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface PlanChangeInput {
  newPlanType: PlanType;
}

export interface PaymentHistoryParams {
  organizationId: string;
  limit?: number;
  cursor?: string;
}
