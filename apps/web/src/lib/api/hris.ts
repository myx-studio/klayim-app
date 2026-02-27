import { fetcher } from "@/lib/fetcher";
import type { ApiResponse } from "@klayim/shared";

/**
 * Get BambooHR OAuth authorization URL
 */
export async function getBambooHRAuthUrl(
  organizationId: string,
  redirectUrl: string,
  companyDomain: string
): Promise<{ url: string }> {
  const response = await fetcher<ApiResponse<{ url: string }>>(
    "/oauth/bamboohr/authorize",
    {
      params: { organizationId, redirectUrl, companyDomain },
    }
  );
  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to get BambooHR authorization URL");
  }
  return response.data;
}

/**
 * Create Finch Connect session for Rippling/Gusto
 */
export async function createFinchSession(
  organizationId: string,
  organizationName: string
): Promise<{ sessionId: string; connectUrl: string }> {
  const response = await fetcher<ApiResponse<{ sessionId: string; connectUrl: string }>>(
    "/oauth/finch/session",
    {
      method: "POST",
      body: JSON.stringify({ organizationId, organizationName }),
    }
  );
  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to create Finch session");
  }
  return response.data;
}

/**
 * Exchange Finch authorization code for access token
 */
export async function exchangeFinchCode(
  code: string,
  organizationId: string
): Promise<{ integrationId: string; providerId: string; companyName: string }> {
  const response = await fetcher<ApiResponse<{ integrationId: string; providerId: string; companyName: string }>>(
    "/oauth/finch/callback",
    {
      method: "POST",
      body: JSON.stringify({ code, organizationId }),
    }
  );
  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to exchange Finch code");
  }
  return response.data;
}
