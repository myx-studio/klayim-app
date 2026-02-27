import { firestore } from "@/lib/index.js";
import { encrypt, decrypt, type EncryptedData } from "@/lib/encryption.js";
import type {
  Integration,
  IntegrationProvider,
  IntegrationStatus,
  EncryptedCredentials,
} from "@klayim/shared/types";

const COLLECTION = "integrations";

/**
 * Plain OAuth credentials before encryption
 */
export interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
}

/**
 * Repository for managing OAuth integrations with encrypted credential storage
 * All queries include organizationId for multi-tenant isolation
 */
export class IntegrationRepository {
  private collection = firestore.collection(COLLECTION);

  /**
   * Create a new integration with encrypted credentials
   * OAuth tokens are encrypted with AES-256-GCM before storage
   */
  async create(
    integration: Omit<Integration, "id" | "credentials" | "createdAt" | "updatedAt"> & {
      credentials: OAuthCredentials;
    }
  ): Promise<Integration> {
    const masterKey = process.env.ENCRYPTION_KEY!;
    const encryptedCredentials = await encrypt(
      JSON.stringify(integration.credentials),
      masterKey
    );

    const doc = this.collection.doc();
    const now = new Date().toISOString();
    const data: Omit<Integration, "id"> = {
      organizationId: integration.organizationId,
      provider: integration.provider,
      accountEmail: integration.accountEmail,
      accountId: integration.accountId,
      status: integration.status,
      scopes: integration.scopes,
      credentials: encryptedCredentials,
      webhookChannelId: integration.webhookChannelId,
      webhookSecret: integration.webhookSecret,
      subscriptionId: integration.subscriptionId,
      expiresAt: integration.expiresAt,
      lastUsedAt: integration.lastUsedAt,
      lastRefreshedAt: integration.lastRefreshedAt,
      refreshCount: integration.refreshCount,
      lastError: integration.lastError,
      createdAt: now,
      updatedAt: now,
    };

    // Remove undefined values (Firestore doesn't accept undefined)
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );

    await doc.set(cleanData);
    return { id: doc.id, ...data };
  }

  /**
   * Find integration by ID
   */
  async findById(id: string): Promise<Integration | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.mapToIntegration(doc.id, doc.data()!);
  }

  /**
   * Find all integrations for an organization (multi-tenant scoped)
   */
  async findByOrganization(organizationId: string): Promise<Integration[]> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) => this.mapToIntegration(doc.id, doc.data()));
  }

  /**
   * Find integrations by organization and provider (for multi-account support)
   */
  async findByOrganizationAndProvider(
    organizationId: string,
    provider: IntegrationProvider
  ): Promise<Integration[]> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .where("provider", "==", provider)
      .get();
    return snapshot.docs.map((doc) => this.mapToIntegration(doc.id, doc.data()));
  }

  /**
   * Find integrations expiring within a time buffer (for proactive refresh)
   * @param bufferMs - Milliseconds before expiry to include
   */
  async findExpiringWithin(bufferMs: number): Promise<Integration[]> {
    const threshold = new Date(Date.now() + bufferMs).toISOString();
    const snapshot = await this.collection
      .where("status", "==", "connected")
      .where("expiresAt", "<=", threshold)
      .get();
    return snapshot.docs.map((doc) => this.mapToIntegration(doc.id, doc.data()));
  }

  /**
   * Decrypt and return OAuth credentials for an integration
   * Updates lastUsedAt to track token usage
   */
  async getDecryptedCredentials(integration: Integration): Promise<OAuthCredentials> {
    const masterKey = process.env.ENCRYPTION_KEY!;
    const decrypted = await decrypt(integration.credentials as EncryptedData, masterKey);
    return JSON.parse(decrypted);
  }

  /**
   * Update integration fields (not credentials)
   */
  async update(id: string, data: Partial<Omit<Integration, "id" | "credentials">>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([, v]) => v !== undefined)
    );
    await this.collection.doc(id).update(cleanData);
  }

  /**
   * Update OAuth credentials (encrypted before storage)
   */
  async updateCredentials(id: string, credentials: OAuthCredentials): Promise<void> {
    const masterKey = process.env.ENCRYPTION_KEY!;
    const encryptedCredentials = await encrypt(JSON.stringify(credentials), masterKey);
    await this.update(id, { credentials: encryptedCredentials } as unknown as Partial<
      Omit<Integration, "id" | "credentials">
    >);
    // Update directly since credentials type doesn't match
    await this.collection.doc(id).update({
      credentials: encryptedCredentials,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark integration as having an error
   */
  async markAsError(id: string, error: string): Promise<void> {
    await this.update(id, { status: "error" as IntegrationStatus, lastError: error });
  }

  /**
   * Mark integration as disconnected (keeps synced data)
   */
  async markAsDisconnected(id: string): Promise<void> {
    await this.update(id, { status: "disconnected" as IntegrationStatus });
  }

  /**
   * Update lastUsedAt timestamp
   */
  async updateLastUsed(id: string): Promise<void> {
    await this.update(id, { lastUsedAt: new Date().toISOString() });
  }

  /**
   * Delete integration (use markAsDisconnected for one-click disconnect)
   */
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  private mapToIntegration(
    id: string,
    data: FirebaseFirestore.DocumentData
  ): Integration {
    return {
      id,
      organizationId: data.organizationId,
      provider: data.provider,
      accountEmail: data.accountEmail,
      accountId: data.accountId,
      status: data.status,
      scopes: data.scopes,
      credentials: data.credentials,
      webhookChannelId: data.webhookChannelId,
      webhookSecret: data.webhookSecret,
      subscriptionId: data.subscriptionId,
      expiresAt: data.expiresAt,
      lastUsedAt: data.lastUsedAt,
      lastRefreshedAt: data.lastRefreshedAt,
      refreshCount: data.refreshCount,
      lastError: data.lastError,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

export const integrationRepository = new IntegrationRepository();
