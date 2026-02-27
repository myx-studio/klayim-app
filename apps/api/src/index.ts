import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { onRequest, HttpsFunction, HttpsOptions } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import type { Request, Response } from "express";

import { healthRoute, userRoute, authRoutes, organizationRoutes, newsletterRoute, billingRoutes, webhookRoutes, webhooksRoute, oauthRoutes } from "@/routes/index.js";
import { authMiddleware } from "@/middleware/index.js";
import type { ApiResponse } from "@/types/index.js";

// Define secrets for Firebase Functions
const recaptchaSecretKey = defineSecret("RECAPTCHA_SECRET_KEY");

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3000",
      "https://www.klayim.com",
      "https://klayim.com",
      "https://klayim-app--klayim-app.us-east4.hosted.app",
    ],
    credentials: true,
  })
);

// Stripe webhook route (no auth, raw body needed for signature verification)
app.route("/webhooks", webhookRoutes);

// Provider-specific webhooks (no auth, queue-based processing)
// Routes: /webhooks/google, /webhooks/microsoft
app.route("/webhooks", webhooksRoute);

// Public routes
app.route("/health", healthRoute);
app.route("/auth", authRoutes);
app.route("/newsletter", newsletterRoute);
app.route("/billing", billingRoutes);

// OAuth routes (authorize requires auth, callback is public for redirect)
app.route("/oauth", oauthRoutes);

// Protected routes
app.use("/users/*", authMiddleware);
app.use("/organizations/*", authMiddleware);
app.route("/users", userRoute);
app.route("/organizations", organizationRoutes);

// Root route
app.get("/", (c) => {
  const response: ApiResponse<{ name: string; version: string }> = {
    success: true,
    data: {
      name: "Klayim API",
      version: "1.0.0",
    },
  };

  return c.json(response);
});

// 404 handler
app.notFound((c) => {
  const response: ApiResponse = {
    success: false,
    error: "Not found",
  };

  return c.json(response, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Error:", err);

  const response: ApiResponse = {
    success: false,
    error: "Internal server error",
  };

  return c.json(response, 500);
});

// Extended Express request type with rawBody (Firebase Functions v2)
interface FirebaseRequest extends Request {
  rawBody?: Buffer;
}

// Convert Express request to Web Request
function toWebRequest(req: FirebaseRequest): globalThis.Request {
  const url = new URL(req.url, `http://${req.headers.host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    // For webhooks, use raw body to preserve signature verification
    // Firebase Functions v2 provides rawBody as Buffer
    if (req.rawBody) {
      init.body = req.rawBody.toString("utf-8");
    } else if (req.body) {
      init.body = JSON.stringify(req.body);
    }
  }

  return new globalThis.Request(url.toString(), init);
}

// Handle request with Hono
async function handleRequest(req: Request, res: Response): Promise<void> {
  const webRequest = toWebRequest(req);
  const webResponse = await app.fetch(webRequest);

  res.status(webResponse.status);

  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await webResponse.text();
  res.send(body);
}

// Firebase Functions options
const options: HttpsOptions = {
  region: "us-central1",
  cors: true,
  secrets: [recaptchaSecretKey],
};

// Export for Firebase Functions
export const api: HttpsFunction = onRequest(options, handleRequest);
