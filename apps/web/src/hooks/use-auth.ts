"use client";

import { useMutation } from "@tanstack/react-query";
import { signIn, signOut } from "next-auth/react";
import { fetcher, FetchError } from "@/lib/fetcher";
import type {
  ApiResponse,
  User,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@klayim/shared/types";

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginInput) => {
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
    mutationFn: async (data: RegisterInput) => {
      const response = await fetcher<ApiResponse<{ user: User }>>("/auth/register", {
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
    mutationFn: async (data: ForgotPasswordInput) => {
      const response = await fetcher<ApiResponse<null>>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data),
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
    mutationFn: async (data: ResetPasswordInput) => {
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

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await fetcher<ApiResponse<null>>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      if (!response.success) {
        throw new FetchError(400, response.error || "Failed to verify email");
      }

      return response;
    },
  });
}
