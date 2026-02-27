import {
  calendarEventRepository,
  syncStateRepository,
  integrationRepository,
} from "@/repositories/index.js";
import { tokenRefreshService } from "./token-refresh.service.js";
import { googleCalendarService } from "./google-calendar.service.js";
import { microsoftCalendarService } from "./microsoft-calendar.service.js";
import type { Integration } from "@klayim/shared/types";

/**
 * Result from sync operations
 */
export interface SyncResult {
  eventsImported?: number;
  eventsUpdated?: number;
  eventsDeleted?: number;
}

/**
 * Calendar Sync Service
 *
 * Orchestrates full and incremental sync of calendar events from Google and Microsoft.
 * Uses sync tokens (Google) and delta links (Microsoft) for efficient incremental updates.
 *
 * Flow:
 * 1. Initial sync: triggerInitialSync() - Called after OAuth connection
 * 2. Full sync: fullSync() - Fetches all events from last 90 days
 * 3. Incremental sync: incrementalSync() - Uses sync token for delta changes
 */
class CalendarSyncService {
  /**
   * Trigger initial sync after OAuth connection
   * Creates sync state record and performs full sync
   *
   * @param integrationId - Integration ID to sync
   */
  async triggerInitialSync(integrationId: string): Promise<void> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) {
      console.error(`[CalendarSync] Integration not found: ${integrationId}`);
      return;
    }

    console.log(
      `[CalendarSync] Starting initial sync for ${integration.provider} (${integration.accountEmail})`
    );

    try {
      // Create sync state record
      const existingState = await syncStateRepository.findByIntegration(integrationId);
      if (!existingState) {
        await syncStateRepository.create({
          organizationId: integration.organizationId,
          integrationId,
        });
      }

      // Perform full sync
      const result = await this.fullSync(integrationId);
      console.log(
        `[CalendarSync] Initial sync complete: ${result.eventsImported} events imported`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[CalendarSync] Initial sync failed: ${message}`);

      // Record error in sync state
      await syncStateRepository.update(integrationId, {
        lastSyncError: message,
      });

      // Mark integration as error
      await integrationRepository.markAsError(integrationId, message);
    }
  }

  /**
   * Perform full sync - fetches all events from provider
   *
   * @param integrationId - Integration ID to sync
   * @returns Number of events imported
   */
  async fullSync(integrationId: string): Promise<SyncResult> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    // Get valid access token (refreshes if needed)
    const accessToken = await tokenRefreshService.getValidToken(integrationId);

    let result: SyncResult;

    switch (integration.provider) {
      case "google_calendar":
        result = await this.syncGoogleCalendar(integration, accessToken, false);
        break;

      case "microsoft_calendar":
        result = await this.syncMicrosoftCalendar(integration, accessToken, false);
        break;

      default:
        throw new Error(`Unsupported provider: ${integration.provider}`);
    }

    // Update sync state
    await syncStateRepository.update(integrationId, {
      lastFullSyncAt: new Date().toISOString(),
      lastSyncError: undefined,
    });

    return result;
  }

  /**
   * Perform incremental sync - fetches only changed events since last sync
   *
   * @param integrationId - Integration ID to sync
   * @returns Number of events updated
   */
  async incrementalSync(integrationId: string): Promise<SyncResult> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    // Get sync state for stored token
    const syncState = await syncStateRepository.findByIntegration(integrationId);
    if (!syncState) {
      // No sync state - need full sync first
      console.log(
        `[CalendarSync] No sync state found, performing full sync for ${integrationId}`
      );
      return this.fullSync(integrationId);
    }

    // Check if we have a sync token/delta link
    const hasToken =
      (integration.provider === "google_calendar" && syncState.syncToken) ||
      (integration.provider === "microsoft_calendar" && syncState.deltaLink);

    if (!hasToken) {
      // No token - need full sync
      console.log(
        `[CalendarSync] No sync token found, performing full sync for ${integrationId}`
      );
      return this.fullSync(integrationId);
    }

    // Get valid access token
    const accessToken = await tokenRefreshService.getValidToken(integrationId);

    let result: SyncResult;

    try {
      switch (integration.provider) {
        case "google_calendar":
          result = await this.syncGoogleCalendar(integration, accessToken, true, syncState.syncToken);
          break;

        case "microsoft_calendar":
          result = await this.syncMicrosoftCalendar(integration, accessToken, true, syncState.deltaLink);
          break;

        default:
          throw new Error(`Unsupported provider: ${integration.provider}`);
      }

      // Update sync state
      await syncStateRepository.update(integrationId, {
        lastIncrementalSyncAt: new Date().toISOString(),
        lastSyncError: undefined,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[CalendarSync] Incremental sync failed: ${message}`);

      // Record error
      await syncStateRepository.update(integrationId, {
        lastSyncError: message,
      });

      throw error;
    }
  }

  /**
   * Sync Google Calendar events
   */
  private async syncGoogleCalendar(
    integration: Integration,
    accessToken: string,
    incremental: boolean,
    syncToken?: string
  ): Promise<SyncResult> {
    const result = await googleCalendarService.listEvents(accessToken, {
      syncToken: incremental ? syncToken : undefined,
    });

    // Handle 410 GONE - need full sync
    if (result.needsFullSync) {
      console.log(
        `[CalendarSync] Sync token expired for ${integration.id}, performing full sync`
      );
      // Clear events and sync state, then do full sync
      await calendarEventRepository.deleteByIntegration(integration.id);
      await syncStateRepository.update(integration.id, {
        syncToken: undefined,
      });
      return this.fullSync(integration.id);
    }

    let eventsImported = 0;
    let eventsDeleted = 0;

    // Process events
    for (const googleEvent of result.events) {
      const calendarEvent = googleCalendarService.mapToCalendarEvent(
        googleEvent,
        integration.id,
        integration.organizationId
      );

      if (calendarEvent.status === "cancelled") {
        // Handle deleted/cancelled events
        const existing = await calendarEventRepository.findByExternalId(
          integration.id,
          calendarEvent.externalId
        );
        if (existing) {
          await calendarEventRepository.delete(existing.id);
          eventsDeleted++;
        }
      } else {
        // Upsert event
        await calendarEventRepository.upsertByExternalId(
          integration.id,
          calendarEvent.externalId,
          calendarEvent
        );
        eventsImported++;
      }
    }

    // Update sync token
    if (result.nextSyncToken) {
      await syncStateRepository.updateSyncToken(integration.id, {
        syncToken: result.nextSyncToken,
      });
    }

    return {
      eventsImported,
      eventsUpdated: incremental ? eventsImported : undefined,
      eventsDeleted,
    };
  }

  /**
   * Sync Microsoft Calendar events
   */
  private async syncMicrosoftCalendar(
    integration: Integration,
    accessToken: string,
    incremental: boolean,
    deltaLink?: string
  ): Promise<SyncResult> {
    const result = await microsoftCalendarService.listEvents(accessToken, {
      deltaLink: incremental ? deltaLink : undefined,
    });

    let eventsImported = 0;
    let eventsDeleted = 0;

    // Process events
    for (const msEvent of result.events) {
      // Check for deleted events (Microsoft uses @removed marker)
      if (msEvent["@removed"]) {
        const existing = await calendarEventRepository.findByExternalId(
          integration.id,
          msEvent.id || ""
        );
        if (existing) {
          await calendarEventRepository.delete(existing.id);
          eventsDeleted++;
        }
        continue;
      }

      const calendarEvent = microsoftCalendarService.mapToCalendarEvent(
        msEvent,
        integration.id,
        integration.organizationId
      );

      if (calendarEvent.status === "cancelled") {
        // Handle cancelled events
        const existing = await calendarEventRepository.findByExternalId(
          integration.id,
          calendarEvent.externalId
        );
        if (existing) {
          await calendarEventRepository.delete(existing.id);
          eventsDeleted++;
        }
      } else {
        // Upsert event
        await calendarEventRepository.upsertByExternalId(
          integration.id,
          calendarEvent.externalId,
          calendarEvent
        );
        eventsImported++;
      }
    }

    // Update delta link
    if (result.nextDeltaLink) {
      await syncStateRepository.updateSyncToken(integration.id, {
        deltaLink: result.nextDeltaLink,
      });
    }

    return {
      eventsImported,
      eventsUpdated: incremental ? eventsImported : undefined,
      eventsDeleted,
    };
  }
}

export const calendarSyncService = new CalendarSyncService();
