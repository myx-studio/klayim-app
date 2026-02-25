import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { api } from "@/lib/api";
import { loginSchema } from "@klayim/shared/schemas";
import type { ApiResponse, UserProfile } from "@klayim/shared/types";

interface LoginResponseData {
  user: UserProfile;
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
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
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.type = (user as { type?: string }).type;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { type?: string }).type = token.type as string;
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
