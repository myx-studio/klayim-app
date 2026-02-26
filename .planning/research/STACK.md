# Technology Stack: B2B SaaS Integrations

**Project:** Klayim - Meeting & Task ROI Tracker
**Research Focus:** OAuth integrations + webhook handling for existing Next.js + Firebase + Hono stack
**Researched:** 2026-02-26

## Executive Summary

For multi-provider OAuth integrations with BambooHR, Rippling, Gusto, Google, Microsoft, Asana, ClickUp, and Linear, plus real-time webhooks, the recommended approach is a **hybrid strategy**:

1. **Unified HRIS API** (Finch) for HRIS providers - eliminates partner agreements and maintenance burden
2. **Direct OAuth implementations** for calendar and task management tools - better control, no per-connection fees
3. **Hono on Firebase Functions** for webhook handling - already in stack, well-suited for the task

---

## Recommended Stack

### OAuth & Authentication

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| **Finch API** | Current | HRIS integrations (BambooHR, Rippling, Gusto) | HIGH | Unified API covering 250+ HRIS/payroll providers. Avoids partner agreements (Gusto requires 2-month approval process). $50-65/connection/month but saves 100+ hours per integration. |
| **simple-oauth2** | ^5.1.0 | Custom OAuth flows for providers not in Arctic | HIGH | Flexible, well-maintained library for implementing custom OAuth 2.0 flows. Supports all grant types and custom provider configurations. |
| **Arctic** | ^3.0.0 | OAuth for Linear (pre-built client) | MEDIUM | 70+ providers with TypeScript support, but only covers Linear from your list. Use for Google, Microsoft, Linear. |
| **googleapis** | ^144.0.0 | Google Calendar API client | HIGH | Official Google SDK with built-in OAuth handling and push notification support. |
| **@microsoft/microsoft-graph-client** | ^3.0.7 | Microsoft Graph API (Calendar, Users) | HIGH | Official SDK with webhook subscription support. Requires @azure/identity for auth. |
| **@azure/identity** | ^4.4.0 | Microsoft OAuth authentication | HIGH | Required for Microsoft Graph authentication. Supports multiple auth flows. |

### Webhook Handling

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| **Hono** | 4.12.2 (existing) | Webhook endpoint framework | HIGH | Already in stack. Raw body access via `c.req.text()` critical for signature verification. |
| **Firebase Functions 2nd Gen** | 6.6.0 (existing) | Serverless webhook endpoints | HIGH | Public HTTPS endpoints, auto-scaling (up to 1000 concurrent), built-in retry logic. |
| **crypto** (Node.js built-in) | Node 20 | Webhook signature verification | HIGH | Use `crypto.timingSafeEqual()` for constant-time signature comparison. No external dep needed. |

### Payment & Billing

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| **stripe** | ^20.3.1 | Server-side Stripe SDK | HIGH | Latest version uses API 2026-01-28.clover. Server Actions recommended for Next.js 16. |
| **@stripe/stripe-js** | ^8.8.0 | Client-side Stripe.js loader | HIGH | Use `loadStripe()` for Embedded Checkout (recommended 2026 pattern). |
| **@stripe/react-stripe-js** | ^5.6.0 | React components for Stripe | HIGH | Elements and Checkout components for Next.js App Router. |

### Token Storage & Security

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| **Firestore** | (existing) | Token storage | HIGH | Built-in encryption at rest. Store tokens server-side only (Firebase Functions access). |
| **Google Cloud KMS** | Cloud service | Token encryption at application level | MEDIUM | Optional additional layer for refresh tokens. Use if compliance requires explicit encryption. |
| **@google-cloud/kms** | ^4.5.0 | KMS client (if using app-level encryption) | MEDIUM | Only needed if Firestore's built-in encryption insufficient for compliance. |

---

## Detailed Recommendations

### 1. HRIS Integrations: Use Finch (NOT Direct API)

**Recommendation:** Use Finch unified API instead of direct BambooHR/Rippling/Gusto integrations.

**Rationale:**

| Factor | Direct Integration | Finch |
|--------|-------------------|-------|
| Partner agreements | Gusto: 2-month approval required. Rippling: Partner ToS. BambooHR: Marketplace team. | Single Finch agreement |
| Development time | 100+ hours per provider | 1 week total |
| Maintenance | 3 separate APIs to maintain | 1 unified API |
| Data normalization | You handle field mapping | Finch normalizes |
| Cost (100 connections) | Free (but dev time) | ~$5,000-6,500/mo |

**Finch Pricing:** $50-65/connection/month (Starter tier). Volume discounts available.

**Why NOT Merge.dev:**
- Finch is HRIS/payroll specialized (deeper coverage)
- Finch has more HRIS integrations (250+ vs Merge's 220+ across all categories)
- Merge better for multi-category needs (CRM + HRIS + ATS)

**Implementation:**
```typescript
// Finch provides unified endpoints
GET https://api.tryfinch.com/employer/directory
GET https://api.tryfinch.com/employer/individual
GET https://api.tryfinch.com/employer/employment
```

### 2. Calendar Integrations: Direct OAuth (Google + Microsoft)

**Recommendation:** Implement direct OAuth with official SDKs.

**Google Calendar:**
```typescript
// Use googleapis with OAuth2
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Set up push notifications (webhooks)
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
await calendar.events.watch({
  calendarId: 'primary',
  requestBody: {
    id: channelId,
    type: 'web_hook',
    address: 'https://your-function-url.cloudfunctions.net/calendarWebhook'
  }
});
```

**Microsoft Graph:**
```typescript
// Use @microsoft/microsoft-graph-client
import { Client } from '@microsoft/microsoft-graph-client';

// Create subscription for calendar changes
await client.api('/subscriptions').post({
  changeType: 'created,updated,deleted',
  notificationUrl: 'https://your-function-url.cloudfunctions.net/outlookWebhook',
  resource: '/me/events',
  expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  clientState: 'secretClientState'
});
```

**Webhook Requirements:**
- Google: HTTPS with valid SSL, responds 200 OK
- Microsoft: HTTPS, responds 200 OK with validationToken on setup

### 3. Task Management: Direct OAuth (Asana, ClickUp, Linear)

**Recommendation:** Direct OAuth implementations using simple-oauth2 + official webhook patterns.

**Why NOT Arctic:**
- Arctic supports Linear but NOT Asana or ClickUp
- Using simple-oauth2 provides consistent approach across all three

**Provider-Specific Notes:**

| Provider | OAuth Flow | Webhook Setup | Signature Header |
|----------|------------|---------------|------------------|
| **Asana** | Authorization Code | Handshake required (X-Hook-Secret echo) | X-Hook-Secret |
| **ClickUp** | Authorization Code | POST to /team/{id}/webhook | X-Signature |
| **Linear** | Authorization Code + Refresh (required by April 2026) | OAuth app auto-creates | X-Linear-Signature |

**Asana Webhook Handshake:**
```typescript
app.post('/webhooks/asana', async (c) => {
  const hookSecret = c.req.header('X-Hook-Secret');
  if (hookSecret) {
    // Handshake phase
    return c.text('', 200, { 'X-Hook-Secret': hookSecret });
  }
  // Normal webhook processing...
});
```

### 4. Stripe Integration: Server Actions + Embedded Checkout

**2026 Best Practice:** Use Server Actions (not API routes) with Embedded Checkout.

```typescript
// app/actions/stripe.ts
'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover'
});

export async function createCheckoutSession(priceId: string) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    ui_mode: 'embedded',
    return_url: `${process.env.NEXT_PUBLIC_URL}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
  });

  return { clientSecret: session.client_secret };
}
```

**Webhook Handling in Hono:**
```typescript
// Critical: Get raw body for signature verification
app.post('/webhooks/stripe', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('stripe-signature')!;

  const event = await stripe.webhooks.constructEventAsync(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case 'checkout.session.completed':
      // Handle subscription creation
      break;
    case 'invoice.paid':
      // Handle successful payment
      break;
    case 'customer.subscription.deleted':
      // Handle cancellation
      break;
  }

  return c.json({ received: true });
});
```

### 5. Token Storage Architecture

**Storage Location:** Firestore (server-side access only)

```typescript
// Collection: organizations/{orgId}/integrations/{provider}
interface IntegrationTokens {
  provider: 'google' | 'microsoft' | 'asana' | 'clickup' | 'linear' | 'finch';
  accessToken: string;  // Encrypted by Firestore at rest
  refreshToken: string; // Encrypted by Firestore at rest
  expiresAt: Timestamp;
  scopes: string[];
  connectedBy: string;  // User ID
  connectedAt: Timestamp;
  metadata: Record<string, unknown>;
}
```

**Token Refresh Pattern:**
```typescript
// Proactive refresh before expiry (15 min buffer)
async function getValidAccessToken(orgId: string, provider: string): Promise<string> {
  const doc = await db.doc(`organizations/${orgId}/integrations/${provider}`).get();
  const tokens = doc.data() as IntegrationTokens;

  const bufferMs = 15 * 60 * 1000; // 15 minutes
  if (tokens.expiresAt.toMillis() - Date.now() < bufferMs) {
    return await refreshToken(orgId, provider, tokens.refreshToken);
  }

  return tokens.accessToken;
}
```

**Security Rules:**
```javascript
// Firestore rules - tokens only accessible server-side
match /organizations/{orgId}/integrations/{provider} {
  allow read, write: if false; // Admin SDK only
}
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| HRIS Integration | **Finch** | Direct APIs (BambooHR, Rippling, Gusto) | Partner agreements, 2-month Gusto approval, 300+ dev hours |
| HRIS Integration | **Finch** | Merge.dev | Finch specialized for HRIS, better coverage, clearer pricing |
| OAuth Library | **simple-oauth2** | Passport.js | Passport requires Express patterns, Hono uses different middleware model |
| OAuth Library | **simple-oauth2** | Grant | Grant designed for proxying, not API integrations |
| Calendar Webhooks | **Direct Google/Microsoft** | Unified calendar API (Nylas, Cronofy) | $500+/mo for basic tier, unnecessary abstraction |
| Stripe | **Native SDK** | LemonSqueezy, Paddle | Stripe is industry standard, better docs, existing patterns |
| Token Encryption | **Firestore built-in** | Manual Cloud KMS | Firestore encrypts at rest by default, KMS adds complexity |

---

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| **Passport.js** | Designed for Express middleware chain; Hono uses different patterns. simple-oauth2 is more flexible. |
| **Grant** | Designed as OAuth proxy, not for making API calls after OAuth. Overkill for your use case. |
| **oauth** (npm package) | Deprecated approach, replaced by simple-oauth2 and oauth4webapi. |
| **Direct BambooHR/Rippling/Gusto APIs** | Unless you already have partner agreements, the approval process and maintenance burden isn't worth it. |
| **Firebase Authentication for OAuth** | Firebase Auth is for user signin, not for storing third-party API tokens. Keep them separate. |
| **Manual encryption with crypto** | Firestore encrypts at rest. Only add KMS if compliance requires explicit control. |

---

## Installation

```bash
# Core OAuth libraries
npm install simple-oauth2 googleapis @microsoft/microsoft-graph-client @azure/identity

# Stripe
npm install stripe @stripe/stripe-js @stripe/react-stripe-js

# Optional: If using Arctic for supported providers
npm install arctic

# Optional: If explicit KMS encryption needed
npm install @google-cloud/kms
```

**Environment Variables (add to Firebase secrets):**
```bash
# HRIS (Finch)
FINCH_CLIENT_ID=
FINCH_CLIENT_SECRET=
FINCH_REDIRECT_URI=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=

# Asana
ASANA_CLIENT_ID=
ASANA_CLIENT_SECRET=

# ClickUp
CLICKUP_CLIENT_ID=
CLICKUP_CLIENT_SECRET=

# Linear
LINEAR_CLIENT_ID=
LINEAR_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Version Verification

All versions verified via npm registry and official sources as of 2026-02-26:

| Package | Version | Verified Source |
|---------|---------|-----------------|
| stripe | 20.3.1 | [npm](https://www.npmjs.com/package/stripe) |
| @stripe/stripe-js | 8.8.0 | [npm](https://www.npmjs.com/package/@stripe/stripe-js) |
| @stripe/react-stripe-js | 5.6.0 | [npm](https://www.npmjs.com/package/@stripe/react-stripe-js) |
| simple-oauth2 | 5.1.0 | [npm](https://www.npmjs.com/package/simple-oauth2) |
| arctic | 3.x | [arcticjs.dev](https://arcticjs.dev/) |
| googleapis | 144.x | [npm](https://www.npmjs.com/package/googleapis) |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Finch for HRIS** | HIGH | Multiple sources confirm, clear pricing model, eliminates partner agreements |
| **simple-oauth2 for custom OAuth** | HIGH | Established library, well-documented, works with any provider |
| **Stripe SDK versions** | HIGH | Verified against npm registry 2026-02-26 |
| **Google Calendar webhooks** | HIGH | Official documentation confirmed |
| **Microsoft Graph webhooks** | HIGH | Official documentation + samples confirmed |
| **Hono raw body access** | HIGH | Official Hono examples confirm `c.req.text()` pattern |
| **Linear OAuth refresh token migration** | MEDIUM | April 2026 deadline from Linear changelog - verify closer to date |
| **Finch pricing** | MEDIUM | $50-65/connection cited in multiple sources, may vary by plan |

---

## Open Questions

1. **Finch vs direct HRIS integration:** If you already have Gusto partner approval or specific HRIS needs, revisit direct integration option.

2. **Linear refresh token migration:** Monitor Linear's changelog for April 2026 deadline details.

3. **KMS encryption:** Determine if your compliance requirements (SOC 2, HIPAA, etc.) require explicit application-level encryption beyond Firestore's built-in encryption.

4. **Webhook endpoint URLs:** Will you use a single webhook endpoint with routing, or separate endpoints per provider? Recommend separate for cleaner signature verification.

---

## Sources

### OAuth & Authentication
- [OAuth.net Node.js Libraries](https://oauth.net/code/nodejs/)
- [Arctic Documentation](https://arcticjs.dev/)
- [simple-oauth2 GitHub](https://github.com/lelylan/simple-oauth2)

### HRIS Unified APIs
- [Finch API Documentation](https://docs.tryfinch.com/)
- [Merge vs Finch Comparison](https://www.merge.dev/vs/finch)
- [Finch API Alternatives 2026](https://www.merge.dev/blog/finch-api-alternatives)

### Provider-Specific
- [BambooHR API - OAuth Changes](https://documentation.bamboohr.com/docs/planned-changes-to-the-api)
- [Rippling Developer Portal](https://developer.rippling.com/)
- [Gusto API Authentication](https://docs.gusto.com/app-integrations/docs/authentication)
- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push)
- [Microsoft Graph Webhooks Sample](https://learn.microsoft.com/en-us/samples/microsoftgraph/nodejs-webhooks-sample/)
- [Asana Webhooks Guide](https://developers.asana.com/docs/webhooks-guide)
- [ClickUp Webhooks](https://developer.clickup.com/docs/webhooks)
- [Linear Webhooks](https://linear.app/developers/webhooks)

### Stripe
- [Stripe + Next.js 2026 Guide](https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33)
- [Hono Stripe Webhook Example](https://hono.dev/examples/stripe-webhook)
- [Stripe Webhook Signature Verification](https://docs.stripe.com/webhooks/signature)

### Token Storage
- [Firestore Server-Side Encryption](https://docs.cloud.google.com/firestore/native/docs/server-side-encryption)
- [Secure OAuth Tokens with Firebase](https://medium.com/@adamgerhant/generating-and-storing-oauth-2-0-access-tokens-with-firebase-7b8a2e285578)

---

*Last updated: 2026-02-26*
