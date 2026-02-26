import { z } from "zod";

export const emailSchema = z.string().email("Invalid email address");

export const nameSchema = z.string().min(2, "Name must be at least 2 characters").max(100);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Extended password schema with special character requirement (for onboarding)
export const onboardingPasswordSchema = passwordSchema.regex(
  /[!@#$%^&*(),.?":{}|<>]/,
  "Password must contain at least one special character"
);

// Password requirements for checklist component
export const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
  {
    id: "special",
    label: "One special character",
    test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
] as const;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// Email-only signup (for initial registration)
export const signupSchema = z.object({
  email: emailSchema,
});

// Full registration (legacy, kept for backwards compatibility)
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

// Complete profile during onboarding (legacy - without special char requirement)
export const completeProfileSchema = z.object({
  name: nameSchema,
  password: passwordSchema,
});

// Complete profile during onboarding with special character requirement and confirm password
export const onboardingCompleteProfileSchema = z
  .object({
    name: nameSchema,
    password: onboardingPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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
export type SignupInput = z.infer<typeof signupSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type OnboardingCompleteProfileInput = z.infer<typeof onboardingCompleteProfileSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
