import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { api } from "@/lib/api";
import { loginSchema } from "@klayim/shared/schemas";
import type { ApiResponse, UserProfile } from "@klayim/shared/types";

interface LoginResponseData {
  user: UserProfile;
}

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginToken: { label: "Login Token", type: "text" },
      },
      async authorize(credentials) {
        // Check if using loginToken (auto-login after email verification)
        if (credentials?.loginToken && typeof credentials.loginToken === "string") {
          try {
            const response = await api<ApiResponse<LoginResponseData>>("/auth/login-with-token", {
              method: "POST",
              body: JSON.stringify({ token: credentials.loginToken }),
            });

            if (response.success && response.data) {
              const { user } = response.data;
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.avatar,
                type: user.type,
                onboardingCompleted: user.onboardingCompleted,
                defaultOrganizationId: user.defaultOrganizationId,
              };
            }

            return null;
          } catch {
            return null;
          }
        }

        // Normal email/password login
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        try {
          const response = await api<ApiResponse<LoginResponseData>>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });

          if (response.success && response.data) {
            const { user } = response.data;
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.avatar,
              type: user.type,
              onboardingCompleted: user.onboardingCompleted,
              defaultOrganizationId: user.defaultOrganizationId,
            };
          }

          return null;
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.type = (user as { type?: string }).type;
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted;
        token.defaultOrganizationId = (user as { defaultOrganizationId?: string }).defaultOrganizationId;
      }
      // Handle session update with passed data
      if (trigger === "update" && session) {
        const updateData = session as {
          name?: string;
          onboardingCompleted?: boolean;
          defaultOrganizationId?: string;
        };
        if (updateData.name !== undefined) {
          token.name = updateData.name;
        }
        if (updateData.onboardingCompleted !== undefined) {
          token.onboardingCompleted = updateData.onboardingCompleted;
        }
        if (updateData.defaultOrganizationId !== undefined) {
          token.defaultOrganizationId = updateData.defaultOrganizationId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { type?: string }).type = token.type as string;
        (session.user as { onboardingCompleted?: boolean }).onboardingCompleted = token.onboardingCompleted as boolean;
        (session.user as { defaultOrganizationId?: string }).defaultOrganizationId = token.defaultOrganizationId as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      }

      return true;
    },
  },
};
