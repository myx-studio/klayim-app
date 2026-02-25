import type { Context, Next } from "hono";
import type { UserProfile } from "@klayim/shared/types";

declare module "hono" {
  interface ContextVariableMap {
    user: UserProfile;
    userId: string;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.split("Bearer ")[1];

  // TODO: Implement proper JWT verification
  // For now, we'll decode the token as a simple userId
  // In production, use proper JWT verification
  try {
    // Simple token format: base64(userId)
    const userId = Buffer.from(token, "base64").toString("utf-8");

    if (!userId) {
      return c.json({ success: false, error: "Invalid token" }, 401);
    }

    c.set("userId", userId);
    await next();
  } catch {
    return c.json({ success: false, error: "Invalid token" }, 401);
  }
}

// Optional auth middleware - doesn't fail if no token
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];

    try {
      const userId = Buffer.from(token, "base64").toString("utf-8");
      if (userId) {
        c.set("userId", userId);
      }
    } catch {
      // Ignore invalid token in optional auth
    }
  }

  await next();
}
