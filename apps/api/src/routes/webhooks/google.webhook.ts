import { Hono } from "hono";
import { webhookQueueService } from "@/services/webhook-queue.service.js";

export const googleWebhook = new Hono();

googleWebhook.post("/", async (c) => {
  const channelId = c.req.header("X-Goog-Channel-ID");
  const channelToken = c.req.header("X-Goog-Channel-Token");
  const resourceState = c.req.header("X-Goog-Resource-State");
  const messageNumber = c.req.header("X-Goog-Message-Number");

  // Sync message on subscription creation - just acknowledge
  if (resourceState === "sync") {
    return c.text("", 200);
  }

  // Validate channel token exists
  if (!channelId || !channelToken) {
    console.error("Missing Google webhook headers");
    return c.text("Missing headers", 400);
  }

  // Channel token format: {organizationId}:{secret}
  const [organizationId, secret] = channelToken.split(":");
  if (!organizationId || !secret) {
    console.error("Invalid channel token format");
    return c.text("Invalid token", 401);
  }

  // TODO: Verify against stored webhook secret in integration (Phase 5)
  // For now, trust the token format (basic validation)

  const body = await c.req.text();

  // Queue immediately - respond within 3 seconds per Google requirements
  await webhookQueueService.enqueue({
    provider: "google",
    eventId: `${channelId}-${messageNumber}`,
    payload: body,
    headers: {
      "X-Goog-Channel-ID": channelId,
      "X-Goog-Resource-State": resourceState || "",
      "X-Goog-Message-Number": messageNumber || "",
    },
    organizationId,
  });

  return c.text("", 200);
});
