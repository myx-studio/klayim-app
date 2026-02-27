import { Hono } from "hono";
import { microsoftCalendarService, type MicrosoftOAuthState } from "@/services/microsoft-calendar.service.js";
import { integrationService } from "@/services/integration.service.js";
import { calendarSyncService } from "@/services/calendar-sync.service.js";
import { authMiddleware } from "@/middleware/auth.middleware.js";
import type { ApiResponse } from "@/types/index.js";

/**
 * Microsoft OAuth Routes
 *
 * Handles Microsoft Calendar OAuth authorization flow:
 * - GET /authorize - Generate authorization URL
 * - GET /callback - Handle OAuth callback and store tokens
 */
export const microsoftOAuth = new Hono();

/**
 * GET /authorize
 *
 * Generates a Microsoft OAuth authorization URL and returns it.
 * Client should redirect user to this URL for consent.
 *
 * Query params:
 * - organizationId: The organization connecting the calendar
 * - redirectUrl: Where to redirect after OAuth completes (frontend URL)
 */
microsoftOAuth.get("/authorize", authMiddleware, async (c) => {
  try {
    const organizationId = c.req.query("organizationId");
    const redirectUrl = c.req.query("redirectUrl");

    if (!organizationId) {
      const response: ApiResponse = {
        success: false,
        error: "organizationId is required",
      };
      return c.json(response, 400);
    }

    if (!redirectUrl) {
      const response: ApiResponse = {
        success: false,
        error: "redirectUrl is required",
      };
      return c.json(response, 400);
    }

    // Create state object for OAuth callback
    const state: MicrosoftOAuthState = {
      organizationId,
      redirectUrl,
    };

    const authUrl = await microsoftCalendarService.getAuthUrl(JSON.stringify(state));

    const response: ApiResponse<{ url: string }> = {
      success: true,
      data: { url: authUrl },
    };
    return c.json(response);
  } catch (error) {
    console.error("Microsoft OAuth authorize error:", error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate authorization URL",
    };
    return c.json(response, 500);
  }
});

/**
 * GET /callback
 *
 * Handles the OAuth callback from Microsoft after user consent.
 * Exchanges authorization code for tokens and stores them.
 *
 * Query params:
 * - code: Authorization code from Microsoft
 * - state: JSON state with organizationId and redirectUrl
 * - error: Error code if user denied access
 * - error_description: Error description
 */
microsoftOAuth.get("/callback", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  // Parse state to get redirect URL
  let state: MicrosoftOAuthState | null = null;
  try {
    if (stateParam) {
      state = JSON.parse(stateParam);
    }
  } catch {
    // State parsing failed
  }

  const redirectUrl = state?.redirectUrl || process.env.WEB_URL || "http://localhost:3000";

  // Handle OAuth error (user denied or other error)
  if (error) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", error);
    if (errorDescription) {
      errorRedirect.searchParams.set("message", errorDescription);
    }
    errorRedirect.searchParams.set("provider", "microsoft_calendar");
    return c.redirect(errorRedirect.toString());
  }

  // Validate required params
  if (!code || !stateParam) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "missing_params");
    errorRedirect.searchParams.set("provider", "microsoft_calendar");
    return c.redirect(errorRedirect.toString());
  }

  if (!state?.organizationId) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "invalid_state");
    errorRedirect.searchParams.set("provider", "microsoft_calendar");
    return c.redirect(errorRedirect.toString());
  }

  try {
    // Exchange code for tokens and get user info
    const result = await microsoftCalendarService.exchangeCode(code);

    // Store the integration with encrypted credentials
    const integration = await integrationService.connect({
      organizationId: state.organizationId,
      provider: "microsoft_calendar",
      accountEmail: result.userInfo.email,
      accountId: result.userInfo.id,
      scopes: ["Calendars.Read", "offline_access", "User.Read"],
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresAt: result.tokens.expiresAt,
    });

    // Trigger initial sync async (don't await - redirect immediately)
    calendarSyncService.triggerInitialSync(integration.id).catch((err) => {
      console.error("[OAuth/Microsoft] Initial sync error:", err);
    });

    // Redirect to frontend with success
    const successRedirect = new URL(redirectUrl);
    successRedirect.searchParams.set("success", "true");
    successRedirect.searchParams.set("provider", "microsoft_calendar");
    successRedirect.searchParams.set("email", result.userInfo.email);
    return c.redirect(successRedirect.toString());
  } catch (error) {
    console.error("Microsoft OAuth callback error:", error);

    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "exchange_failed");
    errorRedirect.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Failed to complete authorization"
    );
    errorRedirect.searchParams.set("provider", "microsoft_calendar");
    return c.redirect(errorRedirect.toString());
  }
});
