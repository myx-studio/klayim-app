import { integrationRepository, type OAuthCredentials } from "@/repositories/index.js";
import { decrypt, encrypt, type EncryptedData } from "@/lib/encryption.js";
import type { Integration, IntegrationProvider } from "@klayim/shared/types";
import { googleCalendarService } from "./google-calendar.service.js";

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
   * Uses @azure/msal-node ConfidentialClientApplication
   *
   * TODO: Install @azure/msal-node and implement actual refresh
   * pnpm add @azure/msal-node
   */
  private async refreshMicrosoftToken(
    credentials: OAuthCredentials,
    integration: Integration
  ): Promise<RefreshResult> {
    // TODO: Implement when @azure/msal-node is installed (Phase 5)
    // import { ConfidentialClientApplication } from '@azure/msal-node';
    //
    // const msalClient = new ConfidentialClientApplication({
    //   auth: {
    //     clientId: process.env.MICROSOFT_CLIENT_ID!,
    //     clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    //     authority: `https://login.microsoftonline.com/${tenantId}`
    //   }
    // });
    //
    // const result = await msalClient.acquireTokenByRefreshToken({
    //   refreshToken: credentials.refreshToken,
    //   scopes: integration.scopes
    // });
    //
    // if (!result) throw new Error('Token refresh failed');
    // return {
    //   accessToken: result.accessToken,
    //   expiresInMs: result.expiresOn!.getTime() - Date.now(),
    // };

    throw new Error(
      "Microsoft Calendar token refresh not implemented. Install @azure/msal-node package in Phase 5."
    );
  }

  /**
   * Refresh BambooHR OAuth token
   *
   * TODO: Implement when BambooHR integration is built (Phase 6)
   */
  private async refreshBambooHRToken(
    _credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    throw new Error(
      "BambooHR token refresh not implemented. Will be added in Phase 6."
    );
  }

  /**
   * Refresh Finch OAuth token
   * Uses @tryfinch/finch-api SDK
   *
   * TODO: Install @tryfinch/finch-api and implement (Phase 6)
   * pnpm add @tryfinch/finch-api
   */
  private async refreshFinchToken(
    _credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    throw new Error(
      "Finch token refresh not implemented. Install @tryfinch/finch-api package in Phase 6."
    );
  }

  /**
   * Refresh Asana OAuth token
   *
   * TODO: Implement when Asana integration is built (Phase 7)
   */
  private async refreshAsanaToken(
    _credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    throw new Error(
      "Asana token refresh not implemented. Will be added in Phase 7."
    );
  }

  /**
   * Refresh ClickUp OAuth token
   *
   * TODO: Implement when ClickUp integration is built (Phase 7)
   */
  private async refreshClickUpToken(
    _credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    throw new Error(
      "ClickUp token refresh not implemented. Will be added in Phase 7."
    );
  }

  /**
   * Refresh Linear OAuth token
   *
   * TODO: Implement when Linear integration is built (Phase 7)
   */
  private async refreshLinearToken(
    _credentials: OAuthCredentials,
    _integration: Integration
  ): Promise<RefreshResult> {
    throw new Error(
      "Linear token refresh not implemented. Will be added in Phase 7."
    );
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
