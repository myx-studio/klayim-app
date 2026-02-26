"use client";

import { useMutation } from "@tanstack/react-query";
import { signIn, signOut } from "next-auth/react";
import { fetcher, FetchError } from "@/lib/fetcher";
import type {
  ApiResponse,
  User,
  LoginInput,
  SignupInput,
  CompleteProfileInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@klayim/shared/types";

export function useSignup() {
  return useMutation({
    mutationFn: async (data: SignupInput) => {
      const response = await fetcher<ApiResponse<{ user: User }>>(
        "/auth/signup",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      if (!response.success) {
        throw new FetchError(400, response.error || "Signup failed");
      }

      return response.data;
    },
  });
}

export function useCompleteProfile() {
  return useMutation({
    mutationFn: async (data: CompleteProfileInput) => {
      const response = await fetcher<ApiResponse<{ user: User }>>(
        "/auth/complete-profile",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      if (!response.success) {
        throw new FetchError(400, response.error || "Failed to complete profile");
      }

      return response.data;
    },
  });
}

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
