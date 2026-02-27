import {
  calendarSyncService,
} from "./calendar-sync.service.js";
import { integrationRepository } from "@/repositories/integration.repository.js";
import { syncStateRepository } from "@/repositories/sync-state.repository.js";
import {
  webhookQueueRepository,
  type WebhookQueueItem,
} from "@/repositories/webhook-queue.repository.js";
import { webhookProcessedEventRepository } from "@/repositories/webhook-processed-event.repository.js";

/**
 * Result from processing queued notifications
 */
export interface ProcessQueueResult {
  processed: number;
  failed: number;
}

/**
 * Webhook Handler Service
 *
 * Processes queued webhook notifications from calendar providers.
 * Validates webhook secrets and triggers incremental sync for changed calendars.
 */
class WebhookHandlerService {
  /**
   * Process a Google Calendar webhook notification
   * Google notifications just signal "something changed" - no event details included
   *
   * @param queueItem - The queued webhook item to process
   */
  async processGoogleNotification(queueItem: WebhookQueueItem): Promise<void> {
    const { organizationId, headers } = queueItem;
    const channelId = headers["X-Goog-Channel-ID"];

    if (!channelId) {
      throw new Error("Missing X-Goog-Channel-ID header");
    }

    // Find integration by webhook channel ID
    const integrations = await integrationRepository.findByOrganization(organizationId);
    const integration = integrations.find(
      (i) => i.webhookChannelId === channelId && i.provider === "google_calendar"
    );

    if (!integration) {
      console.warn(`[WebhookHandler] No Google integration found for channel: ${channelId}`);
      return;
    }

    if (integration.status !== "connected") {
      console.warn(`[WebhookHandler] Integration not connected: ${integration.id}`);
      return;
    }

    console.log(`[WebhookHandler] Processing Google notification for integration: ${integration.id}`);

    // Trigger incremental sync
    await calendarSyncService.incrementalSync(integration.id);
  }

  /**
   * Process a Microsoft Calendar webhook notification
   * Microsoft notifications include change details, but we trigger full sync for simplicity
   *
   * @param queueItem - The queued webhook item to process
   */
  async processMicrosoftNotification(queueItem: WebhookQueueItem): Promise<void> {
    const { organizationId, payload } = queueItem;

    // Parse notification to get subscription ID
    let subscriptionId: string | undefined;
    try {
      const notification = JSON.parse(payload);
      subscriptionId = notification.subscriptionId;
    } catch {
      throw new Error("Failed to parse Microsoft notification payload");
    }

    if (!subscriptionId) {
      throw new Error("No subscriptionId in Microsoft notification");
    }

    // Find integration by subscription ID
    const integrations = await integrationRepository.findByOrganization(organizationId);
    const integration = integrations.find(
      (i) => i.subscriptionId === subscriptionId && i.provider === "microsoft_calendar"
    );

    if (!integration) {
      console.warn(`[WebhookHandler] No Microsoft integration found for subscription: ${subscriptionId}`);
      return;
    }

    if (integration.status !== "connected") {
      console.warn(`[WebhookHandler] Integration not connected: ${integration.id}`);
      return;
    }

    console.log(`[WebhookHandler] Processing Microsoft notification for integration: ${integration.id}`);

    // Trigger incremental sync
    await calendarSyncService.incrementalSync(integration.id);
  }

  /**
   * Process all queued webhook notifications
   *
   * @returns Number of processed and failed notifications
   */
  async processQueuedNotifications(): Promise<ProcessQueueResult> {
    const pending = await webhookQueueRepository.findPending();
    let processed = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        // Check idempotency
        const eventKey = `${item.provider}:${item.eventId}`;
        const existing = await webhookProcessedEventRepository.findById(eventKey);
        if (existing) {
          await webhookQueueRepository.markCompleted(item.id);
          processed++;
          continue;
        }

        await webhookQueueRepository.markProcessing(item.id);

        // Process based on provider
        switch (item.provider) {
          case "google":
            await this.processGoogleNotification(item);
            break;
          case "microsoft":
            await this.processMicrosoftNotification(item);
            break;
          default:
            console.warn(`[WebhookHandler] Unsupported provider: ${item.provider}`);
        }

        // Mark as processed for idempotency
        await webhookProcessedEventRepository.create({
          id: eventKey,
          type: item.provider,
          processedAt: new Date().toISOString(),
        });

        await webhookQueueRepository.markCompleted(item.id);
        processed++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[WebhookHandler] Failed to process ${item.id}:`, message);
        await webhookQueueRepository.markFailed(item.id, message);
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * Find integrations with webhooks expiring soon
   *
   * @param bufferHours - Hours before expiration to consider "expiring"
   * @returns List of sync states with expiring webhooks
   */
  async findExpiringWebhooks(bufferHours: number = 24) {
    const threshold = new Date(Date.now() + bufferHours * 60 * 60 * 1000).toISOString();

    // Query all sync states and filter by expiration
    // Note: In production, you might want a Firestore query for this
    const googleIntegrations = await integrationRepository.findExpiringWithin(
      bufferHours * 60 * 60 * 1000
    );

    const expiringStates: Array<{
      integrationId: string;
      provider: string;
      expiration: string;
    }> = [];

    for (const integration of googleIntegrations) {
      const syncState = await syncStateRepository.findByIntegration(integration.id);
      if (syncState?.webhookExpiration && syncState.webhookExpiration < threshold) {
        expiringStates.push({
          integrationId: integration.id,
          provider: integration.provider,
          expiration: syncState.webhookExpiration,
        });
      }
    }

    return expiringStates;
  }
}

export const webhookHandlerService = new WebhookHandlerService();
