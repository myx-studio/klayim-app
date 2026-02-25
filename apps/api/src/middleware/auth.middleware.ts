import type { Context, Next } from "hono";
import { authService, type AuthUser } from "../services/index.js";

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.split("Bearer ")[1];
  const user = await authService.verifyToken(token);

  if (!user) {
    return c.json({ success: false, error: "Invalid token" }, 401);
  }

  c.set("user", user);
  await next();
}
