import { firestore } from "@/lib/index.js";
import type { SyncState } from "@klayim/shared/types";

const COLLECTION = "sync_states";

/**
 * Repository for managing sync state per integration
 * Tracks sync tokens (Google) and delta links (Microsoft) for incremental sync
 */
export class SyncStateRepository {
  private collection = firestore.collection(COLLECTION);

  /**
   * Create a new sync state record
   */
  async create(
    state: Omit<SyncState, "id" | "createdAt" | "updatedAt">
  ): Promise<SyncState> {
    // Use integrationId as document ID for 1:1 mapping
    const doc = this.collection.doc(state.integrationId);
    const now = new Date().toISOString();
    const data: Omit<SyncState, "id"> = {
      ...state,
      createdAt: now,
      updatedAt: now,
    };

    await doc.set(data);
    return { id: doc.id, ...data };
  }

  /**
   * Find sync state by integration ID
   */
  async findByIntegration(integrationId: string): Promise<SyncState | null> {
    const doc = await this.collection.doc(integrationId).get();
    if (!doc.exists) return null;
    return this.mapToSyncState(doc.id, doc.data()!);
  }

  /**
   * Update sync state
   */
  async update(integrationId: string, data: Partial<SyncState>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([, v]) => v !== undefined)
    );
    await this.collection.doc(integrationId).update(cleanData);
  }

  /**
   * Update sync token (Google syncToken or Microsoft deltaLink)
   */
  async updateSyncToken(
    integrationId: string,
    token: { syncToken?: string; deltaLink?: string }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (token.syncToken !== undefined) {
      updateData.syncToken = token.syncToken;
    }
    if (token.deltaLink !== undefined) {
      updateData.deltaLink = token.deltaLink;
    }

    await this.collection.doc(integrationId).update(updateData);
  }

  /**
   * Update webhook state for push notification subscriptions
   */
  async updateWebhookState(
    integrationId: string,
    webhook: {
      channelId?: string;
      resourceId?: string;
      expiration?: string;
    }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (webhook.channelId !== undefined) {
      updateData.webhookChannelId = webhook.channelId;
    }
    if (webhook.resourceId !== undefined) {
      updateData.webhookResourceId = webhook.resourceId;
    }
    if (webhook.expiration !== undefined) {
      updateData.webhookExpiration = webhook.expiration;
    }

    await this.collection.doc(integrationId).update(updateData);
  }

  /**
   * Delete sync state for an integration
   */
  async delete(integrationId: string): Promise<void> {
    await this.collection.doc(integrationId).delete();
  }

  private mapToSyncState(
    id: string,
    data: FirebaseFirestore.DocumentData
  ): SyncState {
    return {
      id,
      organizationId: data.organizationId,
      integrationId: data.integrationId,
      syncToken: data.syncToken,
      deltaLink: data.deltaLink,
      lastFullSyncAt: data.lastFullSyncAt,
      lastIncrementalSyncAt: data.lastIncrementalSyncAt,
      lastSyncError: data.lastSyncError,
      webhookChannelId: data.webhookChannelId,
      webhookResourceId: data.webhookResourceId,
      webhookExpiration: data.webhookExpiration,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

export const syncStateRepository = new SyncStateRepository();
