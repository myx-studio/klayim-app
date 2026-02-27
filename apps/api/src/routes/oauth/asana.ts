import { Hono } from "hono";
import { asanaService } from "@/services/asana.service.js";
import { integrationService } from "@/services/integration.service.js";
import { authMiddleware } from "@/middleware/auth.middleware.js";
import type { ApiResponse } from "@/types/index.js";

/**
 * OAuth state for Asana
 */
interface AsanaOAuthState {
  organizationId: string;
  redirectUrl: string;
}

/**
 * Asana OAuth Routes
 *
 * Handles Asana OAuth authorization flow:
 * - GET /authorize - Generate authorization URL
 * - GET /callback - Handle OAuth callback and store tokens
 */
export const asanaOAuth = new Hono();

/**
 * GET /authorize
 *
 * Generates an Asana OAuth authorization URL and returns it.
 * Client should redirect user to this URL for consent.
 *
 * Query params:
 * - organizationId: The organization connecting Asana
 * - redirectUrl: Where to redirect after OAuth completes (frontend URL)
 */
asanaOAuth.get("/authorize", authMiddleware, async (c) => {
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
    const state: AsanaOAuthState = {
      organizationId,
      redirectUrl,
    };

    const authUrl = asanaService.getAuthUrl(JSON.stringify(state));

    const response: ApiResponse<{ url: string }> = {
      success: true,
      data: { url: authUrl },
    };
    return c.json(response);
  } catch (error) {
    console.error("Asana OAuth authorize error:", error);
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
 * Handles the OAuth callback from Asana after user consent.
 * Exchanges authorization code for tokens and stores them.
 *
 * Query params:
 * - code: Authorization code from Asana
 * - state: JSON state with organizationId and redirectUrl
 * - error: Error code if user denied access
 */
asanaOAuth.get("/callback", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  const error = c.req.query("error");

  // Parse state to get redirect URL
  let state: AsanaOAuthState | null = null;
  try {
    if (stateParam) {
      state = JSON.parse(stateParam);
    }
  } catch {
    // State parsing failed
  }

  const redirectUrl = state?.redirectUrl || process.env.WEB_URL || "http://localhost:3000";

  // Handle OAuth error (user denied)
  if (error) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", error);
    errorRedirect.searchParams.set("provider", "asana");
    return c.redirect(errorRedirect.toString());
  }

  // Validate required params
  if (!code || !stateParam) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "missing_params");
    errorRedirect.searchParams.set("provider", "asana");
    return c.redirect(errorRedirect.toString());
  }

  if (!state?.organizationId) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "invalid_state");
    errorRedirect.searchParams.set("provider", "asana");
    return c.redirect(errorRedirect.toString());
  }

  try {
    // Exchange code for tokens
    const tokens = await asanaService.exchangeCode(code);

    // Create or update integration
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();

    await integrationService.connect({
      organizationId: state.organizationId,
      provider: "asana",
      accountEmail: tokens.accountEmail,
      accountId: tokens.accountId,
      scopes: ["default"],
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
    });

    // TODO: Trigger initial sync when taskSyncService is implemented (07-03)

    // Redirect to frontend with success
    const successRedirect = new URL(redirectUrl);
    successRedirect.searchParams.set("success", "true");
    successRedirect.searchParams.set("provider", "asana");
    successRedirect.searchParams.set("email", tokens.accountEmail);
    return c.redirect(successRedirect.toString());
  } catch (error) {
    console.error("Asana OAuth callback error:", error);

    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "exchange_failed");
    errorRedirect.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Failed to complete authorization"
    );
    errorRedirect.searchParams.set("provider", "asana");
    return c.redirect(errorRedirect.toString());
  }
});
