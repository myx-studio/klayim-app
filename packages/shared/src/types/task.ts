/**
 * Task provider sources
 */
export type TaskProvider = "asana" | "clickup" | "linear";

/**
 * Normalized task status across providers
 */
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

/**
 * Time tracking entry for tasks (Asana and ClickUp)
 * Linear only has estimates, no time entries
 */
export interface TaskTimeEntry {
  id: string;
  taskId: string;
  durationMinutes: number;
  startedAt?: string;
  createdAt: string;
  userId?: string; // External user ID from provider
}

/**
 * Normalized task representation across all providers
 *
 * Field mapping:
 * - Asana: gid -> externalId, completed_at -> completedAt, actual_time_minutes -> timeSpentMinutes
 * - ClickUp: id -> externalId, date_closed -> completedAt, time_spent (ms) -> timeSpentMinutes
 * - Linear: id -> externalId, completedAt -> completedAt, estimate -> estimatePoints (no time tracking)
 */
export interface Task {
  id: string;
  organizationId: string;
  integrationId: string; // Reference to integration that synced this task

  // Provider identification
  provider: TaskProvider;
  externalId: string; // Provider's task ID

  // Core task data
  title: string;
  description?: string;
  status: TaskStatus;

  // Assignee (matched to Employee by email if possible)
  assigneeEmail?: string;
  assigneeExternalId?: string; // Provider's user ID
  assigneeName?: string;

  // Dates
  createdAt: string; // ISO string - when task was created in provider
  completedAt?: string; // ISO string - when task was marked complete
  dueAt?: string; // ISO string - task due date

  // Time tracking (Asana and ClickUp only)
  timeSpentMinutes?: number; // Total time tracked
  timeEstimateMinutes?: number; // Estimated time

  // Linear-specific (story points, not time)
  estimatePoints?: number;

  // Project/workspace context
  projectId?: string; // Provider's project/list ID
  projectName?: string;
  workspaceId?: string; // Provider's workspace/team ID

  // Sync metadata
  syncedAt: string; // ISO string - when we last synced this task
  updatedAt: string; // ISO string - when task was last modified in provider
}

/**
 * Sync state for task providers (same pattern as calendar)
 * Tracks incremental sync tokens
 */
export interface TaskSyncState {
  id: string;
  integrationId: string;
  organizationId: string;
  provider: TaskProvider;

  // Sync tokens vary by provider
  syncToken?: string; // Asana sync token
  lastSyncTimestamp?: number; // ClickUp uses timestamp
  cursor?: string; // Linear uses cursor-based pagination

  lastSyncAt: string;
  lastSyncStatus: "success" | "error" | "in_progress";
  lastError?: string;
  taskCount: number;
}
