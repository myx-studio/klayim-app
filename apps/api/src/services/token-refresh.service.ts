import { integrationRepository, type OAuthCredentials } from "@/repositories/index.js";
import { decrypt, encrypt, type EncryptedData } from "@/lib/encryption.js";
import type { Integration, IntegrationProvider } from "@klayim/shared/types";
import { googleCalendarService } from "./google-calendar.service.js";
import { microsoftCalendarService } from "./microsoft-calendar.service.js";
import { bambooHRService } from "./bamboohr.service.js";
import { asanaService } from "./asana.service.js";
import { linearService } from "./linear.service.js";

/**
 * Buffer time before token expiry to trigger refresh (5 minutes)
 */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Token refresh result from provider
 */
interface RefreshResult {
  accessToken: string;
  refreshToken?: string; // Some providers issue new refresh tokens
  expiresInMs: number;
}

/**
 * Token Refresh Service
 *
 * Implements hybrid proactive/on-demand refresh strategy:
 * - Proactive: Scheduled function calls refreshExpiringTokens() to refresh before expiry
 * - On-demand: getValidToken() refreshes if token is expired or expiring soon
 *
 * On refresh failure: marks integration as 'error' with lastError for admin notification
 */
class TokenRefreshService {
  /**
   * Proactive refresh for active integrations
   * Called by scheduled Cloud Function to refresh tokens before they expire
   */
  async refreshExpiringTokens(): Promise<{ refreshed: number; failed: number }> {
    const expiringIntegrations = await integrationRepository.findExpiringWithin(
      REFRESH_BUFFER_MS
    );

    let refreshed = 0;
    let failed = 0;

    for (const integration of expiringIntegrations) {
      try {
        await this.refreshToken(integration.id);
        refreshed++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to refresh integration ${integration.id}:`, message);
        await integrationRepository.markAsError(integration.id, message);
        failed++;
        // TODO: Send notification to org admins (Phase 8 notification system)
      }
    }

    return { refreshed, failed };
  }

  /**
   * On-demand token retrieval with automatic refresh
   * Use this when making API calls - it ensures a valid token
   */
  async getValidToken(integrationId: string): Promise<string> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    if (integration.status === "disconnected") {
      throw new Error("Integration is disconnected");
    }

    // Check if token is expired or expiring soon
    const expiresAt = new Date(integration.expiresAt);
    const now = new Date();

    if (expiresAt.getTime() - now.getTime() < REFRESH_BUFFER_MS) {
      await this.refreshToken(integrationId);
      // Re-fetch to get new token
      const updated = await integrationRepository.findById(integrationId);
      if (!updated) {
        throw new Error("Integration lost during refresh");
      }
      return this.decryptAccessToken(updated);
    }

    // Update lastUsedAt for usage tracking
    await integrationRepository.updateLastUsed(integrationId);

    return this.decryptAccessToken(integration);
  }

  /**
   * Refresh token for a specific integration
   * Handles provider-specific refresh logic
   */
  async refreshToken(integrationId: string): Promise<void> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    const credentials = await integrationRepository.getDecryptedCredentials(integration);

    let result: RefreshResult;

    switch (integration.provider) {
      case "google_calendar":
        result = await this.refreshGoogleToken(credentials, integration);
        break;

      case "microsoft_calendar":
        result = await this.refreshMicrosoftToken(credentials, integration);
        break;

      case "bamboohr":
        result = await this.refreshBambooHRToken(credentials, integration);
        break;

      case "finch":
        result = await this.refreshFinchToken(credentials, integration);
        break;

      case "asana":
        result = await this.refreshAsanaToken(credentials, integration);
        break;

      case "clickup":
        result = await this.refreshClickUpToken(credentials, integration);
        break;

      case "linear":
        result = await this.refreshLinearToken(credentials, integration);
        break;

      default:
        throw new Error(`Unsupported provider: ${integration.provider}`);
    }

    // Store refreshed credentials
    const newCredentials: OAuthCredentials = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken || credentials.refreshToken,
      expiresAt: new Date(Date.now() + result.expiresInMs).toISOString(),
    };

    await integrationRepository.updateCredentials(integrationId, newCredentials);

    // Update metadata
    await integrationRepository.update(integrationId, {
      expiresAt: newCredentials.expiresAt,
      lastRefreshedAt: new Date().toISOString(),
      refreshCount: integration.refreshCount + 1,
      status: "connected",
      lastError: undefined,
    });
  }

  /**
   * Refresh Google OAuth token
   * Uses googleapis OAuth2 client via googleCalendarService
   */
  private async refreshGoogleToken(
    credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    const result = await googleCalendarService.refreshToken(credentials.refreshToken);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresInMs: result.expiresInMs,
    };
  }

  /**
   * Refresh Microsoft OAuth token
   * Uses @azure/msal-node ConfidentialClientApplication via microsoftCalendarService
   */
  private async refreshMicrosoftToken(
    credentials: OAuthCredentials,
    integration: Integration
  ): Promise<RefreshResult> {
    const result = await microsoftCalendarService.refreshToken(
      credentials.refreshToken,
      integration.scopes
    );

    return {
      accessToken: result.accessToken,
      expiresInMs: result.expiresInMs,
    };
  }

  /**
   * Refresh BambooHR OAuth token
   * Uses BambooHR OAuth2 refresh token flow
   */
  private async refreshBambooHRToken(
    credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    const result = await bambooHRService.refreshToken(credentials.refreshToken);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresInMs: result.expiresInMs,
    };
  }

  /**
   * Refresh Finch OAuth token
   *
   * Finch tokens are persistent and don't expire until the connection is
   * disconnected by the user or admin. If we get here, the connection may
   * be invalid and needs to be re-authorized.
   *
   * @throws Error always - Finch tokens don't support refresh
   */
  private async refreshFinchToken(
    _credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    // Finch tokens are persistent and don't expire
    // If we get here, the connection is likely invalid - mark as error
    throw new Error(
      "Finch tokens do not require refresh - connection may be invalid. " +
        "User needs to reconnect via Finch Connect."
    );
  }

  /**
   * Refresh Asana OAuth token
   * Uses Asana OAuth2 refresh token flow
   */
  private async refreshAsanaToken(
    credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    const result = await asanaService.refreshToken(credentials.refreshToken);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresInMs: result.expiresIn * 1000, // Convert seconds to ms
    };
  }

  /**
   * Refresh ClickUp OAuth token
   *
   * ClickUp tokens are persistent and don't expire. If we get here,
   * the connection may be invalid and needs to be re-authorized.
   *
   * @throws Error always - ClickUp tokens don't require refresh
   */
  private async refreshClickUpToken(
    _credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    // ClickUp tokens don't expire - they're permanent until revoked
    throw new Error(
      "ClickUp tokens do not expire and cannot be refreshed. " +
        "If the token is invalid, user needs to reconnect."
    );
  }

  /**
   * Refresh Linear OAuth token
   * Uses Linear OAuth2 refresh token flow
   *
   * Note: Linear is migrating to mandatory refresh tokens (April 2026)
   */
  private async refreshLinearToken(
    credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    const result = await linearService.refreshToken(credentials.refreshToken);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresInMs: result.expiresIn * 1000, // Convert seconds to ms
    };
  }

  /**
   * Decrypt access token from integration credentials
   */
  private async decryptAccessToken(integration: Integration): Promise<string> {
    const credentials = await integrationRepository.getDecryptedCredentials(integration);
    return credentials.accessToken;
  }
}

export const tokenRefreshService = new TokenRefreshService();
