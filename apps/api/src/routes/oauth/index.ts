import { Hono } from "hono";
import { googleOAuth } from "./google.js";
import { microsoftOAuth } from "./microsoft.js";
import { bambooHROAuth } from "./bamboohr.js";
import { finchOAuth } from "./finch.js";
import { asanaOAuth } from "./asana.js";
import { clickupOAuth } from "./clickup.js";
import { linearOAuth } from "./linear.js";

/**
 * OAuth Routes
 *
 * Mounts provider-specific OAuth routes:
 * - /google - Google Calendar OAuth
 * - /microsoft - Microsoft Calendar OAuth
 * - /bamboohr - BambooHR HRIS OAuth
 * - /finch - Finch unified HRIS OAuth (Rippling, Gusto, etc.)
 * - /asana - Asana task management OAuth
 * - /clickup - ClickUp task management OAuth
 * - /linear - Linear task management OAuth
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

// Mount Asana OAuth routes at /asana
oauthRoutes.route("/asana", asanaOAuth);

// Mount ClickUp OAuth routes at /clickup
oauthRoutes.route("/clickup", clickupOAuth);

// Mount Linear OAuth routes at /linear
oauthRoutes.route("/linear", linearOAuth);
