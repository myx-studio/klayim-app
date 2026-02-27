import { LinearClient } from "@linear/sdk";
import type { Task, TaskStatus } from "@klayim/shared/types";

interface LinearTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: { name: string; type: string };
  assignee?: { id: string; email: string; name: string };
  createdAt: Date;
  completedAt?: Date;
  dueDate?: string;
  estimate?: number;
  project?: { id: string; name: string };
  updatedAt: Date;
}

/**
 * Linear Service
 *
 * Handles OAuth flow and API interactions with Linear.
 * Uses @linear/sdk for typed GraphQL queries.
 *
 * Note: Linear uses story points (estimate) not time tracking.
 * Per research: Linear is migrating to mandatory refresh tokens (April 2026)
 */
class LinearService {
  private readonly clientId = process.env.LINEAR_CLIENT_ID!;
  private readonly clientSecret = process.env.LINEAR_CLIENT_SECRET!;
  private readonly redirectUri = `${process.env.API_URL}/oauth/linear/callback`;

  /**
   * Generate OAuth authorization URL
   * Linear supports PKCE but we use standard OAuth for simplicity
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "read", // Read-only access to issues
      state,
    });
    return `https://linear.app/oauth/authorize?${params}`;
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
    const response = await fetch("https://api.linear.app/oauth/token", {
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
      throw new Error(`Linear token exchange failed: ${error}`);
    }

    const data = (await response.json()) as LinearTokenResponse;

    // Get user info via SDK
    const client = new LinearClient({ accessToken: data.access_token });
    const viewer = await client.viewer;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      accountId: viewer.id,
      accountEmail: viewer.email || "",
      accountName: viewer.name || "",
    };
  }

  /**
   * Refresh expired access token
   * Per research: Linear is migrating to mandatory refresh tokens (April 2026)
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await fetch("https://api.linear.app/oauth/token", {
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
      throw new Error(`Linear token refresh failed: ${error}`);
    }

    const data = (await response.json()) as LinearTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get teams (workspaces) for the authenticated user
   */
  async getTeams(accessToken: string): Promise<Array<{ id: string; name: string; key: string }>> {
    const client = new LinearClient({ accessToken });
    const teams = await client.teams();

    return teams.nodes.map((team) => ({
      id: team.id,
      name: team.name,
      key: team.key,
    }));
  }

  /**
   * Get projects in a team
   */
  async getProjects(
    accessToken: string,
    teamId: string
  ): Promise<Array<{ id: string; name: string }>> {
    const client = new LinearClient({ accessToken });
    const team = await client.team(teamId);
    const projects = await team.projects();

    return projects.nodes.map((project) => ({
      id: project.id,
      name: project.name,
    }));
  }

  /**
   * Fetch issues from a team
   * Per research: Linear has estimate (points) not time tracking
   */
  async getIssues(accessToken: string, teamId: string): Promise<LinearIssue[]> {
    const client = new LinearClient({ accessToken });
    const issues = await client.issues({
      filter: { team: { id: { eq: teamId } } },
      includeArchived: false,
    });

    const results: LinearIssue[] = [];
    for (const issue of issues.nodes) {
      const state = await issue.state;
      const assignee = await issue.assignee;
      const project = await issue.project;

      results.push({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description || undefined,
        state: state ? { name: state.name, type: state.type } : { name: "Unknown", type: "triage" },
        assignee: assignee
          ? { id: assignee.id, email: assignee.email || "", name: assignee.name || "" }
          : undefined,
        createdAt: issue.createdAt,
        completedAt: issue.completedAt || undefined,
        dueDate: issue.dueDate || undefined,
        estimate: issue.estimate || undefined,
        project: project ? { id: project.id, name: project.name } : undefined,
        updatedAt: issue.updatedAt,
      });
    }

    return results;
  }

  /**
   * Normalize Linear issue to unified Task type
   * Per research: estimate is story points, NOT time tracking
   */
  normalizeTask(
    linearIssue: LinearIssue,
    organizationId: string,
    integrationId: string,
    teamId: string
  ): Task {
    // Map Linear state types to normalized status
    let status: TaskStatus = "todo";
    const stateType = linearIssue.state.type.toLowerCase();
    if (stateType === "completed" || linearIssue.completedAt) {
      status = "done";
    } else if (stateType === "started") {
      status = "in_progress";
    } else if (stateType === "canceled" || stateType === "cancelled") {
      status = "cancelled";
    }

    return {
      id: "", // Generated by repository
      organizationId,
      integrationId,
      provider: "linear",
      externalId: linearIssue.id,
      title: `${linearIssue.identifier}: ${linearIssue.title}`,
      description: linearIssue.description,
      status,
      assigneeEmail: linearIssue.assignee?.email,
      assigneeExternalId: linearIssue.assignee?.id,
      assigneeName: linearIssue.assignee?.name,
      createdAt: linearIssue.createdAt.toISOString(),
      completedAt: linearIssue.completedAt?.toISOString(),
      dueAt: linearIssue.dueDate,
      // Linear uses estimates (story points), not time tracking
      estimatePoints: linearIssue.estimate,
      // No time tracking for Linear
      timeSpentMinutes: undefined,
      timeEstimateMinutes: undefined,
      projectId: linearIssue.project?.id,
      projectName: linearIssue.project?.name,
      workspaceId: teamId,
      syncedAt: new Date().toISOString(),
      updatedAt: linearIssue.updatedAt.toISOString(),
    };
  }
}

export const linearService = new LinearService();
