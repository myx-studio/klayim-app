import { integrationRepository } from "@/repositories/integration.repository.js";
import { calendarSyncService } from "@/services/calendar-sync.service.js";
import type { IntegrationProvider } from "@klayim/shared/types";

/**
 * Calendar Poll Function
 *
 * Scheduled function that runs every 15 minutes to poll all connected
 * calendar integrations. This serves as a fallback for any events that
 * webhooks might have missed.
 *
 * In production, this would be triggered by:
 * - Cloud Scheduler
 * - Firebase Functions scheduled trigger
 * - Cron job
 */
export interface CalendarPollResult {
  integrationsSynced: number;
  errors: string[];
  duration: number;
}

/**
 * Poll all connected calendar integrations and trigger incremental sync
 */
export async function calendarPollFunction(): Promise<CalendarPollResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let integrationsSynced = 0;

  console.log("[CalendarPoll] Starting polling cycle");

  try {
    // Find all connected calendar integrations
    const calendarProviders: IntegrationProvider[] = ["google_calendar", "microsoft_calendar"];
    const allIntegrations = [];

    for (const provider of calendarProviders) {
      const integrations = await integrationRepository.findAllConnectedByProvider(provider);
      allIntegrations.push(...integrations);
    }

    console.log(`[CalendarPoll] Found ${allIntegrations.length} connected calendar integrations`);

    for (const integration of allIntegrations) {
      try {
        console.log(`[CalendarPoll] Syncing integration: ${integration.id} (${integration.provider})`);
        await calendarSyncService.incrementalSync(integration.id);
        integrationsSynced++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[CalendarPoll] Failed to sync ${integration.id}:`, message);
        errors.push(`${integration.id}: ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[CalendarPoll] Fatal error:", message);
    errors.push(`Fatal: ${message}`);
  }

  const duration = Date.now() - startTime;
  console.log(
    `[CalendarPoll] Completed: ${integrationsSynced} synced, ${errors.length} errors, ${duration}ms`
  );

  return {
    integrationsSynced,
    errors,
    duration,
  };
}

// Export for use as a scheduled function handler
export default calendarPollFunction;
