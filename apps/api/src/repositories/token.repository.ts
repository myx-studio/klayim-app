import { firestore } from "@/lib/index.js";
import type { PasswordResetToken, EmailVerificationToken } from "@/types/index.js";
import crypto from "crypto";

const PASSWORD_RESET_COLLECTION = "password_reset_tokens";
const EMAIL_VERIFICATION_COLLECTION = "email_verification_tokens";
const LOGIN_TOKEN_COLLECTION = "login_tokens";

// Token expires in 1 hour
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;
// OTP expires in 10 minutes
const OTP_EXPIRY_MS = 10 * 60 * 1000;
// Login token expires in 5 minutes (one-time use)
const LOGIN_TOKEN_EXPIRY_MS = 5 * 60 * 1000;

export interface LoginToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export class TokenRepository {
  private passwordResetCollection = firestore.collection(PASSWORD_RESET_COLLECTION);
  private emailVerificationCollection = firestore.collection(EMAIL_VERIFICATION_COLLECTION);
  private loginTokenCollection = firestore.collection(LOGIN_TOKEN_COLLECTION);

  async createPasswordResetToken(userId: string): Promise<PasswordResetToken> {
    // Invalidate existing tokens for this user
    await this.invalidatePasswordResetTokens(userId);

    const token = crypto.randomBytes(32).toString("hex");
    const docRef = this.passwordResetCollection.doc();
    const data: Omit<PasswordResetToken, "id"> = {
      userId,
      token,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    };

    await docRef.set(data);

    return { id: docRef.id, ...data };
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const snapshot = await this.passwordResetCollection
      .where("token", "==", token)
      .where("used", "==", false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check if token is expired
    if (new Date(data.expiresAt) < new Date()) {
      return null;
    }

    return {
      id: doc.id,
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt,
      used: data.used,
      createdAt: data.createdAt,
    };
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await this.passwordResetCollection.doc(id).update({ used: true });
  }

  async invalidatePasswordResetTokens(userId: string): Promise<void> {
    const snapshot = await this.passwordResetCollection
      .where("userId", "==", userId)
      .where("used", "==", false)
      .get();

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { used: true });
    });

    if (!snapshot.empty) {
      await batch.commit();
    }
  }

  async createEmailVerificationToken(userId: string): Promise<EmailVerificationToken> {
    // Invalidate existing tokens for this user
    await this.invalidateEmailVerificationTokens(userId);

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const docRef = this.emailVerificationCollection.doc();
    const data: Omit<EmailVerificationToken, "id"> = {
      userId,
      token: otp,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS).toISOString(), // 10 minutes
      used: false,
      createdAt: new Date().toISOString(),
    };

    await docRef.set(data);

    return { id: docRef.id, ...data };
  }

  async findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null> {
    const snapshot = await this.emailVerificationCollection
      .where("token", "==", token)
      .where("used", "==", false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check if token is expired
    if (new Date(data.expiresAt) < new Date()) {
      return null;
    }

    return {
      id: doc.id,
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt,
      used: data.used,
      createdAt: data.createdAt,
    };
  }

  async markEmailVerificationTokenUsed(id: string): Promise<void> {
    await this.emailVerificationCollection.doc(id).update({ used: true });
  }

  async invalidateEmailVerificationTokens(userId: string): Promise<void> {
    const snapshot = await this.emailVerificationCollection
      .where("userId", "==", userId)
      .where("used", "==", false)
      .get();

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { used: true });
    });

    if (!snapshot.empty) {
      await batch.commit();
    }
  }

  // Login token methods (one-time auto-login after email verification)
  async createLoginToken(userId: string): Promise<LoginToken> {
    const token = crypto.randomBytes(32).toString("hex");
    const docRef = this.loginTokenCollection.doc();
    const data: Omit<LoginToken, "id"> = {
      userId,
      token,
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_EXPIRY_MS).toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    };

    await docRef.set(data);

    return { id: docRef.id, ...data };
  }

  async findAndConsumeLoginToken(token: string): Promise<LoginToken | null> {
    const snapshot = await this.loginTokenCollection
      .where("token", "==", token)
      .where("used", "==", false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check if token is expired
    if (new Date(data.expiresAt) < new Date()) {
      return null;
    }

    // Mark token as used immediately (one-time use)
    await this.loginTokenCollection.doc(doc.id).update({ used: true });

    return {
      id: doc.id,
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt,
      used: true,
      createdAt: data.createdAt,
    };
  }
}

export const tokenRepository = new TokenRepository();
