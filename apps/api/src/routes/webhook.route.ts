import { Hono } from "hono";
import { getStripe } from "@/lib/stripe.js";
import { webhookService } from "@/services/index.js";

const webhooks = new Hono();

// POST /webhooks/stripe - Stripe webhook handler
// CRITICAL: No auth middleware - Stripe sends these requests
// CRITICAL: Use text() to get raw body for signature verification
webhooks.post("/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    console.error("Missing Stripe signature header");
    return c.text("Missing signature", 400);
  }

  // CRITICAL: Must use text() not json() for signature verification
  const body = await c.req.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return c.text("Invalid signature", 400);
  }

  // Process webhook - errors logged but always return 200 to prevent retries
  try {
    await webhookService.processStripeEvent(event);
  } catch (err) {
    console.error("Error processing webhook:", err);
    // Still return 200 - error logged for investigation
    // Returning non-200 causes Stripe to retry, which may cause duplicate processing issues
  }

  return c.text("", 200);
});

export { webhooks as webhookRoutes };
