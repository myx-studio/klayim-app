import { fetcher } from "@/lib/fetcher";
import type { ApiResponse } from "@klayim/shared";

/**
 * Get Asana OAuth authorization URL
 */
export async function getAsanaAuthUrl(
  organizationId: string,
  redirectUrl: string
): Promise<{ url: string }> {
  const response = await fetcher<ApiResponse<{ url: string }>>(
    "/oauth/asana/authorize",
    {
      params: { organizationId, redirectUrl },
    }
  );
  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to get Asana authorization URL");
  }
  return response.data;
}

/**
 * Get ClickUp OAuth authorization URL
 */
export async function getClickUpAuthUrl(
  organizationId: string,
  redirectUrl: string
): Promise<{ url: string }> {
  const response = await fetcher<ApiResponse<{ url: string }>>(
    "/oauth/clickup/authorize",
    {
      params: { organizationId, redirectUrl },
    }
  );
  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to get ClickUp authorization URL");
  }
  return response.data;
}

/**
 * Get Linear OAuth authorization URL
 */
export async function getLinearAuthUrl(
  organizationId: string,
  redirectUrl: string
): Promise<{ url: string }> {
  const response = await fetcher<ApiResponse<{ url: string }>>(
    "/oauth/linear/authorize",
    {
      params: { organizationId, redirectUrl },
    }
  );
  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to get Linear authorization URL");
  }
  return response.data;
}

/**
 * Get task sync status for an organization
 */
export async function getTaskSyncStatus(
  organizationId: string,
  provider: "asana" | "clickup" | "linear"
): Promise<{
  status: "connected" | "disconnected" | "syncing" | "error";
  taskCount?: number;
  lastSyncAt?: string;
  error?: string;
}> {
  const response = await fetcher<
    ApiResponse<{
      status: "connected" | "disconnected" | "syncing" | "error";
      taskCount?: number;
      lastSyncAt?: string;
      error?: string;
    }>
  >(`/integrations/task/${provider}/status`, {
    params: { organizationId },
  });
  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to get task sync status");
  }
  return response.data;
}
