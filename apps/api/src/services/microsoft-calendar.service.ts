import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";

/**
 * OAuth state passed through the authorization flow
 */
export interface MicrosoftOAuthState {
  organizationId: string;
  redirectUrl: string;
}

/**
 * Result from exchanging authorization code for tokens
 */
export interface MicrosoftExchangeResult {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
  userInfo: {
    email: string;
    id: string;
  };
}

/**
 * Result from refreshing a token
 */
export interface MicrosoftRefreshResult {
  accessToken: string;
  expiresInMs: number;
}

/**
 * Microsoft Calendar Service
 *
 * Handles OAuth flow and API interactions with Microsoft Graph Calendar.
 * Uses @azure/msal-node for OAuth and @microsoft/microsoft-graph-client for API calls.
 *
 * Note: Uses "common" authority for multi-tenant support (personal and work accounts)
 */
class MicrosoftCalendarService {
  private readonly scopes = [
    "Calendars.Read",
    "offline_access",
    "User.Read",
  ];

  /**
   * Create an MSAL ConfidentialClientApplication
   */
  private createMsalClient(): ConfidentialClientApplication {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET environment variables");
    }

    const msalConfig: Configuration = {
      auth: {
        clientId,
        clientSecret,
        authority: "https://login.microsoftonline.com/common",
      },
    };

    return new ConfidentialClientApplication(msalConfig);
  }

  /**
   * Get redirect URI for OAuth callback
   */
  private getRedirectUri(): string {
    const apiUrl = process.env.API_URL || "http://localhost:5001";
    return `${apiUrl}/oauth/microsoft/callback`;
  }

  /**
   * Generate authorization URL for OAuth consent
   *
   * @param state - JSON stringified state object with organizationId and redirectUrl
   * @returns Authorization URL to redirect user to
   */
  async getAuthUrl(state: string): Promise<string> {
    const msalClient = this.createMsalClient();

    const authCodeUrlParameters = {
      scopes: this.scopes,
      redirectUri: this.getRedirectUri(),
      state,
    };

    return msalClient.getAuthCodeUrl(authCodeUrlParameters);
  }

  /**
   * Exchange authorization code for tokens and fetch user info
   *
   * @param code - Authorization code from OAuth callback
   * @returns Tokens and user information
   */
  async exchangeCode(code: string): Promise<MicrosoftExchangeResult> {
    const msalClient = this.createMsalClient();

    // Exchange code for tokens
    const tokenRequest = {
      code,
      scopes: this.scopes,
      redirectUri: this.getRedirectUri(),
    };

    const response = await msalClient.acquireTokenByCode(tokenRequest);

    if (!response || !response.accessToken) {
      throw new Error("Failed to get access token from Microsoft");
    }

    // MSAL doesn't expose refresh token directly in response
    // It's stored internally in the token cache
    // We need to extract it from the cache
    const tokenCache = msalClient.getTokenCache();
    const cacheContent = tokenCache.serialize();
    const cacheData = JSON.parse(cacheContent);

    // Find the refresh token in the cache
    let refreshToken = "";
    if (cacheData.RefreshToken) {
      const refreshTokens = Object.values(cacheData.RefreshToken) as Array<{ secret: string }>;
      if (refreshTokens.length > 0) {
        refreshToken = refreshTokens[0].secret;
      }
    }

    if (!refreshToken) {
      throw new Error(
        "No refresh token received from Microsoft. Ensure offline_access scope is granted."
      );
    }

    // Get user info using Graph API
    const graphClient = this.createGraphClient(response.accessToken);
    const userInfo = await graphClient.api("/me").select("id,mail,userPrincipalName").get();

    // Use mail or userPrincipalName as email (some accounts don't have mail set)
    const email = userInfo.mail || userInfo.userPrincipalName;
    if (!email || !userInfo.id) {
      throw new Error("Failed to get user info from Microsoft");
    }

    // Calculate expiry
    const expiresAt = response.expiresOn
      ? response.expiresOn.toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(); // Default 1 hour

    return {
      tokens: {
        accessToken: response.accessToken,
        refreshToken,
        expiresAt,
      },
      userInfo: {
        email,
        id: userInfo.id,
      },
    };
  }

  /**
   * Refresh an access token using a refresh token
   *
   * @param refreshToken - The refresh token to use
   * @param scopes - Scopes to request (use original scopes)
   * @returns New access token and expiry information
   */
  async refreshToken(refreshToken: string, scopes?: string[]): Promise<MicrosoftRefreshResult> {
    const msalClient = this.createMsalClient();

    const refreshRequest = {
      refreshToken,
      scopes: scopes || this.scopes,
    };

    const response = await msalClient.acquireTokenByRefreshToken(refreshRequest);

    if (!response || !response.accessToken) {
      throw new Error("Failed to refresh Microsoft access token");
    }

    const expiresInMs = response.expiresOn
      ? response.expiresOn.getTime() - Date.now()
      : 3600 * 1000; // Default 1 hour

    return {
      accessToken: response.accessToken,
      expiresInMs,
    };
  }

  /**
   * Create a Microsoft Graph client for API calls
   *
   * @param accessToken - Current access token
   * @returns Configured Graph client
   */
  createGraphClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }
}

export const microsoftCalendarService = new MicrosoftCalendarService();
