# Phase 2: Plan & Billing - Research

**Researched:** 2026-02-26
**Domain:** Stripe subscription billing integration with Next.js/Hono
**Confidence:** HIGH

## Summary

This phase implements subscription billing for Klayim using Stripe Checkout with a 3-tier pricing model (Individual $49/mo, Team $149/mo, Enterprise custom). The integration uses **Stripe Checkout Session** for payment processing, which handles PCI compliance, supports multiple payment methods, and provides a pre-built checkout UI. Webhooks are critical for reliable subscription state management - never rely solely on redirect URLs after payment.

The project already has foundational types for subscriptions (`PlanType`, `ActivePlan`, `PaymentRecord`) in the shared package, and the Organization model includes `stripeCustomerId` and `activePlan` fields. The API layer uses Hono on Firebase Functions, requiring specific handling for webhook signature verification using `context.req.text()` to get raw body.

**Primary recommendation:** Use Stripe Checkout Session with subscription mode, handle webhooks on the API (Hono) layer with idempotent processing, and use Stripe Customer Portal for subscription management.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-01 | User can view 3 plan tiers (Individual $49, Team $149, Enterprise custom) | Plan display component with pricing cards; Enterprise shows "Contact Sales" CTA |
| BILL-02 | User can select Individual or Team plan and pay via Stripe Checkout | Stripe Checkout Session with mode='subscription' and line_items referencing Stripe Price IDs |
| BILL-03 | User on Enterprise plan can request contact with sales | Simple form submission with organization/user details; no payment flow |
| BILL-04 | System creates Stripe subscription and stores subscription ID | Webhook handler for `checkout.session.completed` updates Organization.activePlan and stores stripeSubscriptionId |
| BILL-05 | System handles Stripe webhooks (payment success, failure, cancellation) | Handle `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` with idempotent processing |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe (server) | ^20.3.0 | Node.js SDK for Stripe API calls | Official Stripe SDK, TypeScript support |
| @stripe/stripe-js | ^8.8.0 | Client-side Stripe.js loader | Required for PCI compliance - loads from js.stripe.com |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @stripe/react-stripe-js | Latest | React components for Stripe Elements | Only if using custom payment forms (NOT needed for Checkout) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout | Stripe Elements | More customization but 10x more code, PCI scope increases |
| Server-side session | Embedded Checkout | Embedded keeps user on domain but adds iframe complexity |
| Custom pricing page | Stripe Pricing Table | Pricing Table is no-code but limited to 4 products |

**Installation:**
```bash
# API package
cd apps/api && pnpm add stripe

# Web package (optional - only if redirecting from client)
cd apps/web && pnpm add @stripe/stripe-js
```

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
├── routes/
│   ├── billing.route.ts       # Checkout session, portal session, webhooks
│   └── index.ts               # Export billing routes
├── services/
│   ├── stripe.service.ts      # Stripe client wrapper
│   └── billing.service.ts     # Business logic for billing
├── repositories/
│   └── subscription.repository.ts  # Firestore subscription/payment data
└── models/
    └── subscription.model.ts  # Subscription entity

apps/web/src/
├── app/
│   └── onboarding/
│       └── plan-selection/
│           └── page.tsx       # Plan selection UI
├── components/
│   └── pages/
│       └── onboarding/
│           └── plan-selection/
│               ├── index.tsx          # Page component
│               ├── plan-card.tsx      # Individual plan card
│               └── enterprise-form.tsx # Contact sales form
└── lib/
    └── api/
        └── billing.ts         # API client for billing endpoints
```

### Pattern 1: Stripe Checkout Session Flow
**What:** Create checkout session on server, redirect user to Stripe-hosted page
**When to use:** For all subscription purchases (Individual, Team plans)

```typescript
// Source: Stripe official docs - Build a subscriptions integration
// apps/api/src/services/stripe.service.ts

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

export async function createCheckoutSession(params: {
  organizationId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerId?: string;
}): Promise<Stripe.Checkout.Session> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl,
    metadata: {
      organizationId: params.organizationId,
    },
    subscription_data: {
      metadata: {
        organizationId: params.organizationId,
      },
    },
  };

  if (params.customerId) {
    sessionParams.customer = params.customerId;
  } else if (params.customerEmail) {
    sessionParams.customer_email = params.customerEmail;
  }

  return stripe.checkout.sessions.create(sessionParams);
}
```

### Pattern 2: Webhook Handler with Hono
**What:** Process Stripe webhooks with signature verification
**When to use:** For all webhook endpoints

```typescript
// Source: hono.dev/examples/stripe-webhook
// apps/api/src/routes/billing.route.ts

import { Hono } from 'hono';
import Stripe from 'stripe';

const billing = new Hono();

// Webhook endpoint - NO auth middleware, needs raw body
billing.post('/webhooks/stripe', async (c) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    return c.text('Missing signature', 400);
  }

  // CRITICAL: Use text() to get raw body for signature verification
  const body = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return c.text('Invalid signature', 400);
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
      break;
  }

  // Always return 200 quickly
  return c.text('', 200);
});

export { billing as billingRoutes };
```

### Pattern 3: Idempotent Webhook Processing
**What:** Prevent duplicate processing of the same webhook event
**When to use:** All webhook handlers

```typescript
// apps/api/src/services/billing.service.ts

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const eventId = session.id; // Use session ID for idempotency

  // Check if already processed
  const existing = await processedEventsRepository.findById(eventId);
  if (existing) {
    console.log(`Event ${eventId} already processed, skipping`);
    return;
  }

  // Process the event
  const organizationId = session.metadata?.organizationId;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  await organizationRepository.update(organizationId, {
    stripeCustomerId: customerId,
    activePlan: {
      planId: determinePlanId(session),
      planType: determinePlanType(session),
      status: 'active',
      startDate: new Date().toISOString(),
      stripeSubscriptionId: subscriptionId,
    },
  });

  // Mark as processed AFTER successful update
  await processedEventsRepository.create({
    id: eventId,
    type: 'checkout.session.completed',
    processedAt: new Date().toISOString(),
  });
}
```

### Pattern 4: Customer Portal for Subscription Management
**What:** Redirect users to Stripe-hosted portal for billing management
**When to use:** When users need to update payment method, view invoices, or cancel

```typescript
// Source: Stripe docs - Integrate the customer portal
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
```

### Anti-Patterns to Avoid
- **Fulfilling on redirect:** Never grant access based solely on success_url redirect; browser can close before redirect
- **Parsing JSON body for webhooks:** Use `req.text()` not `req.json()` for Stripe signature verification
- **Storing raw body before parsing:** The raw body must be passed to `constructEvent()` untouched
- **Long-running webhook handlers:** Return 200 immediately, process asynchronously if needed
- **Missing metadata:** Always include organizationId in session metadata for webhook correlation

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment form | Custom card input | Stripe Checkout | PCI compliance, fraud protection, 3DS handling |
| Subscription management UI | Custom billing dashboard | Stripe Customer Portal | Handles edge cases, disputes, tax IDs |
| Payment retries | Custom retry logic | Stripe Smart Retries | ML-optimized retry timing |
| Invoice generation | PDF templates | Stripe Invoices | Tax calculation, localization |
| Webhook signature verification | Manual HMAC | stripe.webhooks.constructEvent() | Timing-safe comparison |

**Key insight:** Stripe has spent years building billing infrastructure. Every custom solution you build will miss edge cases around failed payments, card updates, proration, dunning, and compliance.

## Common Pitfalls

### Pitfall 1: Webhook Route Body Parsing
**What goes wrong:** Stripe signature verification fails with "No signatures found matching the expected signature for payload"
**Why it happens:** Express/Next.js middleware auto-parses JSON body before your handler sees it
**How to avoid:** In Hono, use `context.req.text()`. In Next.js App Router, use `req.text()`. Never use body-parser middleware on webhook routes.
**Warning signs:** Works locally, fails in production; 400 errors with signature mismatch

### Pitfall 2: Missing Webhook Event Types
**What goes wrong:** Subscriptions created but users don't get access, or cancellations not reflected
**Why it happens:** Only handling `checkout.session.completed`, missing `invoice.paid` for renewals
**How to avoid:** Handle these events: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted, customer.subscription.updated
**Warning signs:** First month works, second month access issues

### Pitfall 3: Duplicate Webhook Processing
**What goes wrong:** User charged twice, duplicate fulfillment emails
**Why it happens:** Stripe retries failed webhooks; network issues cause duplicate delivery
**How to avoid:** Track processed event IDs in database, check before processing
**Warning signs:** Duplicate records with same Stripe IDs

### Pitfall 4: Price ID Hardcoding
**What goes wrong:** Checkout fails when switching between test/live mode
**Why it happens:** Test mode and live mode have different Price IDs
**How to avoid:** Store Price IDs in environment variables: `STRIPE_PRICE_INDIVIDUAL`, `STRIPE_PRICE_TEAM`
**Warning signs:** Works in test, "No such price" errors in production

### Pitfall 5: Webhook Middleware Collision
**What goes wrong:** 401 Unauthorized on webhook endpoints
**Why it happens:** Auth middleware applied globally catches webhook routes
**How to avoid:** Mount webhook route before auth middleware, or exclude from matcher
**Warning signs:** Stripe dashboard shows webhook failures with 401/405

## Code Examples

### Complete Billing Route Setup
```typescript
// apps/api/src/routes/billing.route.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { billingService } from '@/services/index.js';
import type { ApiResponse } from '@klayim/shared/types';

const billing = new Hono();

// POST /billing/checkout - Create checkout session
billing.post(
  '/checkout',
  zValidator('json', z.object({
    organizationId: z.string(),
    planType: z.enum(['starter', 'professional']), // Not enterprise
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
  })),
  async (c) => {
    const userId = c.get('userId') as string | undefined;
    if (!userId) {
      return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 401);
    }

    const input = c.req.valid('json');
    const result = await billingService.createCheckoutSession(input, userId);

    if ('error' in result) {
      return c.json<ApiResponse<null>>({ success: false, error: result.error }, 400);
    }

    return c.json<ApiResponse<{ checkoutUrl: string; sessionId: string }>>({
      success: true,
      data: {
        checkoutUrl: result.url!,
        sessionId: result.id,
      },
    });
  }
);

// POST /billing/portal - Create customer portal session
billing.post(
  '/portal',
  zValidator('json', z.object({
    organizationId: z.string(),
    returnUrl: z.string().url(),
  })),
  async (c) => {
    const userId = c.get('userId') as string | undefined;
    if (!userId) {
      return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 401);
    }

    const input = c.req.valid('json');
    const result = await billingService.createPortalSession(input, userId);

    if ('error' in result) {
      return c.json<ApiResponse<null>>({ success: false, error: result.error }, 400);
    }

    return c.json<ApiResponse<{ portalUrl: string }>>({
      success: true,
      data: { portalUrl: result.url },
    });
  }
);

// POST /billing/contact-sales - Enterprise contact request
billing.post(
  '/contact-sales',
  zValidator('json', z.object({
    organizationId: z.string(),
    name: z.string().min(2),
    email: z.string().email(),
    company: z.string().min(2),
    message: z.string().optional(),
  })),
  async (c) => {
    const input = c.req.valid('json');
    await billingService.submitContactSalesRequest(input);

    return c.json<ApiResponse<null>>({
      success: true,
      message: 'Contact request submitted',
    });
  }
);

export { billing as billingRoutes };
```

### Webhook Route (Separate, No Auth)
```typescript
// apps/api/src/routes/webhook.route.ts
import { Hono } from 'hono';
import Stripe from 'stripe';
import { webhookService } from '@/services/index.js';

const webhooks = new Hono();

webhooks.post('/stripe', async (c) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    console.error('Missing Stripe signature header');
    return c.text('Missing signature', 400);
  }

  const body = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return c.text('Invalid signature', 400);
  }

  // Process webhook asynchronously but return 200 immediately
  try {
    await webhookService.processStripeEvent(event);
  } catch (err) {
    console.error('Error processing webhook:', err);
    // Still return 200 to prevent retries - log for investigation
  }

  return c.text('', 200);
});

export { webhooks as webhookRoutes };
```

### Plan Selection Component
```typescript
// apps/web/src/components/pages/onboarding/plan-selection/index.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlanCard } from './plan-card';
import { EnterpriseForm } from './enterprise-form';
import { useCreateCheckoutSession } from '@/hooks/use-billing';
import { useOrganization } from '@/hooks/use-organization';

const PLANS = [
  {
    id: 'individual',
    name: 'Individual',
    price: 49,
    priceLabel: '$49/month',
    description: 'Perfect for freelancers and solo consultants',
    features: [
      'Track unlimited meetings',
      '1 calendar connection',
      'Basic ROI reports',
      'Email support',
    ],
    cta: 'Get Started',
  },
  {
    id: 'team',
    name: 'Team',
    price: 149,
    priceLabel: '$149/month',
    description: 'For growing teams who value their time',
    features: [
      'Everything in Individual',
      'Up to 25 team members',
      'HRIS integration',
      'Task management sync',
      'Advanced governance rules',
      'Priority support',
    ],
    cta: 'Get Started',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    description: 'For organizations with complex needs',
    features: [
      'Everything in Team',
      'Unlimited team members',
      'Custom integrations',
      'Dedicated account manager',
      'SSO & advanced security',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
  },
];

export default function PlanSelectionPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);
  const createCheckout = useCreateCheckoutSession();

  const handlePlanSelect = async (planId: string) => {
    if (planId === 'enterprise') {
      setShowEnterpriseForm(true);
      return;
    }

    if (!organization?.id) return;

    const planType = planId === 'individual' ? 'starter' : 'professional';

    const result = await createCheckout.mutateAsync({
      organizationId: organization.id,
      planType,
      successUrl: `${window.location.origin}/onboarding/setup-organization`,
      cancelUrl: `${window.location.origin}/onboarding/plan-selection`,
    });

    // Redirect to Stripe Checkout
    window.location.href = result.checkoutUrl;
  };

  if (showEnterpriseForm) {
    return <EnterpriseForm onBack={() => setShowEnterpriseForm(false)} />;
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Choose your plan</h1>
        <p className="mt-2 text-muted-foreground">
          Start tracking the true cost of your meetings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            {...plan}
            onSelect={() => handlePlanSelect(plan.id)}
            loading={createCheckout.isPending}
          />
        ))}
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redirect Checkout | Embedded Checkout | 2024 | Keep users on your domain, higher conversion |
| API v1 subscriptions | Checkout Session mode=subscription | 2022 | Simpler integration, built-in trial support |
| Custom billing pages | Customer Portal | 2020 | Eliminates 80% of billing UI code |
| Manual retry logic | Smart Retries | 2023 | ML-optimized payment recovery |

**Deprecated/outdated:**
- Sources API: Replaced by PaymentMethods and PaymentIntents
- Charges API: Use PaymentIntents for new integrations
- Token API: Use Stripe.js loadStripe() and Elements

## Open Questions

1. **Price ID Management**
   - What we know: Need separate Price IDs for test/live modes
   - What's unclear: Where to store Price ID → Plan type mapping
   - Recommendation: Environment variables `STRIPE_PRICE_INDIVIDUAL`, `STRIPE_PRICE_TEAM`, with a config object mapping planType to priceId

2. **Enterprise Contact Storage**
   - What we know: Need to capture enterprise interest with contact details
   - What's unclear: Where to store leads (Firestore? CRM integration?)
   - Recommendation: Store in Firestore `enterprise_leads` collection for v1, CRM integration deferred

3. **Subscription Status on Org Model**
   - What we know: Organization model has `activePlan` field
   - What's unclear: How to map all Stripe subscription statuses
   - Recommendation: Map active/trialing to 'active', past_due keeps 'active' with flag, canceled/unpaid to 'expired'

## Sources

### Primary (HIGH confidence)
- [Stripe Documentation - Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions) - Checkout session patterns, webhook events
- [Stripe Documentation - Webhooks for subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks) - Complete webhook event list
- [Stripe Documentation - Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal) - Portal integration
- [Hono Examples - Stripe Webhook](https://hono.dev/examples/stripe-webhook) - Raw body handling pattern
- [Stripe npm package](https://www.npmjs.com/package/stripe) - Version 20.3.0, API 2026-02-25.clover
- [@stripe/stripe-js npm](https://www.npmjs.com/package/@stripe/stripe-js) - Version 8.8.0

### Secondary (MEDIUM confidence)
- [Stripe + Next.js 2026 Guide](https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33) - Architecture recommendations
- [Firebase + Stripe Subscriptions](https://aronschueler.de/blog/2025/03/17/implementing-stripe-subscriptions-with-firebase-cloud-functions-and-firestore/) - Firestore data model patterns

### Tertiary (LOW confidence)
- Enterprise contact form best practices - General SaaS patterns, needs validation against specific requirements

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Stripe docs, npm packages verified
- Architecture: HIGH - Stripe patterns well-documented, Hono example verified
- Pitfalls: HIGH - Multiple sources confirm common issues
- Enterprise flow: MEDIUM - Standard SaaS pattern, project-specific details unclear

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (Stripe APIs stable, 30-day validity)
