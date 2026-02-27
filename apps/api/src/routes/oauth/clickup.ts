import { Hono } from "hono";
import { clickupService } from "@/services/clickup.service.js";
import { integrationService } from "@/services/integration.service.js";
import { taskSyncService } from "@/services/task-sync.service.js";
import { authMiddleware } from "@/middleware/auth.middleware.js";
import type { ApiResponse } from "@/types/index.js";

/**
 * OAuth state for ClickUp
 */
interface ClickUpOAuthState {
  organizationId: string;
  redirectUrl: string;
}

/**
 * ClickUp OAuth Routes
 *
 * Handles ClickUp OAuth authorization flow:
 * - GET /authorize - Generate authorization URL
 * - GET /callback - Handle OAuth callback and store tokens
 *
 * Note: ClickUp tokens don't expire - no refresh needed
 */
export const clickupOAuth = new Hono();

/**
 * GET /authorize
 *
 * Generates a ClickUp OAuth authorization URL and returns it.
 * Client should redirect user to this URL for consent.
 *
 * Query params:
 * - organizationId: The organization connecting ClickUp
 * - redirectUrl: Where to redirect after OAuth completes (frontend URL)
 */
clickupOAuth.get("/authorize", authMiddleware, async (c) => {
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
    const state: ClickUpOAuthState = {
      organizationId,
      redirectUrl,
    };

    const authUrl = clickupService.getAuthUrl(JSON.stringify(state));

    const response: ApiResponse<{ url: string }> = {
      success: true,
      data: { url: authUrl },
    };
    return c.json(response);
  } catch (error) {
    console.error("ClickUp OAuth authorize error:", error);
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
 * Handles the OAuth callback from ClickUp after user consent.
 * Exchanges authorization code for tokens and stores them.
 *
 * Query params:
 * - code: Authorization code from ClickUp
 * - state: JSON state with organizationId and redirectUrl
 * - error: Error code if user denied access
 */
clickupOAuth.get("/callback", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  const error = c.req.query("error");

  // Parse state to get redirect URL
  let state: ClickUpOAuthState | null = null;
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
    errorRedirect.searchParams.set("provider", "clickup");
    return c.redirect(errorRedirect.toString());
  }

  // Validate required params
  if (!code || !stateParam) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "missing_params");
    errorRedirect.searchParams.set("provider", "clickup");
    return c.redirect(errorRedirect.toString());
  }

  if (!state?.organizationId) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "invalid_state");
    errorRedirect.searchParams.set("provider", "clickup");
    return c.redirect(errorRedirect.toString());
  }

  try {
    // Exchange code for token
    const { accessToken } = await clickupService.exchangeCode(code);

    // Get user info for account details
    const user = await clickupService.getUser(accessToken);

    // Get first workspace as default (user can change later)
    const workspaces = await clickupService.getWorkspaces(accessToken);
    const defaultWorkspace = workspaces[0];

    // ClickUp tokens don't expire - set far future expiry (10 years)
    const expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString();

    const integration = await integrationService.connect({
      organizationId: state.organizationId,
      provider: "clickup",
      accountEmail: user.email,
      accountId: defaultWorkspace?.id || user.id.toString(),
      scopes: ["default"],
      accessToken,
      refreshToken: "", // ClickUp doesn't use refresh tokens
      expiresAt,
    });

    // Trigger initial sync (non-blocking)
    taskSyncService.triggerInitialSync(integration.id, "clickup").catch((err) => {
      console.error("Failed to trigger initial ClickUp sync:", err);
    });

    // Redirect to frontend with success
    const successRedirect = new URL(redirectUrl);
    successRedirect.searchParams.set("success", "true");
    successRedirect.searchParams.set("provider", "clickup");
    successRedirect.searchParams.set("email", user.email);
    return c.redirect(successRedirect.toString());
  } catch (error) {
    console.error("ClickUp OAuth callback error:", error);

    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "exchange_failed");
    errorRedirect.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Failed to complete authorization"
    );
    errorRedirect.searchParams.set("provider", "clickup");
    return c.redirect(errorRedirect.toString());
  }
});
