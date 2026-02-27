import { integrationRepository, type OAuthCredentials } from "@/repositories/index.js";
import type { Integration, IntegrationProvider } from "@klayim/shared/types";

/**
 * Input for connecting a new integration
 */
export interface ConnectInput {
  organizationId: string;
  provider: IntegrationProvider;
  accountEmail: string;
  accountId: string;
  scopes: string[];
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  webhookChannelId?: string;
  webhookSecret?: string;
  subscriptionId?: string;
}

/**
 * Integration Service
 *
 * Handles connect/disconnect operations for provider integrations.
 * Implements:
 * - Duplicate account detection per organization
 * - One-click disconnect (marks as disconnected, preserves synced data)
 * - Multi-account support (multiple accounts per provider per org)
 */
class IntegrationService {
  /**
   * Connect a new integration for an organization
   * OAuth credentials are encrypted before storage by the repository
   *
   * @throws Error if same account email already connected for this provider
   */
  async connect(input: ConnectInput): Promise<Integration> {
    // Check for duplicate account connection
    const existing = await integrationRepository.findByOrganizationAndProvider(
      input.organizationId,
      input.provider
    );

    const duplicate = existing.find(
      (integration) =>
        integration.accountEmail.toLowerCase() === input.accountEmail.toLowerCase() &&
        integration.status !== "disconnected"
    );

    if (duplicate) {
      throw new Error(
        `Account ${input.accountEmail} is already connected to ${input.provider}`
      );
    }

    // Check if there's a disconnected integration for the same account
    // that we can reactivate
    const disconnected = existing.find(
      (integration) =>
        integration.accountEmail.toLowerCase() === input.accountEmail.toLowerCase() &&
        integration.status === "disconnected"
    );

    if (disconnected) {
      // Reactivate the disconnected integration with new credentials
      const credentials: OAuthCredentials = {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
      };

      await integrationRepository.updateCredentials(disconnected.id, credentials);
      await integrationRepository.update(disconnected.id, {
        status: "connected",
        scopes: input.scopes,
        expiresAt: input.expiresAt,
        lastUsedAt: new Date().toISOString(),
        lastRefreshedAt: new Date().toISOString(),
        lastError: undefined,
        webhookChannelId: input.webhookChannelId,
        webhookSecret: input.webhookSecret,
        subscriptionId: input.subscriptionId,
      });

      const updated = await integrationRepository.findById(disconnected.id);
      return updated!;
    }

    // Create new integration
    const now = new Date().toISOString();
    return integrationRepository.create({
      organizationId: input.organizationId,
      provider: input.provider,
      accountEmail: input.accountEmail,
      accountId: input.accountId,
      status: "connected",
      scopes: input.scopes,
      credentials: {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
      },
      expiresAt: input.expiresAt,
      lastUsedAt: now,
      lastRefreshedAt: now,
      refreshCount: 0,
      webhookChannelId: input.webhookChannelId,
      webhookSecret: input.webhookSecret,
      subscriptionId: input.subscriptionId,
    });
  }

  /**
   * Disconnect an integration
   * Per CONTEXT.md: one-click disconnect, keeps synced data
   * Only marks as disconnected - does not delete the record
   */
  async disconnect(integrationId: string): Promise<void> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    await integrationRepository.markAsDisconnected(integrationId);
  }

  /**
   * Get all integrations for an organization
   */
  async getIntegrations(organizationId: string): Promise<Integration[]> {
    return integrationRepository.findByOrganization(organizationId);
  }

  /**
   * Get integrations by provider for an organization
   * Used for multi-account support (e.g., multiple Google accounts)
   */
  async getIntegrationsByProvider(
    organizationId: string,
    provider: IntegrationProvider
  ): Promise<Integration[]> {
    return integrationRepository.findByOrganizationAndProvider(organizationId, provider);
  }

  /**
   * Get a single integration by ID
   */
  async getIntegration(integrationId: string): Promise<Integration | null> {
    return integrationRepository.findById(integrationId);
  }

  /**
   * Get integrations by status for an organization
   */
  async getIntegrationsByStatus(
    organizationId: string,
    status: Integration["status"]
  ): Promise<Integration[]> {
    const all = await integrationRepository.findByOrganization(organizationId);
    return all.filter((i) => i.status === status);
  }

  /**
   * Check if an organization has any connected integrations of a specific provider type
   */
  async hasConnectedProvider(
    organizationId: string,
    provider: IntegrationProvider
  ): Promise<boolean> {
    const integrations = await integrationRepository.findByOrganizationAndProvider(
      organizationId,
      provider
    );
    return integrations.some((i) => i.status === "connected");
  }

  /**
   * Get integration statistics for an organization
   */
  async getIntegrationStats(
    organizationId: string
  ): Promise<{
    total: number;
    connected: number;
    disconnected: number;
    error: number;
    byProvider: Record<IntegrationProvider, number>;
  }> {
    const integrations = await integrationRepository.findByOrganization(organizationId);

    const stats = {
      total: integrations.length,
      connected: 0,
      disconnected: 0,
      error: 0,
      byProvider: {} as Record<IntegrationProvider, number>,
    };

    for (const integration of integrations) {
      if (integration.status === "connected") stats.connected++;
      if (integration.status === "disconnected") stats.disconnected++;
      if (integration.status === "error") stats.error++;

      stats.byProvider[integration.provider] =
        (stats.byProvider[integration.provider] || 0) + 1;
    }

    return stats;
  }

  /**
   * Permanently delete an integration and its data
   * Use sparingly - disconnect() is preferred for one-click UX
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    await integrationRepository.delete(integrationId);
  }
}

export const integrationService = new IntegrationService();
