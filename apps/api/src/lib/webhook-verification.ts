import crypto from "crypto";

/**
 * Google Calendar webhooks use a channel token for verification.
 * The token is set when creating the watch and included in each notification.
 */
export function verifyGoogleWebhook(
  channelToken: string | undefined,
  expectedToken: string
): boolean {
  if (!channelToken || !expectedToken) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(channelToken),
      Buffer.from(expectedToken)
    );
  } catch {
    return false;
  }
}

/**
 * Microsoft Graph webhooks use clientState for verification.
 * The clientState is set when creating the subscription.
 */
export function verifyMicrosoftWebhook(
  clientState: string | undefined,
  expectedState: string
): boolean {
  if (!clientState || !expectedState) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(clientState),
      Buffer.from(expectedState)
    );
  } catch {
    return false;
  }
}

/**
 * HMAC-SHA256 verification for providers that use it (BambooHR, Finch, Asana, ClickUp, Linear).
 * Some providers include timestamp in the signed payload.
 */
export function verifyHmacSignature(
  body: string,
  signature: string,
  secret: string,
  timestamp?: string
): boolean {
  let payload = body;
  if (timestamp) {
    payload = `${body}${timestamp}`;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * BambooHR uses HMAC-SHA256 with timestamp for replay protection.
 */
export function verifyBambooHRWebhook(
  body: string,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string
): boolean {
  if (!signature || !timestamp) return false;

  // Check timestamp is within 5 minutes (300 seconds)
  const requestTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - requestTime) > 300) return false;

  return verifyHmacSignature(body + timestamp, signature, secret);
}

/**
 * Asana uses X-Hook-Signature with X-Hook-Secret from handshake.
 */
export function verifyAsanaWebhook(
  body: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;
  return verifyHmacSignature(body, signature, secret);
}

/**
 * ClickUp uses X-Signature header.
 */
export function verifyClickUpWebhook(
  body: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;
  return verifyHmacSignature(body, signature, secret);
}

/**
 * Linear uses Linear-Signature header with timestamp validation.
 */
export function verifyLinearWebhook(
  body: string,
  signature: string | undefined,
  secret: string,
  webhookTimestamp: number
): boolean {
  if (!signature) return false;

  // Check timestamp is within 1 minute
  const now = Date.now();
  if (Math.abs(now - webhookTimestamp) > 60000) return false;

  return verifyHmacSignature(body, signature, secret);
}
