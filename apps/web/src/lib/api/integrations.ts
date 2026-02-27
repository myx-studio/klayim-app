import { fetcher } from "@/lib/fetcher";
import type { ApiResponse, Integration } from "@klayim/shared";

/**
 * Get the Google OAuth authorization URL
 *
 * @param organizationId - Organization ID to connect calendar for
 * @param redirectUrl - Frontend URL to redirect after OAuth completes
 * @returns Authorization URL to redirect user to
 */
export async function getGoogleAuthUrl(
  organizationId: string,
  redirectUrl: string
): Promise<{ url: string }> {
  const response = await fetcher<ApiResponse<{ url: string }>>(
    "/oauth/google/authorize",
    {
      params: {
        organizationId,
        redirectUrl,
      },
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to get Google authorization URL");
  }

  return response.data;
}

/**
 * Get the Microsoft OAuth authorization URL
 *
 * @param organizationId - Organization ID to connect calendar for
 * @param redirectUrl - Frontend URL to redirect after OAuth completes
 * @returns Authorization URL to redirect user to
 */
export async function getMicrosoftAuthUrl(
  organizationId: string,
  redirectUrl: string
): Promise<{ url: string }> {
  const response = await fetcher<ApiResponse<{ url: string }>>(
    "/oauth/microsoft/authorize",
    {
      params: {
        organizationId,
        redirectUrl,
      },
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to get Microsoft authorization URL");
  }

  return response.data;
}

/**
 * Get all integrations for an organization
 *
 * @param organizationId - Organization ID to get integrations for
 * @returns List of connected integrations
 */
export async function getIntegrations(organizationId: string): Promise<Integration[]> {
  const response = await fetcher<ApiResponse<Integration[]>>(
    "/integrations",
    {
      params: {
        organizationId,
      },
    }
  );

  if (!response.success) {
    throw new Error(response.error || "Failed to get integrations");
  }

  return response.data || [];
}

/**
 * Disconnect an integration
 *
 * @param integrationId - Integration ID to disconnect
 */
export async function disconnectIntegration(integrationId: string): Promise<void> {
  const response = await fetcher<ApiResponse<void>>(
    `/integrations/${integrationId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.success) {
    throw new Error(response.error || "Failed to disconnect integration");
  }
}
