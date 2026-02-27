import { Hono } from "hono";
import { linearService } from "@/services/linear.service.js";
import { integrationService } from "@/services/integration.service.js";
import { taskSyncService } from "@/services/task-sync.service.js";
import { authMiddleware } from "@/middleware/auth.middleware.js";
import type { ApiResponse } from "@/types/index.js";

/**
 * OAuth state for Linear
 */
interface LinearOAuthState {
  organizationId: string;
  redirectUrl: string;
}

/**
 * Linear OAuth Routes
 *
 * Handles Linear OAuth authorization flow:
 * - GET /authorize - Generate authorization URL
 * - GET /callback - Handle OAuth callback and store tokens
 */
export const linearOAuth = new Hono();

/**
 * GET /authorize
 *
 * Generates a Linear OAuth authorization URL and returns it.
 * Client should redirect user to this URL for consent.
 *
 * Query params:
 * - organizationId: The organization connecting Linear
 * - redirectUrl: Where to redirect after OAuth completes (frontend URL)
 */
linearOAuth.get("/authorize", authMiddleware, async (c) => {
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
    const state: LinearOAuthState = {
      organizationId,
      redirectUrl,
    };

    const authUrl = linearService.getAuthUrl(JSON.stringify(state));

    const response: ApiResponse<{ url: string }> = {
      success: true,
      data: { url: authUrl },
    };
    return c.json(response);
  } catch (error) {
    console.error("Linear OAuth authorize error:", error);
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
 * Handles the OAuth callback from Linear after user consent.
 * Exchanges authorization code for tokens and stores them.
 *
 * Query params:
 * - code: Authorization code from Linear
 * - state: JSON state with organizationId and redirectUrl
 * - error: Error code if user denied access
 */
linearOAuth.get("/callback", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  const error = c.req.query("error");

  // Parse state to get redirect URL
  let state: LinearOAuthState | null = null;
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
    errorRedirect.searchParams.set("provider", "linear");
    return c.redirect(errorRedirect.toString());
  }

  // Validate required params
  if (!code || !stateParam) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "missing_params");
    errorRedirect.searchParams.set("provider", "linear");
    return c.redirect(errorRedirect.toString());
  }

  if (!state?.organizationId) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "invalid_state");
    errorRedirect.searchParams.set("provider", "linear");
    return c.redirect(errorRedirect.toString());
  }

  try {
    // Exchange code for tokens
    const tokens = await linearService.exchangeCode(code);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();

    const integration = await integrationService.connect({
      organizationId: state.organizationId,
      provider: "linear",
      accountEmail: tokens.accountEmail,
      accountId: tokens.accountId,
      scopes: ["read"],
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
    });

    // Trigger initial sync (non-blocking)
    taskSyncService.triggerInitialSync(state.organizationId, "linear").catch((err) => {
      console.error("Failed to trigger initial Linear sync:", err);
    });

    // Redirect to frontend with success
    const successRedirect = new URL(redirectUrl);
    successRedirect.searchParams.set("success", "true");
    successRedirect.searchParams.set("provider", "linear");
    successRedirect.searchParams.set("email", tokens.accountEmail);
    return c.redirect(successRedirect.toString());
  } catch (error) {
    console.error("Linear OAuth callback error:", error);

    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "exchange_failed");
    errorRedirect.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Failed to complete authorization"
    );
    errorRedirect.searchParams.set("provider", "linear");
    return c.redirect(errorRedirect.toString());
  }
});
