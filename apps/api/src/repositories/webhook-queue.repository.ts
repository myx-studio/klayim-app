import { firestore } from "@/lib/index.js";

export type WebhookProvider =
  | "google"
  | "microsoft"
  | "bamboohr"
  | "finch"
  | "asana"
  | "clickup"
  | "linear";

export type QueueStatus = "pending" | "processing" | "completed" | "failed";

export interface WebhookQueueItem {
  id: string;
  provider: WebhookProvider;
  eventId: string;
  payload: string; // Raw JSON payload
  headers: Record<string, string>;
  organizationId: string;
  status: QueueStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
  processedAt: string | null;
}

const COLLECTION = "webhook_queue";

class WebhookQueueRepository {
  private collection = firestore.collection(COLLECTION);

  async create(
    item: Omit<WebhookQueueItem, "id" | "createdAt" | "processedAt">
  ): Promise<WebhookQueueItem> {
    const doc = this.collection.doc();
    const data: Omit<WebhookQueueItem, "id"> = {
      ...item,
      createdAt: new Date().toISOString(),
      processedAt: null,
    };
    await doc.set(data);
    return { id: doc.id, ...data };
  }

  async findById(id: string): Promise<WebhookQueueItem | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as WebhookQueueItem;
  }

  async findPending(): Promise<WebhookQueueItem[]> {
    const snapshot = await this.collection
      .where("status", "==", "pending")
      .orderBy("createdAt", "asc")
      .limit(100)
      .get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as WebhookQueueItem
    );
  }

  async findReadyForRetry(): Promise<WebhookQueueItem[]> {
    const now = new Date().toISOString();
    const snapshot = await this.collection
      .where("status", "==", "failed")
      .where("nextRetryAt", "<=", now)
      .where("retryCount", "<", 5)
      .limit(100)
      .get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as WebhookQueueItem
    );
  }

  async markProcessing(id: string): Promise<void> {
    await this.collection.doc(id).update({ status: "processing" });
  }

  async markCompleted(id: string): Promise<void> {
    await this.collection.doc(id).update({
      status: "completed",
      processedAt: new Date().toISOString(),
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    const item = await this.findById(id);
    if (!item) return;

    const nextRetryAt = new Date(Date.now() + 30000).toISOString(); // 30 seconds
    await this.collection.doc(id).update({
      status: "failed",
      lastError: error,
      retryCount: item.retryCount + 1,
      nextRetryAt: item.retryCount + 1 < 5 ? nextRetryAt : null,
    });
  }

  async cleanupOldItems(): Promise<number> {
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const snapshot = await this.collection
      .where("status", "==", "completed")
      .where("processedAt", "<", sevenDaysAgo)
      .limit(500)
      .get();

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return snapshot.size;
  }
}

export const webhookQueueRepository = new WebhookQueueRepository();
