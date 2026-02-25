import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { onRequest, HttpsFunction, HttpsOptions } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

import { healthRoute, userRoute } from "./routes/index.js";
import type { ApiResponse } from "./types/index.js";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

// Routes
app.route("/health", healthRoute);
app.route("/users", userRoute);

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

// Convert Express request to Web Request
function toWebRequest(req: Request): globalThis.Request {
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

  if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
    init.body = JSON.stringify(req.body);
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
  region: "asia-southeast1",
  cors: true,
};

// Export for Firebase Functions
export const api: HttpsFunction = onRequest(options, handleRequest);
