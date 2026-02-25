import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} from "@klayim/shared/schemas";
import { authService } from "@/services/index.js";
import type { ApiResponse, UserProfile, User } from "@klayim/shared/types";

const auth = new Hono();

// POST /auth/login
auth.post(
  "/login",
  zValidator("json", loginSchema),
  async (c) => {
    const input = c.req.valid("json");

    const result = await authService.login(input);

    if (!result) {
      return c.json<ApiResponse<null>>(
        { success: false, error: "Invalid email or password" },
        401
      );
    }

    return c.json<ApiResponse<{ user: UserProfile }>>({
      success: true,
      data: result,
    });
  }
);

// POST /auth/register
auth.post(
  "/register",
  zValidator("json", registerSchema),
  async (c) => {
    const input = c.req.valid("json");

    const result = await authService.register(input);

    if ("error" in result) {
      return c.json<ApiResponse<null>>(
        { success: false, error: result.error },
        400
      );
    }

    return c.json<ApiResponse<{ user: User }>>(
      { success: true, data: { user: result.user } },
      201
    );
  }
);

// POST /auth/forgot-password
auth.post(
  "/forgot-password",
  zValidator("json", forgotPasswordSchema),
  async (c) => {
    const { email } = c.req.valid("json");

    await authService.forgotPassword(email);

    // Always return success for security
    return c.json<ApiResponse<null>>({
      success: true,
      message: "If the email exists, a password reset link has been sent",
    });
  }
);

// POST /auth/reset-password
auth.post(
  "/reset-password",
  zValidator("json", resetPasswordSchema),
  async (c) => {
    const { token, password } = c.req.valid("json");

    const result = await authService.resetPassword(token, password);

    if (!result.success) {
      return c.json<ApiResponse<null>>(
        { success: false, error: result.error },
        400
      );
    }

    return c.json<ApiResponse<null>>({
      success: true,
      message: "Password has been reset successfully",
    });
  }
);

// POST /auth/verify-email
auth.post(
  "/verify-email",
  zValidator("json", verifyEmailSchema),
  async (c) => {
    const { token } = c.req.valid("json");

    const result = await authService.verifyEmail(token);

    if (!result.success) {
      return c.json<ApiResponse<null>>(
        { success: false, error: result.error },
        400
      );
    }

    return c.json<ApiResponse<null>>({
      success: true,
      message: "Email verified successfully",
    });
  }
);

// POST /auth/change-password (requires auth middleware)
auth.post(
  "/change-password",
  zValidator("json", changePasswordSchema),
  async (c) => {
    // Get user from context (set by auth middleware)
    const userId = c.get("userId") as string | undefined;

    if (!userId) {
      return c.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        401
      );
    }

    const { currentPassword, newPassword } = c.req.valid("json");

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    if (!result.success) {
      return c.json<ApiResponse<null>>(
        { success: false, error: result.error },
        400
      );
    }

    return c.json<ApiResponse<null>>({
      success: true,
      message: "Password changed successfully",
    });
  }
);

// GET /auth/me (requires auth middleware)
auth.get("/me", async (c) => {
  const userId = c.get("userId") as string | undefined;

  if (!userId) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Unauthorized" },
      401
    );
  }

  const user = await authService.getUserById(userId);

  if (!user) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "User not found" },
      404
    );
  }

  return c.json<ApiResponse<{ user: User }>>({
    success: true,
    data: { user },
  });
});

export { auth as authRoutes };
