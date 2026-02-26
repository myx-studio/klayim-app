"use client";

import { useMutation } from "@tanstack/react-query";
import { createCheckoutSession, contactSales } from "@/lib/api/billing";
import type { CheckoutSessionRequest, ContactSalesRequest } from "@klayim/shared";

/**
 * Hook for creating a Stripe checkout session
 */
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: (input: CheckoutSessionRequest & { organizationId: string }) =>
      createCheckoutSession(input),
  });
}

/**
 * Hook for submitting enterprise contact sales request
 */
export function useContactSales() {
  return useMutation({
    mutationFn: (input: ContactSalesRequest) => contactSales(input),
  });
}
