/**
 * Calendar event provider types
 */
export type CalendarProvider = "google_calendar" | "microsoft_calendar";

/**
 * Attendee response status for calendar events
 */
export type AttendeeResponseStatus = "accepted" | "declined" | "tentative" | "needsAction";

/**
 * Calendar event status
 */
export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";

/**
 * Event attendee with response status
 */
export interface EventAttendee {
  email: string;
  responseStatus: AttendeeResponseStatus;
}

/**
 * CalendarEvent interface (normalized for both Google and Microsoft providers)
 *
 * Stores events synced from calendar providers in a unified format
 * for cost calculation and analytics.
 */
export interface CalendarEvent {
  id: string;
  organizationId: string;
  integrationId: string; // Which calendar this came from
  externalId: string; // Provider's event ID
  provider: CalendarProvider;

  // Event details
  title: string;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  durationMinutes: number;
  isAllDay: boolean;

  // Participants
  organizerEmail: string;
  attendees: EventAttendee[];

  // Recurrence
  recurringEventId?: string; // ID of master event if recurring

  // Status
  status: CalendarEventStatus;

  // Cost calculation (computed after HRIS data available)
  calculatedCostCents?: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * SyncState interface - tracks sync tokens per integration
 *
 * Used to enable incremental sync with calendar providers:
 * - Google: syncToken for delta changes
 * - Microsoft: deltaLink for delta queries
 */
export interface SyncState {
  id: string; // Same as integrationId for 1:1 mapping
  organizationId: string;
  integrationId: string;

  // Provider-specific sync tokens
  syncToken?: string; // Google Calendar sync token
  deltaLink?: string; // Microsoft Graph delta link

  // Sync timestamps
  lastFullSyncAt?: string; // Last full calendar sync
  lastIncrementalSyncAt?: string; // Last incremental/delta sync
  lastSyncError?: string; // Most recent sync error

  // Webhook/push notification data
  webhookChannelId?: string; // Channel ID for push notifications
  webhookResourceId?: string; // Google resourceId for stop channel
  webhookExpiration?: string; // When webhook subscription expires

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
