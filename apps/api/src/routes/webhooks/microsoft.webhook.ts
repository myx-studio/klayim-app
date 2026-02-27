import { Hono } from "hono";
import { webhookQueueService } from "@/services/webhook-queue.service.js";

export const microsoftWebhook = new Hono();

// Microsoft Graph validation and notification endpoint
microsoftWebhook.post("/", async (c) => {
  // Handle validation request from Microsoft
  const validationToken = c.req.query("validationToken");
  if (validationToken) {
    // Must respond with the token in plain text
    return c.text(validationToken, 200);
  }

  const body = await c.req.text();
  let payload: {
    value?: Array<{
      clientState?: string;
      subscriptionId?: string;
      changeType?: string;
    }>;
  };

  try {
    payload = JSON.parse(body);
  } catch {
    console.error("Invalid Microsoft webhook JSON");
    return c.text("Invalid JSON", 400);
  }

  // Process each notification in the batch
  const notifications = payload.value || [];

  for (const notification of notifications) {
    const clientState = notification.clientState;
    const subscriptionId = notification.subscriptionId;

    if (!clientState || !subscriptionId) {
      console.error("Missing clientState or subscriptionId");
      continue;
    }

    // clientState format: {organizationId}:{secret}
    const [organizationId, secret] = clientState.split(":");
    if (!organizationId) {
      console.error("Invalid clientState format");
      continue;
    }

    // TODO: Verify against stored secret in integration (Phase 5)

    // Queue for processing
    await webhookQueueService.enqueue({
      provider: "microsoft",
      eventId: `${subscriptionId}-${notification.changeType}-${Date.now()}`,
      payload: JSON.stringify(notification),
      headers: {},
      organizationId,
    });
  }

  // Microsoft expects 202 Accepted
  return c.text("", 202);
});
