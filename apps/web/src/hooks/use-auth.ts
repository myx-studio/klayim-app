"use client";

import { useMutation } from "@tanstack/react-query";
import { signIn, signOut } from "next-auth/react";
import { fetcher, FetchError } from "@/lib/fetcher";

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const result = await signIn("credentials", {
        ...credentials,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Invalid credentials");
      }

      return result;
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await signOut({ redirect: false });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await fetcher<ApiResponse<{ id: string }>>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.success) {
        throw new FetchError(400, response.error || "Registration failed");
      }

      return response.data;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await fetcher<ApiResponse<null>>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (!response.success) {
        throw new FetchError(400, response.error || "Failed to send reset email");
      }

      return response;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const response = await fetcher<ApiResponse<null>>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.success) {
        throw new FetchError(400, response.error || "Failed to reset password");
      }

      return response;
    },
  });
}
