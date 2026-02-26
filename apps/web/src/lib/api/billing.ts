import { fetcher } from "@/lib/fetcher";
import type {
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  ContactSalesRequest,
} from "@klayim/shared";

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  input: CheckoutSessionRequest & { organizationId: string }
): Promise<CheckoutSessionResponse> {
  return fetcher<CheckoutSessionResponse>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Submit a contact sales request for enterprise plans
 */
export async function contactSales(input: ContactSalesRequest): Promise<void> {
  await fetcher<{ message: string }>("/billing/contact-sales", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
