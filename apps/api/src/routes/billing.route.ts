import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { subscriptionCheckoutSchema, contactSalesSchema } from "@klayim/shared/schemas";
import type { ApiResponse, SubscriptionCheckoutResponse, ContactSalesRequest } from "@klayim/shared/types";
import { billingService } from "@/services/index.js";
import { authMiddleware } from "@/middleware/index.js";

const billing = new Hono();

// Extended checkout schema that includes organizationId
const billingCheckoutSchema = subscriptionCheckoutSchema.extend({
  organizationId: z.string().min(1, "Organization ID is required"),
});

// POST /billing/checkout - Create checkout session (requires auth)
billing.post(
  "/checkout",
  authMiddleware,
  zValidator("json", billingCheckoutSchema),
  async (c) => {
    const userId = c.get("userId");

    if (!userId) {
      return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
    }

    const { organizationId, ...checkoutInput } = c.req.valid("json");
    const result = await billingService.createCheckoutSession(checkoutInput, userId, organizationId);

    if ("error" in result) {
      return c.json<ApiResponse<null>>({ success: false, error: result.error }, 400);
    }

    return c.json<ApiResponse<SubscriptionCheckoutResponse>>({
      success: true,
      data: {
        checkoutUrl: result.url!,
        sessionId: result.id,
      },
    });
  }
);

// POST /billing/contact-sales - Enterprise contact request (no auth required)
billing.post(
  "/contact-sales",
  zValidator("json", contactSalesSchema),
  async (c) => {
    const input = c.req.valid("json") as ContactSalesRequest;
    await billingService.submitContactSalesRequest(input);

    return c.json<ApiResponse<null>>({
      success: true,
      message: "Contact request submitted successfully",
    });
  }
);

export { billing as billingRoutes };
