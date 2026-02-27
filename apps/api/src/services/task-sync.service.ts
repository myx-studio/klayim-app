import { taskRepository } from "../repositories/task.repository.js";
import { integrationRepository } from "../repositories/integration.repository.js";
import { asanaService } from "./asana.service.js";
import { clickupService } from "./clickup.service.js";
import { linearService } from "./linear.service.js";
import type { Task, TaskSyncState, TaskProvider } from "@klayim/shared/types";

interface SyncResult {
  success: boolean;
  tasksImported: number;
  error?: string;
}

/**
 * Task Sync Service
 *
 * Orchestrates task synchronization from task management providers.
 * Handles initial sync after OAuth connection and incremental updates.
 */
class TaskSyncService {
  /**
   * Trigger initial sync after OAuth connection (async, non-blocking)
   * Called from OAuth callback routes after successful connection
   */
  async triggerInitialSync(organizationId: string, provider: TaskProvider): Promise<void> {
    console.log(`Triggering initial task sync for ${provider} in org ${organizationId}`);

    try {
      // Get integration
      const integrations = await integrationRepository.findByOrganizationAndProvider(
        organizationId,
        provider
      );
      const integration = integrations.find((i) => i.status === "connected");

      if (!integration) {
        console.error(`No connected ${provider} integration found for org ${organizationId}`);
        return;
      }

      // Update sync state to in_progress
      await taskRepository.updateSyncState({
        id: integration.id,
        integrationId: integration.id,
        organizationId,
        provider,
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: "in_progress",
        taskCount: 0,
      });

      // Run sync
      const result = await this.syncFromProvider(integration.id);

      // Update sync state with result
      const currentState = await taskRepository.getSyncState(integration.id);
      await taskRepository.updateSyncState({
        ...currentState!,
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: result.success ? "success" : "error",
        lastError: result.error,
        taskCount: result.tasksImported,
      });

      console.log(`Task sync completed: ${result.tasksImported} tasks imported`);
    } catch (error) {
      console.error(`Task sync failed:`, error);
    }
  }

  /**
   * Sync tasks from a specific integration
   */
  async syncFromProvider(integrationId: string): Promise<SyncResult> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) {
      return { success: false, tasksImported: 0, error: "Integration not found" };
    }

    // Get decrypted credentials
    const credentials = await integrationRepository.getDecryptedCredentials(integration);
    const accessToken = credentials.accessToken;

    switch (integration.provider) {
      case "asana":
        return this.syncFromAsana(integration.id, integration.organizationId, accessToken);
      case "clickup":
        return this.syncFromClickUp(
          integration.id,
          integration.organizationId,
          accessToken,
          integration.accountId
        );
      case "linear":
        return this.syncFromLinear(integration.id, integration.organizationId, accessToken);
      default:
        return { success: false, tasksImported: 0, error: `Unknown provider: ${integration.provider}` };
    }
  }

  /**
   * Sync tasks from Asana
   * Fetches all workspaces, all projects, all tasks
   */
  private async syncFromAsana(
    integrationId: string,
    organizationId: string,
    accessToken: string
  ): Promise<SyncResult> {
    try {
      const tasks: Omit<Task, "id">[] = [];

      // Get all workspaces
      const workspaces = await asanaService.getWorkspaces(accessToken);

      for (const workspace of workspaces) {
        // Get all projects in workspace
        const projects = await asanaService.getProjects(accessToken, workspace.gid);

        for (const project of projects) {
          // Get all tasks in project
          const asanaTasks = await asanaService.getTasks(accessToken, project.gid);

          for (const asanaTask of asanaTasks) {
            const normalizedTask = asanaService.normalizeTask(
              asanaTask,
              organizationId,
              integrationId,
              project.gid,
              project.name
            );
            tasks.push(normalizedTask);
          }
        }
      }

      // Bulk upsert
      const count = await taskRepository.bulkUpsertTasks(tasks);
      return { success: true, tasksImported: count };
    } catch (error) {
      return {
        success: false,
        tasksImported: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sync tasks from ClickUp
   * Uses workspace ID from accountId
   */
  private async syncFromClickUp(
    integrationId: string,
    organizationId: string,
    accessToken: string,
    workspaceId: string
  ): Promise<SyncResult> {
    try {
      const tasks: Omit<Task, "id">[] = [];

      // Get spaces in workspace
      const spaces = await clickupService.getSpaces(accessToken, workspaceId);

      for (const space of spaces) {
        // Get lists in space
        const lists = await clickupService.getLists(accessToken, space.id);

        for (const list of lists) {
          // Get tasks in list
          const clickupTasks = await clickupService.getTasks(accessToken, list.id);

          for (const clickupTask of clickupTasks) {
            const normalizedTask = clickupService.normalizeTask(
              clickupTask,
              organizationId,
              integrationId,
              workspaceId
            );
            tasks.push(normalizedTask);
          }
        }
      }

      // Bulk upsert
      const count = await taskRepository.bulkUpsertTasks(tasks);
      return { success: true, tasksImported: count };
    } catch (error) {
      return {
        success: false,
        tasksImported: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sync issues from Linear
   * Fetches all teams and their issues
   */
  private async syncFromLinear(
    integrationId: string,
    organizationId: string,
    accessToken: string
  ): Promise<SyncResult> {
    try {
      const tasks: Omit<Task, "id">[] = [];

      // Get all teams
      const teams = await linearService.getTeams(accessToken);

      for (const team of teams) {
        // Get issues in team
        const issues = await linearService.getIssues(accessToken, team.id);

        for (const issue of issues) {
          const normalizedTask = linearService.normalizeTask(
            issue,
            organizationId,
            integrationId,
            team.id
          );
          tasks.push(normalizedTask);
        }
      }

      // Bulk upsert
      const count = await taskRepository.bulkUpsertTasks(tasks);
      return { success: true, tasksImported: count };
    } catch (error) {
      return {
        success: false,
        tasksImported: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get sync status for an integration
   */
  async getSyncStatus(integrationId: string): Promise<TaskSyncState | null> {
    return taskRepository.getSyncState(integrationId);
  }
}

export const taskSyncService = new TaskSyncService();
