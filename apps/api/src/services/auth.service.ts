import { auth } from "../lib/index.js";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface AuthUser {
  uid: string;
  email?: string;
}

export class AuthService {
  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decodedToken: DecodedIdToken = await auth.verifyIdToken(token);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
    } catch {
      return null;
    }
  }

  async getUser(uid: string) {
    try {
      return await auth.getUser(uid);
    } catch {
      return null;
    }
  }

  async createUser(email: string, password: string, displayName?: string) {
    return auth.createUser({
      email,
      password,
      displayName,
    });
  }

  async updateUser(
    uid: string,
    data: { displayName?: string; photoURL?: string; disabled?: boolean }
  ) {
    return auth.updateUser(uid, data);
  }

  async deleteUser(uid: string) {
    return auth.deleteUser(uid);
  }
}

export const authService = new AuthService();
