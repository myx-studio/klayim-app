import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { Client, PageCollection, PageIterator } from "@microsoft/microsoft-graph-client";
import type { CalendarEvent, CalendarEventStatus, EventAttendee, AttendeeResponseStatus } from "@klayim/shared/types";

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
 * Options for listing events
 */
export interface MicrosoftListEventsOptions {
  deltaLink?: string;
}

/**
 * Raw Microsoft Graph event type
 */
export interface MicrosoftGraphEvent {
  id?: string;
  subject?: string;
  start?: { dateTime?: string; timeZone?: string; };
  end?: { dateTime?: string; timeZone?: string; };
  isAllDay?: boolean;
  organizer?: { emailAddress?: { address?: string; }; };
  attendees?: Array<{
    emailAddress?: { address?: string; };
    status?: { response?: string; };
  }>;
  isCancelled?: boolean;
  showAs?: string;
  seriesMasterId?: string;
  "@removed"?: { reason?: string; };
}

/**
 * Result from listing events
 */
export interface MicrosoftListEventsResult {
  events: MicrosoftGraphEvent[];
  nextDeltaLink: string;
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

  /**
   * List calendar events with optional deltaLink for incremental sync
   *
   * @param accessToken - Current access token
   * @param options - Options including deltaLink for incremental sync
   * @returns List of events and next delta link
   */
  async listEvents(
    accessToken: string,
    options: MicrosoftListEventsOptions = {}
  ): Promise<MicrosoftListEventsResult> {
    const graphClient = this.createGraphClient(accessToken);
    const allEvents: MicrosoftGraphEvent[] = [];

    let requestUrl: string;

    if (options.deltaLink) {
      // Incremental sync - use the stored delta link directly
      requestUrl = options.deltaLink;
    } else {
      // Full sync - use calendarView with delta
      // Get events from 90 days ago to 365 days in future
      const startDateTime = new Date();
      startDateTime.setDate(startDateTime.getDate() - 90);
      const endDateTime = new Date();
      endDateTime.setDate(endDateTime.getDate() + 365);

      requestUrl = `/me/calendarView/delta?startDateTime=${startDateTime.toISOString()}&endDateTime=${endDateTime.toISOString()}`;
    }

    // Use PageIterator to handle pagination automatically
    let deltaLink = "";

    try {
      // Make initial request
      const response: PageCollection = await graphClient.api(requestUrl).get();

      // Check if we got a direct deltaLink (no events to iterate)
      if (response["@odata.deltaLink"] && !response.value?.length) {
        return {
          events: [],
          nextDeltaLink: response["@odata.deltaLink"],
        };
      }

      // Create callback for page iteration
      const callback = (event: MicrosoftGraphEvent) => {
        allEvents.push(event);
        return true; // Continue iteration
      };

      // Create page iterator
      const pageIterator = new PageIterator(graphClient, response, callback);

      // Iterate through all pages
      await pageIterator.iterate();

      // Get the delta link from the last response
      // The PageIterator doesn't directly expose deltaLink, so we check the response
      deltaLink = response["@odata.deltaLink"] || "";

      // If no delta link yet, we need to get it from the iterator state
      // Microsoft returns deltaLink only on the last page
      if (!deltaLink && pageIterator.getDeltaLink) {
        deltaLink = pageIterator.getDeltaLink() || "";
      }

      return {
        events: allEvents,
        nextDeltaLink: deltaLink,
      };
    } catch (error: unknown) {
      // Handle errors - Microsoft doesn't use 410 GONE for expired delta tokens
      // Instead, it returns a new initial response, so we just pass through
      throw error;
    }
  }

  /**
   * Map Microsoft Graph event to normalized CalendarEvent
   *
   * @param msEvent - Raw Microsoft Graph event
   * @param integrationId - Integration ID for this calendar
   * @param organizationId - Organization ID
   * @returns Normalized CalendarEvent (without id, createdAt, updatedAt)
   */
  mapToCalendarEvent(
    msEvent: MicrosoftGraphEvent,
    integrationId: string,
    organizationId: string
  ): Omit<CalendarEvent, "id" | "createdAt" | "updatedAt"> {
    const isAllDay = msEvent.isAllDay || false;

    // Parse start and end times (Microsoft uses dateTime + timeZone)
    // For simplicity, we convert to ISO strings
    let startTime = new Date().toISOString();
    let endTime = new Date().toISOString();

    if (msEvent.start?.dateTime) {
      // Microsoft returns datetime without timezone suffix, in the specified timezone
      // We'll treat it as the local time and convert
      startTime = new Date(msEvent.start.dateTime + "Z").toISOString();
    }
    if (msEvent.end?.dateTime) {
      endTime = new Date(msEvent.end.dateTime + "Z").toISOString();
    }

    // Calculate duration in minutes
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    // Map attendees
    const attendees: EventAttendee[] = (msEvent.attendees || []).map((a) => ({
      email: a.emailAddress?.address || "",
      responseStatus: this.mapMicrosoftResponseStatus(a.status?.response),
    }));

    // Map status
    let status: CalendarEventStatus = "confirmed";
    if (msEvent.isCancelled || msEvent["@removed"]) {
      status = "cancelled";
    } else if (msEvent.showAs === "tentative") {
      status = "tentative";
    }

    return {
      organizationId,
      integrationId,
      externalId: msEvent.id || "",
      provider: "microsoft_calendar",
      title: msEvent.subject || "(No title)",
      startTime,
      endTime,
      durationMinutes,
      isAllDay,
      organizerEmail: msEvent.organizer?.emailAddress?.address || "",
      attendees,
      recurringEventId: msEvent.seriesMasterId,
      status,
    };
  }

  /**
   * Map Microsoft response status to normalized AttendeeResponseStatus
   */
  private mapMicrosoftResponseStatus(
    msStatus: string | undefined
  ): AttendeeResponseStatus {
    switch (msStatus?.toLowerCase()) {
      case "accepted":
        return "accepted";
      case "declined":
        return "declined";
      case "tentativelyaccepted":
      case "tentative":
        return "tentative";
      default:
        return "needsAction";
    }
  }
}

export const microsoftCalendarService = new MicrosoftCalendarService();
