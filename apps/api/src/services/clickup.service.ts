import type { Task, TaskStatus } from "@klayim/shared/types";

interface ClickUpTokenResponse {
  access_token: string;
}

interface ClickUpUser {
  id: number;
  username: string;
  email: string;
}

interface ClickUpWorkspace {
  id: string;
  name: string;
}

interface ClickUpSpace {
  id: string;
  name: string;
}

interface ClickUpList {
  id: string;
  name: string;
}

interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: { status: string };
  date_created: string;
  date_closed?: string;
  date_done?: string;
  due_date?: string;
  time_spent?: number; // milliseconds
  time_estimate?: number; // milliseconds
  assignees: Array<{ id: number; email: string; username: string }>;
  list: { id: string; name: string };
  folder: { id: string; name: string };
}

interface ClickUpUserResponse {
  user: ClickUpUser;
}

interface ClickUpTeamsResponse {
  teams: ClickUpWorkspace[];
}

interface ClickUpSpacesResponse {
  spaces: ClickUpSpace[];
}

interface ClickUpListsResponse {
  lists: ClickUpList[];
}

interface ClickUpTasksResponse {
  tasks: ClickUpTask[];
}

/**
 * ClickUp Service
 *
 * Handles OAuth flow and API interactions with ClickUp.
 * ClickUp has no official SDK - uses direct fetch with typed responses.
 * Note: ClickUp tokens don't expire - no refresh needed.
 */
class ClickUpService {
  private readonly clientId = process.env.CLICKUP_CLIENT_ID!;
  private readonly clientSecret = process.env.CLICKUP_CLIENT_SECRET!;
  private readonly redirectUri = `${process.env.API_URL}/oauth/clickup/callback`;
  private readonly baseUrl = "https://api.clickup.com/api/v2";

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
    });
    return `https://app.clickup.com/api?${params}`;
  }

  /**
   * Exchange authorization code for token
   * ClickUp tokens don't expire - no refresh needed
   */
  async exchangeCode(code: string): Promise<{
    accessToken: string;
  }> {
    // ClickUp uses query params, not body
    const url =
      `${this.baseUrl}/oauth/token?` +
      `client_id=${this.clientId}` +
      `&client_secret=${this.clientSecret}` +
      `&code=${code}`;

    const response = await fetch(url, { method: "POST" });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ClickUp token exchange failed: ${error}`);
    }

    const data = (await response.json()) as ClickUpTokenResponse;
    return { accessToken: data.access_token };
  }

  /**
   * Get authenticated user info
   */
  async getUser(accessToken: string): Promise<ClickUpUser> {
    const response = await fetch(`${this.baseUrl}/user`, {
      headers: { Authorization: accessToken },
    });

    if (!response.ok) {
      throw new Error("Failed to get ClickUp user");
    }

    const data = (await response.json()) as ClickUpUserResponse;
    return data.user;
  }

  /**
   * Get workspaces (teams in ClickUp terminology)
   * Per research: ClickUp uses "team" for workspace in API
   */
  async getWorkspaces(accessToken: string): Promise<ClickUpWorkspace[]> {
    const response = await fetch(`${this.baseUrl}/team`, {
      headers: { Authorization: accessToken },
    });

    if (!response.ok) {
      throw new Error("Failed to get ClickUp workspaces");
    }

    const data = (await response.json()) as ClickUpTeamsResponse;
    return data.teams.map((team) => ({
      id: team.id,
      name: team.name,
    }));
  }

  /**
   * Get spaces in a workspace
   */
  async getSpaces(accessToken: string, workspaceId: string): Promise<ClickUpSpace[]> {
    const response = await fetch(`${this.baseUrl}/team/${workspaceId}/space`, {
      headers: { Authorization: accessToken },
    });

    if (!response.ok) {
      throw new Error("Failed to get ClickUp spaces");
    }

    const data = (await response.json()) as ClickUpSpacesResponse;
    return data.spaces;
  }

  /**
   * Get lists in a space (tasks belong to lists)
   */
  async getLists(accessToken: string, spaceId: string): Promise<ClickUpList[]> {
    const response = await fetch(`${this.baseUrl}/space/${spaceId}/list`, {
      headers: { Authorization: accessToken },
    });

    if (!response.ok) {
      throw new Error("Failed to get ClickUp lists");
    }

    const data = (await response.json()) as ClickUpListsResponse;
    return data.lists;
  }

  /**
   * Fetch tasks from a list with time tracking data
   */
  async getTasks(accessToken: string, listId: string): Promise<ClickUpTask[]> {
    const response = await fetch(
      `${this.baseUrl}/list/${listId}/task?include_closed=true`,
      {
        headers: {
          Authorization: accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get ClickUp tasks");
    }

    const data = (await response.json()) as ClickUpTasksResponse;
    return data.tasks;
  }

  /**
   * Normalize ClickUp task to unified Task type
   */
  normalizeTask(
    clickupTask: ClickUpTask,
    organizationId: string,
    integrationId: string,
    workspaceId: string
  ): Task {
    // Map ClickUp status to normalized status
    const statusLower = clickupTask.status.status.toLowerCase();
    let status: TaskStatus = "todo";
    if (statusLower === "complete" || statusLower === "closed" || clickupTask.date_closed) {
      status = "done";
    } else if (statusLower.includes("progress") || statusLower === "in progress") {
      status = "in_progress";
    }

    // ClickUp time is in milliseconds, convert to minutes
    const timeSpentMinutes = clickupTask.time_spent
      ? Math.round(clickupTask.time_spent / 60000)
      : undefined;
    const timeEstimateMinutes = clickupTask.time_estimate
      ? Math.round(clickupTask.time_estimate / 60000)
      : undefined;

    // Get primary assignee (first in list)
    const primaryAssignee = clickupTask.assignees[0];

    return {
      id: "", // Generated by repository
      organizationId,
      integrationId,
      provider: "clickup",
      externalId: clickupTask.id,
      title: clickupTask.name,
      description: clickupTask.description,
      status,
      assigneeEmail: primaryAssignee?.email,
      assigneeExternalId: primaryAssignee?.id?.toString(),
      assigneeName: primaryAssignee?.username,
      createdAt: new Date(parseInt(clickupTask.date_created)).toISOString(),
      completedAt: clickupTask.date_closed
        ? new Date(parseInt(clickupTask.date_closed)).toISOString()
        : undefined,
      dueAt: clickupTask.due_date
        ? new Date(parseInt(clickupTask.due_date)).toISOString()
        : undefined,
      timeSpentMinutes,
      timeEstimateMinutes,
      projectId: clickupTask.list.id,
      projectName: clickupTask.list.name,
      workspaceId,
      syncedAt: new Date().toISOString(),
      updatedAt: new Date(parseInt(clickupTask.date_created)).toISOString(),
    };
  }
}

export const clickupService = new ClickUpService();
