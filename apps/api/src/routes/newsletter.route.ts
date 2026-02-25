import { zValidator } from "@hono/zod-validator";
import { newsletterSubscribeSchema } from "@klayim/shared";
import { Hono } from "hono";
import { newsletterService } from "../services/newsletter.service.js";

const newsletterRoute = new Hono();

newsletterRoute.post("/subscribe", zValidator("json", newsletterSubscribeSchema), async (c) => {
  const { email, recaptchaToken } = c.req.valid("json");

  const result = await newsletterService.subscribe(email, recaptchaToken);

  if (!result.success) {
    return c.json(
      {
        success: false,
        error: result.message,
      },
      400
    );
  }

  return c.json({
    success: true,
    message: result.message,
    data: {
      alreadySubscribed: result.alreadySubscribed || false,
    },
  });
});

export { newsletterRoute };
