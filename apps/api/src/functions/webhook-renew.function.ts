import { integrationRepository } from "@/repositories/integration.repository.js";
import { syncStateRepository } from "@/repositories/sync-state.repository.js";
import { tokenRefreshService } from "@/services/token-refresh.service.js";
import { googleCalendarService } from "@/services/google-calendar.service.js";
import { microsoftCalendarService } from "@/services/microsoft-calendar.service.js";
import type { Integration } from "@klayim/shared/types";

/**
 * Webhook Renew Function
 *
 * Scheduled function that runs every 12 hours to check and renew
 * webhook subscriptions before they expire.
 *
 * - Google: Webhooks cannot be renewed, must be re-registered
 * - Microsoft: Webhooks can be renewed via PATCH
 *
 * In production, this would be triggered by:
 * - Cloud Scheduler
 * - Firebase Functions scheduled trigger
 * - Cron job
 */
export interface WebhookRenewResult {
  renewed: number;
  failed: number;
  errors: string[];
  duration: number;
}

/**
 * Buffer time before expiration to trigger renewal (24 hours)
 */
const RENEWAL_BUFFER_MS = 24 * 60 * 60 * 1000;

/**
 * Find and renew expiring webhook subscriptions
 */
export async function webhookRenewFunction(): Promise<WebhookRenewResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let renewed = 0;
  let failed = 0;

  console.log("[WebhookRenew] Starting renewal check");

  try {
    // Find all connected calendar integrations
    const googleIntegrations = await integrationRepository.findAllConnectedByProvider("google_calendar");
    const microsoftIntegrations = await integrationRepository.findAllConnectedByProvider("microsoft_calendar");

    const threshold = new Date(Date.now() + RENEWAL_BUFFER_MS).toISOString();

    // Process Google integrations (re-register webhooks)
    for (const integration of googleIntegrations) {
      const syncState = await syncStateRepository.findByIntegration(integration.id);
      if (!syncState?.webhookExpiration) continue;

      if (syncState.webhookExpiration < threshold) {
        try {
          await renewGoogleWebhook(integration);
          renewed++;
          console.log(`[WebhookRenew] Renewed Google webhook for: ${integration.id}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          console.error(`[WebhookRenew] Failed to renew Google webhook ${integration.id}:`, message);
          errors.push(`Google ${integration.id}: ${message}`);
          failed++;
        }
      }
    }

    // Process Microsoft integrations (renew via PATCH)
    for (const integration of microsoftIntegrations) {
      const syncState = await syncStateRepository.findByIntegration(integration.id);
      if (!syncState?.webhookExpiration) continue;

      if (syncState.webhookExpiration < threshold) {
        try {
          await renewMicrosoftWebhook(integration);
          renewed++;
          console.log(`[WebhookRenew] Renewed Microsoft webhook for: ${integration.id}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          console.error(`[WebhookRenew] Failed to renew Microsoft webhook ${integration.id}:`, message);
          errors.push(`Microsoft ${integration.id}: ${message}`);
          failed++;
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[WebhookRenew] Fatal error:", message);
    errors.push(`Fatal: ${message}`);
  }

  const duration = Date.now() - startTime;
  console.log(
    `[WebhookRenew] Completed: ${renewed} renewed, ${failed} failed, ${duration}ms`
  );

  return {
    renewed,
    failed,
    errors,
    duration,
  };
}

/**
 * Renew Google webhook by re-registering (Google doesn't support renewal)
 */
async function renewGoogleWebhook(integration: Integration): Promise<void> {
  // Get valid access token
  const accessToken = await tokenRefreshService.getValidToken(integration.id);

  // Get existing sync state for resourceId
  const syncState = await syncStateRepository.findByIntegration(integration.id);

  // Stop old webhook if we have channel info
  if (syncState?.webhookChannelId && syncState?.webhookResourceId) {
    try {
      await googleCalendarService.stopWebhook(
        accessToken,
        syncState.webhookChannelId,
        syncState.webhookResourceId
      );
    } catch (error) {
      // Ignore errors stopping old webhook - it may have already expired
      console.warn("[WebhookRenew] Could not stop old Google webhook:", error);
    }
  }

  // Register new webhook
  const webhook = await googleCalendarService.registerWebhook(
    accessToken,
    integration.organizationId,
    integration.id
  );

  // Update integration with new channel ID and secret
  await integrationRepository.update(integration.id, {
    webhookChannelId: webhook.channelId,
    webhookSecret: webhook.secret,
  });

  // Update sync state with new expiration
  await syncStateRepository.updateWebhookState(integration.id, {
    channelId: webhook.channelId,
    resourceId: webhook.resourceId,
    expiration: webhook.expiration,
  });
}

/**
 * Renew Microsoft webhook by extending expiration via PATCH
 */
async function renewMicrosoftWebhook(integration: Integration): Promise<void> {
  if (!integration.subscriptionId) {
    throw new Error("No subscriptionId found for Microsoft integration");
  }

  // Get valid access token
  const accessToken = await tokenRefreshService.getValidToken(integration.id);

  // Renew webhook subscription
  const result = await microsoftCalendarService.renewWebhook(
    accessToken,
    integration.subscriptionId
  );

  // Update sync state with new expiration
  await syncStateRepository.updateWebhookState(integration.id, {
    expiration: result.expiration,
  });
}

// Export for use as a scheduled function handler
export default webhookRenewFunction;
