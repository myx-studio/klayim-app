import { google, Auth, calendar_v3 } from "googleapis";
import type { CalendarEvent, CalendarEventStatus, EventAttendee, AttendeeResponseStatus } from "@klayim/shared/types";

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
 * Options for listing events
 */
export interface GoogleListEventsOptions {
  syncToken?: string;
}

/**
 * Result from listing events
 */
export interface GoogleListEventsResult {
  events: calendar_v3.Schema$Event[];
  nextSyncToken: string;
  needsFullSync?: boolean;
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

  /**
   * List calendar events with optional syncToken for incremental sync
   *
   * @param accessToken - Current access token
   * @param options - Options including syncToken for incremental sync
   * @returns List of events and next sync token
   */
  async listEvents(
    accessToken: string,
    options: GoogleListEventsOptions = {}
  ): Promise<GoogleListEventsResult> {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const allEvents: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;
    let nextSyncToken = "";

    try {
      do {
        const params: calendar_v3.Params$Resource$Events$List = {
          calendarId: "primary",
          singleEvents: true, // Expand recurring events into instances
          maxResults: 250, // Max per page
          pageToken,
        };

        if (options.syncToken) {
          // Incremental sync
          params.syncToken = options.syncToken;
        } else {
          // Full sync: get events from 90 days ago
          const timeMin = new Date();
          timeMin.setDate(timeMin.getDate() - 90);
          params.timeMin = timeMin.toISOString();
          params.orderBy = "startTime";
        }

        const response = await calendar.events.list(params);
        const items = response.data.items || [];
        allEvents.push(...items);

        pageToken = response.data.nextPageToken || undefined;
        if (response.data.nextSyncToken) {
          nextSyncToken = response.data.nextSyncToken;
        }
      } while (pageToken);

      return {
        events: allEvents,
        nextSyncToken,
      };
    } catch (error: unknown) {
      // Handle 410 GONE - sync token is invalid, need full sync
      if (error && typeof error === "object" && "code" in error && error.code === 410) {
        return {
          events: [],
          nextSyncToken: "",
          needsFullSync: true,
        };
      }
      throw error;
    }
  }

  /**
   * Map Google Calendar event to normalized CalendarEvent
   *
   * @param googleEvent - Raw Google Calendar event
   * @param integrationId - Integration ID for this calendar
   * @param organizationId - Organization ID
   * @returns Normalized CalendarEvent (without id, createdAt, updatedAt)
   */
  mapToCalendarEvent(
    googleEvent: calendar_v3.Schema$Event,
    integrationId: string,
    organizationId: string
  ): Omit<CalendarEvent, "id" | "createdAt" | "updatedAt"> {
    // Determine if all-day event (has date instead of dateTime)
    const isAllDay = !!(googleEvent.start?.date && !googleEvent.start?.dateTime);

    // Parse start and end times
    const startTime = isAllDay
      ? googleEvent.start?.date + "T00:00:00.000Z"
      : googleEvent.start?.dateTime;
    const endTime = isAllDay
      ? googleEvent.end?.date + "T00:00:00.000Z"
      : googleEvent.end?.dateTime;

    // Calculate duration in minutes
    let durationMinutes = 0;
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    // Map attendees
    const attendees: EventAttendee[] = (googleEvent.attendees || []).map((a) => ({
      email: a.email || "",
      responseStatus: this.mapGoogleResponseStatus(a.responseStatus),
    }));

    // Map status
    let status: CalendarEventStatus = "confirmed";
    if (googleEvent.status === "cancelled") {
      status = "cancelled";
    } else if (googleEvent.status === "tentative") {
      status = "tentative";
    }

    return {
      organizationId,
      integrationId,
      externalId: googleEvent.id || "",
      provider: "google_calendar",
      title: googleEvent.summary || "(No title)",
      startTime: startTime || new Date().toISOString(),
      endTime: endTime || new Date().toISOString(),
      durationMinutes,
      isAllDay,
      organizerEmail: googleEvent.organizer?.email || "",
      attendees,
      recurringEventId: googleEvent.recurringEventId || undefined,
      status,
    };
  }

  /**
   * Map Google response status to normalized AttendeeResponseStatus
   */
  private mapGoogleResponseStatus(
    googleStatus: string | undefined | null
  ): AttendeeResponseStatus {
    switch (googleStatus) {
      case "accepted":
        return "accepted";
      case "declined":
        return "declined";
      case "tentative":
        return "tentative";
      default:
        return "needsAction";
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
