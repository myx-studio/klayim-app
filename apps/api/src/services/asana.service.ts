import type { Task, TaskStatus } from "@klayim/shared/types";

interface AsanaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  data: { id: string; name: string; email: string };
}

interface AsanaRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface AsanaWorkspace {
  gid: string;
  name: string;
}

interface AsanaProject {
  gid: string;
  name: string;
}

interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  due_at?: string;
  actual_time_minutes?: number;
  assignee?: { gid: string; name: string; email: string };
}

interface AsanaResponse<T> {
  data: T;
}

/**
 * Asana Service
 *
 * Handles OAuth flow and API interactions with Asana.
 * Uses direct fetch calls for typed requests.
 */
class AsanaService {
  private readonly clientId = process.env.ASANA_CLIENT_ID!;
  private readonly clientSecret = process.env.ASANA_CLIENT_SECRET!;
  private readonly redirectUri = `${process.env.API_URL}/oauth/asana/callback`;
  private readonly baseUrl = "https://app.asana.com/api/1.0";

  /**
   * Generate OAuth authorization URL
   * State contains organizationId and redirectUrl as JSON
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      state,
    });
    return `https://app.asana.com/-/oauth_authorize?${params}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    accountId: string;
    accountEmail: string;
    accountName: string;
  }> {
    const response = await fetch("https://app.asana.com/-/oauth_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Asana token exchange failed: ${error}`);
    }

    const data = (await response.json()) as AsanaTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      accountId: data.data.id,
      accountEmail: data.data.email,
      accountName: data.data.name,
    };
  }

  /**
   * Refresh expired access token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await fetch("https://app.asana.com/-/oauth_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Asana token refresh failed: ${error}`);
    }

    const data = (await response.json()) as AsanaRefreshResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get workspaces for the authenticated user
   */
  async getWorkspaces(accessToken: string): Promise<AsanaWorkspace[]> {
    const response = await fetch(`${this.baseUrl}/workspaces`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to get Asana workspaces");
    }

    const data = (await response.json()) as AsanaResponse<AsanaWorkspace[]>;
    return data.data;
  }

  /**
   * Get projects in a workspace
   */
  async getProjects(accessToken: string, workspaceGid: string): Promise<AsanaProject[]> {
    const response = await fetch(`${this.baseUrl}/workspaces/${workspaceGid}/projects`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to get Asana projects");
    }

    const data = (await response.json()) as AsanaResponse<AsanaProject[]>;
    return data.data;
  }

  /**
   * Fetch tasks from a project with time tracking
   * Per research: actual_time_minutes is on task, detailed entries need separate call
   */
  async getTasks(accessToken: string, projectGid: string): Promise<AsanaTask[]> {
    const fields = [
      "gid",
      "name",
      "notes",
      "completed",
      "completed_at",
      "created_at",
      "due_at",
      "actual_time_minutes",
      "assignee",
      "assignee.email",
      "assignee.name",
    ].join(",");

    const response = await fetch(
      `${this.baseUrl}/projects/${projectGid}/tasks?opt_fields=${fields}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      throw new Error("Failed to get Asana tasks");
    }

    const data = (await response.json()) as AsanaResponse<AsanaTask[]>;
    return data.data;
  }

  /**
   * Normalize Asana task to unified Task type
   */
  normalizeTask(
    asanaTask: AsanaTask,
    organizationId: string,
    integrationId: string,
    projectGid: string,
    projectName?: string
  ): Task {
    const status: TaskStatus = asanaTask.completed ? "done" : "todo";

    return {
      id: "", // Generated by repository
      organizationId,
      integrationId,
      provider: "asana",
      externalId: asanaTask.gid,
      title: asanaTask.name,
      description: asanaTask.notes,
      status,
      assigneeEmail: asanaTask.assignee?.email,
      assigneeExternalId: asanaTask.assignee?.gid,
      assigneeName: asanaTask.assignee?.name,
      createdAt: asanaTask.created_at,
      completedAt: asanaTask.completed_at,
      dueAt: asanaTask.due_at,
      timeSpentMinutes: asanaTask.actual_time_minutes,
      projectId: projectGid,
      projectName,
      syncedAt: new Date().toISOString(),
      updatedAt: asanaTask.created_at, // Asana doesn't return updated_at in task list
    };
  }
}

export const asanaService = new AsanaService();
