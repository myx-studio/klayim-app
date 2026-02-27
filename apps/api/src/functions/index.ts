/**
 * Scheduled Functions Index
 *
 * Exports all scheduled/background functions for the API.
 * These functions are designed to be triggered by:
 * - Cloud Scheduler
 * - Firebase Functions scheduled triggers
 * - Cron jobs
 * - Manual invocation for testing
 */

export { calendarPollFunction, type CalendarPollResult } from "./calendar-poll.function.js";
export { webhookRenewFunction, type WebhookRenewResult } from "./webhook-renew.function.js";
