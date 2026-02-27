import { google, Auth } from "googleapis";

/**
 * OAuth state passed through the authorization flow
 */
export interface GoogleOAuthState {
  organizationId: string;
  redirectUrl: string;
}

/**
 * Result from exchanging authorization code for tokens
 */
export interface GoogleExchangeResult {
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
export interface GoogleRefreshResult {
  accessToken: string;
  expiresInMs: number;
  refreshToken?: string;
}

/**
 * Google Calendar Service
 *
 * Handles OAuth flow and API interactions with Google Calendar.
 * Uses googleapis library for OAuth2 and calendar API calls.
 */
class GoogleCalendarService {
  private readonly scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  /**
   * Create an OAuth2 client with configured credentials
   */
  private createOAuth2Client(): Auth.OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const apiUrl = process.env.API_URL || "http://localhost:5001";

    if (!clientId || !clientSecret) {
      throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables");
    }

    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${apiUrl}/oauth/google/callback`
    );
  }

  /**
   * Generate authorization URL for OAuth consent
   *
   * @param state - JSON stringified state object with organizationId and redirectUrl
   * @returns Authorization URL to redirect user to
   */
  getAuthUrl(state: string): string {
    const oauth2Client = this.createOAuth2Client();

    return oauth2Client.generateAuthUrl({
      access_type: "offline", // Required for refresh token
      prompt: "consent", // Force consent to get refresh token
      scope: this.scopes,
      state,
    });
  }

  /**
   * Exchange authorization code for tokens and fetch user info
   *
   * @param code - Authorization code from OAuth callback
   * @returns Tokens and user information
   */
  async exchangeCode(code: string): Promise<GoogleExchangeResult> {
    const oauth2Client = this.createOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("No access token received from Google");
    }

    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token received from Google. User may have already authorized this app. " +
          "Revoke access at https://myaccount.google.com/permissions and try again."
      );
    }

    // Set credentials to fetch user info
    oauth2Client.setCredentials(tokens);

    // Fetch user info
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email || !userInfo.id) {
      throw new Error("Failed to get user email from Google");
    }

    // Calculate expiry
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(); // Default 1 hour

    return {
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
      userInfo: {
        email: userInfo.email,
        id: userInfo.id,
      },
    };
  }

  /**
   * Create an OAuth2 client with existing tokens for API calls
   *
   * @param accessToken - Current access token
   * @param refreshToken - Refresh token for automatic renewal
   * @returns Configured OAuth2 client
   */
  createOAuth2ClientWithToken(accessToken: string, refreshToken: string): Auth.OAuth2Client {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return oauth2Client;
  }

  /**
   * Refresh an access token using a refresh token
   *
   * @param refreshToken - The refresh token to use
   * @returns New access token and expiry information
   */
  async refreshToken(refreshToken: string): Promise<GoogleRefreshResult> {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error("Failed to refresh Google access token");
    }

    const expiresInMs = credentials.expiry_date
      ? credentials.expiry_date - Date.now()
      : 3600 * 1000; // Default 1 hour

    return {
      accessToken: credentials.access_token,
      expiresInMs,
      refreshToken: credentials.refresh_token || undefined,
    };
  }

  /**
   * Get Calendar API client for making calendar requests
   *
   * @param accessToken - Current access token
   * @param refreshToken - Refresh token for automatic renewal
   * @returns Google Calendar API v3 client
   */
  getCalendarClient(accessToken: string, refreshToken: string) {
    const oauth2Client = this.createOAuth2ClientWithToken(accessToken, refreshToken);
    return google.calendar({ version: "v3", auth: oauth2Client });
  }
}

export const googleCalendarService = new GoogleCalendarService();
