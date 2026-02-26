import bcrypt from "bcryptjs";
import { userRepository, tokenRepository } from "@/repositories/index.js";
import type {
  User,
  UserProfile,
  LoginInput,
  RegisterInput,
  SignupInput,
  CompleteProfileInput,
} from "@klayim/shared/types";

const SALT_ROUNDS = 12;

export class AuthService {
  async login(input: LoginInput): Promise<{ user: UserProfile } | null> {
    const userWithPassword = await userRepository.findByEmailWithPassword(input.email);

    if (!userWithPassword) {
      return null;
    }

    // Check if password exists (user may not have completed onboarding)
    if (!userWithPassword.passwordHash) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(
      input.password,
      userWithPassword.passwordHash
    );

    if (!isValidPassword) {
      return null;
    }

    // Check if user is active
    if (userWithPassword.status !== "active") {
      // Allow pending users to login but maybe show a warning
      if (userWithPassword.status === "inactive") {
        return null;
      }
    }

    // Update last login
    await userRepository.updateLastLogin(userWithPassword.id);

    return {
      user: {
        id: userWithPassword.id,
        email: userWithPassword.email,
        name: userWithPassword.name,
        avatar: userWithPassword.avatar,
        type: userWithPassword.type,
        onboardingCompleted: userWithPassword.onboardingCompleted,
        defaultOrganizationId: userWithPassword.defaultOrganizationId,
      },
    };
  }

  // Email-only signup
  async signup(input: SignupInput): Promise<{ user: User } | { error: string }> {
    // Check if email already exists
    const existingUser = await userRepository.findByEmail(input.email);

    if (existingUser) {
      return { error: "Email already registered" };
    }

    // Create user without password (will be set during onboarding)
    const user = await userRepository.create({
      email: input.email,
    });

    // Create email verification OTP
    const verificationToken = await tokenRepository.createEmailVerificationToken(user.id);

    // TODO: Send verification email with OTP
    console.log(`[DEV] Email verification OTP for ${input.email}: ${verificationToken.token}`);

    return { user };
  }

  // Complete profile during onboarding
  async completeProfile(
    userId: string,
    input: CompleteProfileInput
  ): Promise<{ user: User } | { error: string }> {
    const existingUser = await userRepository.findById(userId);

    if (!existingUser) {
      return { error: "User not found" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Update user with name and password
    const user = await userRepository.completeProfile(userId, input.name, passwordHash);

    if (!user) {
      return { error: "Failed to complete profile" };
    }

    return { user };
  }

  // Legacy full registration (kept for backwards compatibility)
  async register(input: RegisterInput): Promise<{ user: User } | { error: string }> {
    // Check if email already exists
    const existingUser = await userRepository.findByEmail(input.email);

    if (existingUser) {
      return { error: "Email already registered" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Create user
    const user = await userRepository.create({
      email: input.email,
      password: input.password,
      name: input.name,
      passwordHash,
    });

    // Create email verification token
    await tokenRepository.createEmailVerificationToken(user.id);

    // TODO: Send verification email

    return { user };
  }

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Return success even if user doesn't exist (security)
      return { success: true };
    }

    // Create password reset token
    const token = await tokenRepository.createPasswordResetToken(user.id);

    // TODO: Send password reset email with token
    console.log("Password reset token:", token.token);

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const resetToken = await tokenRepository.findPasswordResetToken(token);

    if (!resetToken) {
      return { success: false, error: "Invalid or expired token" };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    const updated = await userRepository.updatePassword(resetToken.userId, passwordHash);

    if (!updated) {
      return { success: false, error: "Failed to update password" };
    }

    // Mark token as used
    await tokenRepository.markPasswordResetTokenUsed(resetToken.id);

    return { success: true };
  }

  async resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Return success for security (don't reveal if email exists)
      return { success: true };
    }

    if (user.emailVerified) {
      return { success: false, error: "Email already verified" };
    }

    // Create new OTP (invalidates previous ones)
    const verificationToken = await tokenRepository.createEmailVerificationToken(user.id);

    // TODO: Send verification email with OTP
    console.log(`[DEV] Resend verification OTP for ${email}: ${verificationToken.token}`);

    return { success: true };
  }

  async verifyEmail(token: string): Promise<{ success: boolean; error?: string; user?: User; loginToken?: string }> {
    const verificationToken = await tokenRepository.findEmailVerificationToken(token);

    if (!verificationToken) {
      return { success: false, error: "Invalid or expired OTP" };
    }

    // Verify user email
    const user = await userRepository.verifyEmail(verificationToken.userId);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Mark token as used
    await tokenRepository.markEmailVerificationTokenUsed(verificationToken.id);

    // Create one-time login token for auto-login
    const loginToken = await tokenRepository.createLoginToken(user.id);

    return { success: true, user, loginToken: loginToken.token };
  }

  // Login via one-time token (for auto-login after email verification)
  async loginWithToken(token: string): Promise<{ user: UserProfile } | null> {
    const loginToken = await tokenRepository.findAndConsumeLoginToken(token);

    if (!loginToken) {
      return null;
    }

    const user = await userRepository.findById(loginToken.userId);

    if (!user) {
      return null;
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        type: user.type,
        onboardingCompleted: user.onboardingCompleted,
        defaultOrganizationId: user.defaultOrganizationId,
      },
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const userWithPassword = await userRepository.findByIdWithPassword(userId);

    if (!userWithPassword) {
      return { success: false, error: "User not found" };
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      userWithPassword.passwordHash
    );

    if (!isValidPassword) {
      return { success: false, error: "Current password is incorrect" };
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const updated = await userRepository.updatePassword(userId, passwordHash);

    if (!updated) {
      return { success: false, error: "Failed to update password" };
    }

    return { success: true };
  }

  async getUserById(id: string): Promise<User | null> {
    return userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return userRepository.findByEmail(email);
  }
}

export const authService = new AuthService();
