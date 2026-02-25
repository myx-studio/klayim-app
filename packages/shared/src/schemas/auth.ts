import { z } from "zod";

export const emailSchema = z.string().email("Invalid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
