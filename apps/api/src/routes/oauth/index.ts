import { Hono } from "hono";
import { googleOAuth } from "./google.js";
import { microsoftOAuth } from "./microsoft.js";
import { bambooHROAuth } from "./bamboohr.js";
import { finchOAuth } from "./finch.js";

/**
 * OAuth Routes
 *
 * Mounts provider-specific OAuth routes:
 * - /google - Google Calendar OAuth
 * - /microsoft - Microsoft Calendar OAuth
 * - /bamboohr - BambooHR HRIS OAuth
 * - /finch - Finch unified HRIS OAuth (Rippling, Gusto, etc.)
 */
export const oauthRoutes = new Hono();

// Mount Google OAuth routes at /google
oauthRoutes.route("/google", googleOAuth);

// Mount Microsoft OAuth routes at /microsoft
oauthRoutes.route("/microsoft", microsoftOAuth);

// Mount BambooHR OAuth routes at /bamboohr
oauthRoutes.route("/bamboohr", bambooHROAuth);

// Mount Finch OAuth routes at /finch
oauthRoutes.route("/finch", finchOAuth);
