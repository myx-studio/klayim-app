# Phase 02: User Setup Required

**Generated:** 2026-02-26
**Phase:** 02-plan-billing
**Status:** Incomplete

Complete these items for Stripe integration to function. Claude automated everything possible; these items require human access to external dashboards/accounts.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `STRIPE_SECRET_KEY` | Stripe Dashboard -> Developers -> API keys -> Secret key | `.env.local` / Firebase secrets |
| [ ] | `STRIPE_PRICE_STARTER` | Stripe Dashboard -> Products -> Starter plan -> Price ID (e.g., price_xxx) | `.env.local` / Firebase secrets |
| [ ] | `STRIPE_PRICE_PROFESSIONAL` | Stripe Dashboard -> Products -> Professional plan -> Price ID (e.g., price_xxx) | `.env.local` / Firebase secrets |

## Account Setup

- [ ] **Create Stripe account** (if needed)
  - URL: https://dashboard.stripe.com/register
  - Skip if: Already have Stripe account

## Dashboard Configuration

- [ ] **Create Starter product with recurring price**
  - Location: Stripe Dashboard -> Products -> Add product
  - Name: Starter
  - Pricing: Recurring, $49/month (or your chosen price)
  - Copy the Price ID (starts with `price_`)

- [ ] **Create Professional product with recurring price**
  - Location: Stripe Dashboard -> Products -> Add product
  - Name: Professional
  - Pricing: Recurring, $149/month (or your chosen price)
  - Copy the Price ID (starts with `price_`)

## Local Development

For local development, add variables to `apps/api/.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PROFESSIONAL=price_xxx
```

## Verification

After completing setup:

```bash
# Check env vars are set (in apps/api directory)
grep STRIPE .env.local

# Verify API builds
cd apps/api && pnpm build

# Start API and test health endpoint
# (billing endpoints will fail without env vars)
```

Expected: Build passes, environment variables present.

---

**Once all items complete:** Mark status as "Complete" at top of file.
