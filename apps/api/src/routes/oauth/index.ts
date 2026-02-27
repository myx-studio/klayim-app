import { Hono } from "hono";
import { googleOAuth } from "./google.js";

/**
 * OAuth Routes
 *
 * Mounts provider-specific OAuth routes:
 * - /google - Google Calendar OAuth
 * - /microsoft - Microsoft Calendar OAuth (added in Task 3)
 */
export const oauthRoutes = new Hono();

// Mount Google OAuth routes at /google
oauthRoutes.route("/google", googleOAuth);
