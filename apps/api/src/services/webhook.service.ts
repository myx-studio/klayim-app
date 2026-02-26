import type Stripe from "stripe";
import { processedEventRepository, organizationRepository } from "@/repositories/index.js";
import type { SubscriptionStatus, PlanType } from "@klayim/shared/types";

class WebhookService {
  async processStripeEvent(event: Stripe.Event): Promise<void> {
    // Idempotency check
    const existing = await processedEventRepository.findById(event.id);
    if (existing) {
      console.log(`Event ${event.id} already processed, skipping`);
      return;
    }

    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark as processed AFTER successful handling
    await processedEventRepository.create({
      id: event.id,
      type: event.type,
      processedAt: new Date().toISOString(),
    });
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const organizationId = session.metadata?.organizationId;
    if (!organizationId) {
      console.error("No organizationId in checkout session metadata");
      return;
    }

    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;
    const planType = (session.metadata?.planType || "starter") as PlanType;

    // Update organization with subscription data
    await organizationRepository.update(organizationId, {
      stripeCustomerId: customerId,
      activePlan: {
        planId: subscriptionId,
        planType,
        status: "active",
        startDate: new Date().toISOString(),
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
      },
    });

    console.log(`Organization ${organizationId} subscription activated: ${subscriptionId}`);
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // Stripe SDK v20: subscription is accessed via parent.subscription_details.subscription
    const subscriptionData = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subscriptionData === "string"
      ? subscriptionData
      : subscriptionData?.id;
    if (!subscriptionId) return;

    // Find organization by subscription ID and update period dates
    // For v1, just log - organization lookup by subscriptionId needs separate method
    console.log(`Invoice paid for subscription: ${subscriptionId}`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Stripe SDK v20: subscription is accessed via parent.subscription_details.subscription
    const subscriptionData = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subscriptionData === "string"
      ? subscriptionData
      : subscriptionData?.id;
    console.error(`Payment failed for subscription: ${subscriptionId}`);
    // TODO: Update organization status to past_due, send notification
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) {
      console.error("No organizationId in subscription metadata");
      return;
    }

    const org = await organizationRepository.findById(organizationId);
    if (!org || !org.activePlan) {
      console.error(`Organization ${organizationId} not found or has no active plan`);
      return;
    }

    await organizationRepository.update(organizationId, {
      activePlan: {
        ...org.activePlan,
        status: "cancelled",
        endDate: new Date().toISOString(),
      },
    });

    console.log(`Organization ${organizationId} subscription canceled`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    const org = await organizationRepository.findById(organizationId);
    if (!org || !org.activePlan) return;

    const status = this.mapStripeStatus(subscription.status);
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;

    // Stripe SDK v20 uses start_date and billing_cycle_anchor instead of current_period_start/end
    // billing_cycle_anchor indicates the reference point for billing cycles
    await organizationRepository.update(organizationId, {
      activePlan: {
        ...org.activePlan,
        status,
        cancelAtPeriodEnd,
        currentPeriodStart: new Date(subscription.start_date * 1000).toISOString(),
        currentPeriodEnd: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : undefined,
      },
    });
  }

  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case "active":
      case "trialing":
        return stripeStatus;
      case "past_due":
        return "past_due";
      case "canceled":
      case "unpaid":
        return "canceled";
      default:
        return "expired";
    }
  }
}

export const webhookService = new WebhookService();
