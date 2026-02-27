import { firestore } from "@/lib/index.js";

export interface WebhookProcessedEvent {
  id: string; // Format: "{provider}:{eventId}"
  type: string; // Provider name
  processedAt: string; // ISO timestamp
}

const COLLECTION = "processed_events";

class WebhookProcessedEventRepository {
  private collection = firestore.collection(COLLECTION);

  async findById(id: string): Promise<WebhookProcessedEvent | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as WebhookProcessedEvent;
  }

  async create(event: WebhookProcessedEvent): Promise<WebhookProcessedEvent> {
    await this.collection.doc(event.id).set({
      type: event.type,
      processedAt: event.processedAt,
    });
    return event;
  }

  async exists(id: string): Promise<boolean> {
    const doc = await this.collection.doc(id).get();
    return doc.exists;
  }

  // Cleanup events older than 7 days (called by scheduled function)
  async cleanupOldEvents(): Promise<number> {
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const snapshot = await this.collection
      .where("processedAt", "<", sevenDaysAgo)
      .limit(500)
      .get();

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return snapshot.size;
  }
}

export const webhookProcessedEventRepository =
  new WebhookProcessedEventRepository();
