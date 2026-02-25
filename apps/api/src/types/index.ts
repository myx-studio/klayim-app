// Re-export all shared types
export * from "@klayim/shared/types";

import type { User, Timestamps } from "@klayim/shared/types";

// API-specific types (internal - never expose to frontend)

// Extends User with password hash for authentication
export interface UserWithPassword extends User {
  passwordHash: string;
}

// Token base interface
interface TokenBase extends Timestamps {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  used: boolean;
}

export interface PasswordResetToken extends TokenBase {}

export interface EmailVerificationToken extends TokenBase {}
