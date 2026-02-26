"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { fetcher, FetchError } from "@/lib/fetcher";
import type { ApiResponse, Organization } from "@klayim/shared/types";

interface CheckNameResponse {
  available: boolean;
  suggestion?: string;
}

/**
 * Hook to get the current user's organization
 */
export function useOrganization() {
  const query = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const response = await fetcher<ApiResponse<{ organization: Organization }>>(
        "/organizations/me"
      );

      if (!response.success) {
        throw new FetchError(400, response.error || "Failed to get organization");
      }

      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry on 404 (user may not have an org yet)
  });

  return {
    organization: query.data?.organization,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateOrganization() {
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await fetcher<ApiResponse<{ organization: Organization }>>(
        "/organizations",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      if (!response.success) {
        throw new FetchError(400, response.error || "Failed to create organization");
      }

      return response.data;
    },
  });
}

export function useUpdateOrganization() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string } }) => {
      const response = await fetcher<ApiResponse<{ organization: Organization }>>(
        `/organizations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );

      if (!response.success) {
        throw new FetchError(400, response.error || "Failed to update organization");
      }

      return response.data;
    },
  });
}

export function useCheckOrganizationName(name: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["organization-name-check", name],
    queryFn: async () => {
      const response = await fetcher<ApiResponse<CheckNameResponse>>(
        `/organizations/check-name?name=${encodeURIComponent(name)}`
      );

      if (!response.success) {
        throw new FetchError(400, response.error || "Failed to check name");
      }

      return response.data;
    },
    enabled: enabled && name.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
}
