import { Hono } from "hono";
import { googleWebhook } from "./google.webhook.js";
import { microsoftWebhook } from "./microsoft.webhook.js";

export const webhooksRoute = new Hono();

// Mount provider-specific webhook routes
webhooksRoute.route("/google", googleWebhook);
webhooksRoute.route("/microsoft", microsoftWebhook);

// Future providers will be added in Phase 6/7:
// webhooksRoute.route("/bamboohr", bamboohrWebhook);
// webhooksRoute.route("/finch", finchWebhook);
// webhooksRoute.route("/asana", asanaWebhook);
// webhooksRoute.route("/clickup", clickupWebhook);
// webhooksRoute.route("/linear", linearWebhook);
