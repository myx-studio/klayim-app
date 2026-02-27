import { fetcher } from "@/lib/fetcher";
import type {
  ApiResponse,
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
  const response = await fetcher<ApiResponse<CheckoutSessionResponse>>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to create checkout session");
  }

  return response.data;
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
