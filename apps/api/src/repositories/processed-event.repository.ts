import { firestore } from "@/lib/index.js";

interface ProcessedEvent {
  id: string;
  type: string;
  processedAt: string;
}

const COLLECTION = "processed_stripe_events";

class ProcessedEventRepository {
  private collection = firestore.collection(COLLECTION);

  async findById(eventId: string): Promise<ProcessedEvent | null> {
    const doc = await this.collection.doc(eventId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as ProcessedEvent;
  }

  async create(event: ProcessedEvent): Promise<void> {
    await this.collection.doc(event.id).set({
      type: event.type,
      processedAt: event.processedAt,
    });
  }
}

export const processedEventRepository = new ProcessedEventRepository();
