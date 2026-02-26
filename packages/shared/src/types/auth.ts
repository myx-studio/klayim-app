import type { User, UserProfile } from "./user.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

// Email-only signup
export interface SignupInput {
  email: string;
}

export interface SignupResponse {
  user: User;
}

// Legacy full registration
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  user: UserProfile;
}

// Complete profile during onboarding
export interface CompleteProfileInput {
  name: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  expiresAt: string;
}
