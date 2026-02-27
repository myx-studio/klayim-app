import { Hono } from "hono";
import { googleOAuth } from "./google.js";
import { microsoftOAuth } from "./microsoft.js";
import { bambooHROAuth } from "./bamboohr.js";

/**
 * OAuth Routes
 *
 * Mounts provider-specific OAuth routes:
 * - /google - Google Calendar OAuth
 * - /microsoft - Microsoft Calendar OAuth
 * - /bamboohr - BambooHR HRIS OAuth
 */
export const oauthRoutes = new Hono();

// Mount Google OAuth routes at /google
oauthRoutes.route("/google", googleOAuth);

// Mount Microsoft OAuth routes at /microsoft
oauthRoutes.route("/microsoft", microsoftOAuth);

// Mount BambooHR OAuth routes at /bamboohr
oauthRoutes.route("/bamboohr", bambooHROAuth);
