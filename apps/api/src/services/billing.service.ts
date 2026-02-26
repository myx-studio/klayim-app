import { stripe } from "@/lib/stripe.js";
import type { SubscriptionCheckoutInput, ContactSalesRequest } from "@klayim/shared/types";
import type { CreatePortalSessionInput } from "@klayim/shared/schemas";
import type Stripe from "stripe";

// Map plan types to Stripe Price IDs from environment
const PRICE_MAP: Record<"starter" | "professional", string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL,
};

class BillingService {
  async createCheckoutSession(
    input: SubscriptionCheckoutInput,
    userId: string,
    organizationId: string
  ): Promise<Stripe.Checkout.Session | { error: string }> {
    // Validate plan type (only starter and professional can use checkout)
    if (input.planType !== "starter" && input.planType !== "professional") {
      return { error: `Plan type ${input.planType} is not available for checkout` };
    }

    const priceId = PRICE_MAP[input.planType];

    if (!priceId) {
      return { error: `Price ID not configured for plan: ${input.planType}` };
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: input.cancelUrl,
        metadata: {
          organizationId,
          userId,
          planType: input.planType,
        },
        subscription_data: {
          metadata: {
            organizationId,
            userId,
            planType: input.planType,
          },
        },
      });

      return session;
    } catch (err) {
      console.error("Stripe checkout session error:", err);
      return { error: "Failed to create checkout session" };
    }
  }

  async createPortalSession(
    input: CreatePortalSessionInput,
    customerId: string
  ): Promise<Stripe.BillingPortal.Session | { error: string }> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: input.returnUrl,
      });
      return session;
    } catch (err) {
      console.error("Stripe portal session error:", err);
      return { error: "Failed to create portal session" };
    }
  }

  async submitContactSalesRequest(input: ContactSalesRequest): Promise<void> {
    // For v1, log to console. In future, store in Firestore or send to CRM
    console.log("Enterprise contact request:", JSON.stringify(input, null, 2));
    // TODO: Store in Firestore enterprise_leads collection
  }
}

export const billingService = new BillingService();
