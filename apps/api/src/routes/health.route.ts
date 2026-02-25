import { Hono } from "hono";
import type { ApiResponse } from "@/types/index.js";

const healthRoute = new Hono();

healthRoute.get("/", (c) => {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  };

  return c.json(response);
});

export { healthRoute };
