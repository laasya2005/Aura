import type { PrismaClient } from "@aura/db";
import { AppError, ErrorCode, type AuditLogger, AuditActions } from "@aura/shared";

// Lazy-loaded Stripe SDK
let stripe: import("stripe").default | null = null;

function getStripe(): import("stripe").default {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY must be set");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require("stripe").default ?? require("stripe");
    stripe = new Stripe(key, { apiVersion: "2024-04-10" as string });
  }
  return stripe!;
}

function getPriceId(plan: string): string {
  const ids: Record<string, string | undefined> = {
    PRO: process.env.STRIPE_PRICE_PRO,
    ELITE: process.env.STRIPE_PRICE_ELITE,
  };
  return ids[plan] ?? "";
}

export class StripeService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditLogger
  ) {}

  async createCheckoutSession(
    userId: string,
    plan: "PRO" | "ELITE",
    successUrl: string,
    cancelUrl: string
  ): Promise<{ url: string }> {
    const priceId = getPriceId(plan);
    if (!priceId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `No price configured for ${plan}`, 400);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) throw AppError.notFound("User");

    const s = getStripe();

    // Find or create Stripe customer
    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await s.customers.create({
        metadata: { userId },
        email: user.email,
        ...(user.phone ? { phone: user.phone } : {}),
      });
      customerId = customer.id;
    }

    const session = await s.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: { userId, plan },
    });

    if (!session.url) {
      throw AppError.internal("Failed to create checkout session");
    }

    return { url: session.url };
  }

  async createPortalSession(userId: string, returnUrl: string): Promise<{ url: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw AppError.notFound("No active subscription found");
    }

    const s = getStripe();
    const session = await s.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // Confirm a completed checkout session and apply the plan upgrade.
  // This is called by the frontend after redirect from Stripe, as a fallback
  // for environments where webhooks may not be reachable (e.g., local dev).
  async confirmCheckoutSession(userId: string, sessionId: string): Promise<{ plan: string }> {
    const s = getStripe();
    const session = await s.checkout.sessions.retrieve(sessionId);

    // Verify the session belongs to this user
    const sessionUserId = (session.metadata as Record<string, string> | null)?.userId;
    if (sessionUserId !== userId) {
      throw AppError.unauthorized("Session does not belong to this user");
    }

    if (session.payment_status !== "paid") {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Payment not completed", 400);
    }

    const plan = (session.metadata as Record<string, string>)?.plan as "PRO" | "ELITE";
    if (!plan) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Missing plan in session metadata", 400);
    }

    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    // Idempotent: apply the plan (same logic as webhook handler)
    await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: customerId,
          stripeSubId: subscriptionId,
          plan,
          status: "ACTIVE",
        },
        update: {
          stripeCustomerId: customerId,
          stripeSubId: subscriptionId,
          plan,
          status: "ACTIVE",
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { plan },
      }),
    ]);

    await this.audit({
      userId,
      action: AuditActions.SUBSCRIPTION_CREATED,
      resource: "subscription",
      metadata: { plan, source: "checkout_confirm" },
    });

    return { plan };
  }

  // Verify Stripe webhook signature and return the parsed event
  verifySignature(
    rawBody: Buffer,
    signature: string
  ): { id: string; type: string; data: { object: Record<string, unknown> } } {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET must be set");

    const s = getStripe();
    const event = s.webhooks.constructEvent(rawBody, signature, webhookSecret);
    return event as unknown as {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    };
  }

  // Process an already-verified event
  async handleVerifiedEvent(event: {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  }): Promise<void> {
    const obj = event.data.object;

    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(obj);
        break;
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(obj);
        break;
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(obj);
        break;
      case "invoice.payment_failed":
        await this.handlePaymentFailed(obj);
        break;
    }
  }

  // Legacy method that verifies + processes in one call
  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    const event = this.verifySignature(rawBody, signature);
    await this.handleVerifiedEvent(event);
  }

  private async handleCheckoutCompleted(session: Record<string, unknown>) {
    let userId = (session.metadata as Record<string, string>)?.userId;
    let plan = (session.metadata as Record<string, string>)?.plan as "PRO" | "ELITE" | undefined;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    // Payment Links: user ID comes via client_reference_id (appended to the link URL)
    if (!userId) {
      userId = session.client_reference_id as string | undefined;
    }

    // Resolve plan from subscription price ID when metadata is missing (Payment Links)
    if (!plan && subscriptionId) {
      try {
        const s = getStripe();
        const sub = await s.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price?.id;
        if (priceId === process.env.STRIPE_PRICE_PRO) plan = "PRO";
        else if (priceId === process.env.STRIPE_PRICE_ELITE) plan = "ELITE";
      } catch {
        // ignore
      }
    }

    if (!userId || !plan) return;

    await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: customerId,
          stripeSubId: subscriptionId,
          plan,
          status: "ACTIVE",
        },
        update: {
          stripeCustomerId: customerId,
          stripeSubId: subscriptionId,
          plan,
          status: "ACTIVE",
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { plan },
      }),
    ]);

    await this.audit({
      userId,
      action: AuditActions.SUBSCRIPTION_CREATED,
      resource: "subscription",
      metadata: { plan, source: session.payment_link ? "payment_link" : "checkout" },
    });

    // Send upgrade confirmation via iMessage if the user has a phone
    await this.sendUpgradeConfirmation(userId, plan);
  }

  private async sendUpgradeConfirmation(userId: string, plan: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, firstName: true },
      });

      if (!user?.phone || !process.env.SENDBLUE_API_KEY) return;

      const name = user.firstName ? ` ${user.firstName}` : "";
      const message = `Hey${name}! Your upgrade just went through — you're officially on the ${plan} plan! 🎉 I'm so excited for you. Let's make the most of it together!`;

      const { SendblueService } = await import("./sendblue.service.js");
      const sendblue = new SendblueService(this.prisma);
      await sendblue.sendMessage(user.phone, message);
    } catch (err) {
      console.error("[stripe] Failed to send upgrade confirmation:", err);
    }
  }

  private async handleSubscriptionUpdated(sub: Record<string, unknown>) {
    const stripeSubId = sub.id as string;
    const status = sub.status as string;
    const cancelAtPeriodEnd = sub.cancel_at_period_end as boolean;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubId },
    });

    if (!subscription) return;

    const dbStatus =
      status === "active"
        ? "ACTIVE"
        : status === "past_due"
          ? "PAST_DUE"
          : status === "trialing"
            ? "TRIALING"
            : "CANCELED";

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: dbStatus,
        cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
      },
    });

    await this.audit({
      userId: subscription.userId,
      action: AuditActions.SUBSCRIPTION_UPDATED,
      resource: "subscription",
      metadata: { status: dbStatus },
    });
  }

  private async handleSubscriptionDeleted(sub: Record<string, unknown>) {
    const stripeSubId = sub.id as string;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubId },
    });

    if (!subscription) return;

    // Use transaction to ensure subscription cancel and user downgrade are atomic
    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "CANCELED" },
      }),
      this.prisma.user.update({
        where: { id: subscription.userId },
        data: { plan: "FREE" },
      }),
    ]);

    await this.audit({
      userId: subscription.userId,
      action: AuditActions.SUBSCRIPTION_CANCELED,
      resource: "subscription",
    });
  }

  private async handlePaymentFailed(invoice: Record<string, unknown>) {
    const customerId = invoice.customer as string;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "PAST_DUE" },
    });

    await this.audit({
      userId: subscription.userId,
      action: "subscription.payment_failed",
      resource: "subscription",
    });
  }
}
