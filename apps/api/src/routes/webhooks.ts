import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { buildAuditLogger } from "../services/audit.service.js";
import { SendblueService } from "../services/sendblue.service.js";
import { ConversationService } from "../services/conversation.service.js";

export default async function webhookRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const conversationService = new ConversationService(server.prisma, server.redis, audit);

  // Lazily initialized (Sendblue env vars may not be set in all environments)
  let sendblue: SendblueService | null = null;
  function getSendblue() {
    if (!sendblue) sendblue = new SendblueService(server.prisma);
    return sendblue;
  }

  // POST /webhooks/stripe
  server.post("/webhooks/stripe", async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers["stripe-signature"] as string;
    if (!signature) {
      return reply.status(400).send({ error: "Missing Stripe signature" });
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      return reply.status(400).send({ error: "Missing raw body for signature verification" });
    }

    const { StripeService } = await import("../services/stripe.service.js");
    const stripeService = new StripeService(server.prisma, audit);

    let verifiedEvent: { id: string; type: string; data: { object: Record<string, unknown> } };
    try {
      verifiedEvent = stripeService.verifySignature(rawBody, signature);
    } catch (error) {
      server.log.error(error, "Stripe webhook signature verification failed");
      return reply.status(400).send({ error: "Invalid signature" });
    }

    const idempotencyKey = `stripe:evt:${verifiedEvent.id}`;
    const isNew = await server.redis.set(idempotencyKey, "1", "EX", 86400, "NX");
    if (isNew === null) {
      return reply.send({ received: true });
    }

    try {
      await stripeService.handleVerifiedEvent(verifiedEvent);
      return reply.send({ received: true });
    } catch (error) {
      await server.redis.del(idempotencyKey);
      server.log.error(error, "Stripe webhook error");
      return reply.status(400).send({ error: "Webhook processing failed" });
    }
  });

  // POST /webhooks/sendblue — Inbound iMessage via Sendblue
  server.post("/webhooks/sendblue", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      number?: string;
      content?: string;
      message_id?: string;
    };

    const from = body.number;
    const content = body.content;
    const messageId = body.message_id;

    if (!from || !content) {
      return reply.status(400).send({ error: "Missing number or content" });
    }

    if (messageId) {
      const idempotencyKey = `sendblue:msg:${messageId}`;
      const isNew = await server.redis.set(idempotencyKey, "1", "EX", 86400, "NX");
      if (isNew === null) {
        return reply.send({ received: true });
      }
    }

    try {
      const sb = getSendblue();
      const { userId, plan } = await sb.getOrCreateUserByPhone(from);
      const result = await conversationService.sendMessage(userId, plan, content, "SMS");
      await sb.sendMessage(from, result.response.content);

      server.log.info({ from: from.slice(-4), messageId }, "iMessage processed and replied");
      return reply.send({ received: true });
    } catch (error) {
      server.log.error(error, "Sendblue webhook processing failed");
      if (messageId) {
        await server.redis.del(`sendblue:msg:${messageId}`);
      }
      return reply.status(500).send({ error: "Processing failed" });
    }
  });
}
