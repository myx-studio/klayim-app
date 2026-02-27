import {
  webhookQueueRepository,
  type WebhookProvider,
  type WebhookQueueItem,
} from "@/repositories/webhook-queue.repository.js";
import { webhookProcessedEventRepository } from "@/repositories/webhook-processed-event.repository.js";

interface EnqueueInput {
  provider: WebhookProvider;
  eventId: string;
  payload: string;
  headers: Record<string, string>;
  organizationId: string;
}

class WebhookQueueService {
  async enqueue(input: EnqueueInput): Promise<WebhookQueueItem> {
    return webhookQueueRepository.create({
      provider: input.provider,
      eventId: input.eventId,
      payload: input.payload,
      headers: input.headers,
      organizationId: input.organizationId,
      status: "pending",
      retryCount: 0,
      maxRetries: 5,
      nextRetryAt: null,
      lastError: null,
    });
  }

  async process(item: WebhookQueueItem): Promise<void> {
    // Check idempotency - has this event already been processed?
    const existing = await webhookProcessedEventRepository.findById(
      `${item.provider}:${item.eventId}`
    );
    if (existing) {
      console.log(`Event ${item.eventId} already processed, marking complete`);
      await webhookQueueRepository.markCompleted(item.id);
      return;
    }

    try {
      await webhookQueueRepository.markProcessing(item.id);

      // Process based on provider (actual processing in Phase 5/6/7)
      await this.processWebhook(item);

      // Mark as processed for idempotency
      await webhookProcessedEventRepository.create({
        id: `${item.provider}:${item.eventId}`,
        type: item.provider,
        processedAt: new Date().toISOString(),
      });

      await webhookQueueRepository.markCompleted(item.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to process webhook ${item.id}:`, errorMessage);
      await webhookQueueRepository.markFailed(item.id, errorMessage);
    }
  }

  private async processWebhook(item: WebhookQueueItem): Promise<void> {
    // Placeholder for actual processing - implemented in Phase 5/6/7
    switch (item.provider) {
      case "google":
        console.log(`Processing Google webhook: ${item.eventId}`);
        // TODO: Phase 5 - Calendar sync
        break;
      case "microsoft":
        console.log(`Processing Microsoft webhook: ${item.eventId}`);
        // TODO: Phase 5 - Calendar sync
        break;
      case "bamboohr":
      case "finch":
        console.log(`Processing HRIS webhook: ${item.eventId}`);
        // TODO: Phase 6 - Employee sync
        break;
      case "asana":
      case "clickup":
      case "linear":
        console.log(`Processing task webhook: ${item.eventId}`);
        // TODO: Phase 7 - Task sync
        break;
    }
  }

  // Process pending items (called by scheduled function)
  async processPending(): Promise<number> {
    const pending = await webhookQueueRepository.findPending();
    let processed = 0;

    for (const item of pending) {
      await this.process(item);
      processed++;
    }

    return processed;
  }

  // Retry failed items (called by scheduled function)
  async retryFailed(): Promise<number> {
    const readyForRetry = await webhookQueueRepository.findReadyForRetry();
    let retried = 0;

    for (const item of readyForRetry) {
      await this.process(item);
      retried++;
    }

    return retried;
  }
}

export const webhookQueueService = new WebhookQueueService();
