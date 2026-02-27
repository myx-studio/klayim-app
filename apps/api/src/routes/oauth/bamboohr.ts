import { Hono } from "hono";
import { bambooHRService, type BambooHROAuthState } from "@/services/bamboohr.service.js";
import { integrationService } from "@/services/integration.service.js";
import { hrisSyncService } from "@/services/hris-sync.service.js";
import { authMiddleware } from "@/middleware/auth.middleware.js";
import type { ApiResponse } from "@/types/index.js";

/**
 * BambooHR OAuth Routes
 *
 * Handles BambooHR OAuth authorization flow:
 * - GET /authorize - Generate authorization URL
 * - GET /callback - Handle OAuth callback and store tokens
 */
export const bambooHROAuth = new Hono();

/**
 * GET /authorize
 *
 * Generates a BambooHR OAuth authorization URL and returns it.
 * Client should redirect user to this URL for consent.
 *
 * Query params:
 * - organizationId: The organization connecting BambooHR
 * - redirectUrl: Where to redirect after OAuth completes (frontend URL)
 * - companyDomain: BambooHR company subdomain (e.g., "acme" for acme.bamboohr.com)
 */
bambooHROAuth.get("/authorize", authMiddleware, async (c) => {
  try {
    const organizationId = c.req.query("organizationId");
    const redirectUrl = c.req.query("redirectUrl");
    const companyDomain = c.req.query("companyDomain");

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

    if (!companyDomain) {
      const response: ApiResponse = {
        success: false,
        error: "companyDomain is required",
      };
      return c.json(response, 400);
    }

    // Create state object for OAuth callback
    const state: BambooHROAuthState = {
      organizationId,
      redirectUrl,
      companyDomain,
    };

    const authUrl = bambooHRService.getAuthUrl(JSON.stringify(state));

    const response: ApiResponse<{ url: string }> = {
      success: true,
      data: { url: authUrl },
    };
    return c.json(response);
  } catch (error) {
    console.error("BambooHR OAuth authorize error:", error);
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
 * Handles the OAuth callback from BambooHR after user consent.
 * Exchanges authorization code for tokens and stores them.
 *
 * Query params:
 * - code: Authorization code from BambooHR
 * - state: JSON state with organizationId, redirectUrl, and companyDomain
 * - error: Error code if user denied access
 */
bambooHROAuth.get("/callback", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  const error = c.req.query("error");

  // Parse state to get redirect URL and companyDomain
  let state: BambooHROAuthState | null = null;
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
    errorRedirect.searchParams.set("provider", "bamboohr");
    return c.redirect(errorRedirect.toString());
  }

  // Validate required params
  if (!code || !stateParam) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "missing_params");
    errorRedirect.searchParams.set("provider", "bamboohr");
    return c.redirect(errorRedirect.toString());
  }

  if (!state?.organizationId || !state?.companyDomain) {
    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "invalid_state");
    errorRedirect.searchParams.set("provider", "bamboohr");
    return c.redirect(errorRedirect.toString());
  }

  try {
    // Exchange code for tokens
    const result = await bambooHRService.exchangeCode(code, state.companyDomain);

    // Store the integration with encrypted credentials
    // BambooHR doesn't expose user email, so use companyDomain@bamboohr as identifier
    const integration = await integrationService.connect({
      organizationId: state.organizationId,
      provider: "bamboohr",
      accountEmail: `${state.companyDomain}@bamboohr`,
      accountId: state.companyDomain, // Store companyDomain for API calls
      scopes: [], // BambooHR doesn't use scopes
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresAt: result.tokens.expiresAt,
    });

    // Trigger initial sync async (don't await - redirect immediately)
    hrisSyncService.triggerInitialSync(integration.id).catch((err) => {
      console.error("[OAuth/BambooHR] Initial sync error:", err);
    });

    // Redirect to frontend with success
    const successRedirect = new URL(redirectUrl);
    successRedirect.searchParams.set("success", "true");
    successRedirect.searchParams.set("provider", "bamboohr");
    successRedirect.searchParams.set("company", state.companyDomain);
    return c.redirect(successRedirect.toString());
  } catch (error) {
    console.error("BambooHR OAuth callback error:", error);

    const errorRedirect = new URL(redirectUrl);
    errorRedirect.searchParams.set("error", "exchange_failed");
    errorRedirect.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Failed to complete authorization"
    );
    errorRedirect.searchParams.set("provider", "bamboohr");
    return c.redirect(errorRedirect.toString());
  }
});
