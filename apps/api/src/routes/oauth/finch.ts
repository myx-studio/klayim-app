import { Hono } from "hono";
import { finchService } from "@/services/finch.service.js";
import { integrationService } from "@/services/integration.service.js";
import { hrisSyncService } from "@/services/hris-sync.service.js";
import { authMiddleware } from "@/middleware/auth.middleware.js";
import type { ApiResponse } from "@/types/index.js";

/**
 * Finch OAuth Routes
 *
 * Handles Finch Connect authorization flow:
 * - POST /session - Create a Connect session for embedded auth
 * - POST /callback - Handle callback after Connect completes
 *
 * Note: Finch uses Connect sessions instead of traditional OAuth redirects.
 * Frontend uses the sessionId with @tryfinch/react-connect to show embedded auth modal.
 */
export const finchOAuth = new Hono();

/**
 * POST /session
 *
 * Creates a Finch Connect session for embedded authorization.
 * Frontend uses the sessionId with @tryfinch/react-connect component.
 *
 * Body:
 * - organizationId: The organization connecting Finch
 * - organizationName: Display name for consent screen
 */
finchOAuth.post("/session", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      organizationId?: string;
      organizationName?: string;
    }>();

    const { organizationId, organizationName } = body;

    if (!organizationId) {
      const response: ApiResponse = {
        success: false,
        error: "organizationId is required",
      };
      return c.json(response, 400);
    }

    if (!organizationName) {
      const response: ApiResponse = {
        success: false,
        error: "organizationName is required",
      };
      return c.json(response, 400);
    }

    const session = await finchService.createConnectSession(
      organizationId,
      organizationName
    );

    const response: ApiResponse<{ sessionId: string; connectUrl: string }> = {
      success: true,
      data: {
        sessionId: session.sessionId,
        connectUrl: session.connectUrl,
      },
    };
    return c.json(response);
  } catch (error) {
    console.error("Finch session creation error:", error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create Finch session",
    };
    return c.json(response, 500);
  }
});

/**
 * POST /callback
 *
 * Handles the callback after Finch Connect modal completes.
 * Exchanges authorization code for access token and stores integration.
 *
 * Body:
 * - code: Authorization code from Finch Connect
 * - organizationId: The organization connecting Finch
 * - redirectUrl: Frontend URL to redirect to after completion (optional)
 */
finchOAuth.post("/callback", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      code?: string;
      organizationId?: string;
      redirectUrl?: string;
    }>();

    const { code, organizationId, redirectUrl } = body;

    if (!code) {
      const response: ApiResponse = {
        success: false,
        error: "code is required",
      };
      return c.json(response, 400);
    }

    if (!organizationId) {
      const response: ApiResponse = {
        success: false,
        error: "organizationId is required",
      };
      return c.json(response, 400);
    }

    // Exchange code for access token
    const result = await finchService.exchangeCode(code);

    // Store the integration with encrypted credentials
    // Finch tokens are persistent and don't expire until disconnected
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 10); // 10 years from now

    const integration = await integrationService.connect({
      organizationId,
      provider: "finch",
      accountEmail: `${result.companyName}@${result.providerId}`,
      accountId: result.companyId,
      scopes: ["company", "directory", "individual", "employment"],
      accessToken: result.accessToken,
      refreshToken: "", // Finch tokens don't use refresh tokens
      expiresAt: farFuture.toISOString(),
    });

    // Trigger initial sync async (don't await - respond immediately)
    hrisSyncService.triggerInitialSync(integration.id).catch((err) => {
      console.error("[OAuth/Finch] Initial sync error:", err);
    });

    const response: ApiResponse<{
      integrationId: string;
      providerId: string;
      companyName: string;
    }> = {
      success: true,
      data: {
        integrationId: integration.id,
        providerId: result.providerId,
        companyName: result.companyName,
      },
    };
    return c.json(response);
  } catch (error) {
    console.error("Finch OAuth callback error:", error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete Finch authorization",
    };
    return c.json(response, 500);
  }
});
