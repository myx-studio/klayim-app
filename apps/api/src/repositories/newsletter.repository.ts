import { firestore } from "@/lib/index.js";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: Date;
  source: string;
  isActive: boolean;
}

const COLLECTION = "newsletter_subscribers";

export const newsletterRepository = {
  async findByEmail(email: string): Promise<NewsletterSubscriber | null> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      subscribedAt: data.subscribedAt?.toDate() || new Date(),
      source: data.source || "website",
      isActive: data.isActive ?? true,
    };
  },

  async create(email: string, source: string = "website"): Promise<NewsletterSubscriber> {
    const now = new Date();
    const docRef = await firestore.collection(COLLECTION).add({
      email: email.toLowerCase(),
      subscribedAt: now,
      source,
      isActive: true,
    });

    return {
      id: docRef.id,
      email: email.toLowerCase(),
      subscribedAt: now,
      source,
      isActive: true,
    };
  },

  async reactivate(id: string): Promise<void> {
    await firestore.collection(COLLECTION).doc(id).update({
      isActive: true,
      reactivatedAt: new Date(),
    });
  },
};
