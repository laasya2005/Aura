import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  validateTwilioSignature,
  checkTcpaKeywords,
  sendWhatsApp,
  formatForWhatsApp,
  buildTwimlSay,
  buildTwimlHangup,
} from "@aura/comms";

import { ConversationService } from "../services/conversation.service.js";
import { EngagementService } from "../services/engagement.service.js";
import { buildAuditLogger } from "../services/audit.service.js";

export default async function webhookRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const conversationService = new ConversationService(server.prisma, server.redis, audit);
  const engagementService = new EngagementService(server.prisma, audit);

  // Twilio signature validation hook for all twilio webhooks
  async function validateTwilio(request: FastifyRequest, reply: FastifyReply) {
    // Only skip validation when explicitly opted out in non-production
    if (process.env.NODE_ENV !== "production" && process.env.SKIP_WEBHOOK_VALIDATION === "true")
      return;

    const signature = request.headers["x-twilio-signature"] as string;
    if (!signature) {
      return reply.status(403).send({ error: "Missing Twilio signature" });
    }

    const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? 3001}`;
    const url = `${baseUrl}${request.url}`;

    const valid = validateTwilioSignature(url, request.body as Record<string, string>, signature);

    if (!valid) {
      return reply.status(403).send({ error: "Invalid Twilio signature" });
    }
  }

  // POST /webhooks/twilio/whatsapp — Inbound WhatsApp message
  server.post("/webhooks/twilio/whatsapp", {
    preHandler: validateTwilio,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        From: string;
        To: string;
        Body: string;
        MessageSid: string;
      };

      // Twilio sends WhatsApp numbers as "whatsapp:+1234567890"
      const phone = body.From?.replace("whatsapp:", "");
      const content = body.Body?.trim();

      if (!phone || !content) {
        return reply.status(400).send({ error: "Missing required fields" });
      }

      // STOP/HELP keyword handling
      const tcpaAction = checkTcpaKeywords(content);
      if (tcpaAction === "stop") {
        const user = await server.prisma.user.findUnique({ where: { phone } });
        if (user) {
          await server.prisma.consentRecord.create({
            data: {
              userId: user.id,
              type: "WHATSAPP",
              granted: false,
            },
          });

          await audit({
            userId: user.id,
            action: "consent.whatsapp.revoked_via_stop",
            resource: "consent",
          });
        }

        // Reply via WhatsApp
        await sendWhatsApp(
          phone,
          "You have been unsubscribed from Aura messages. Send START to re-subscribe."
        );
        return reply.send({ received: true });
      }

      if (tcpaAction === "help") {
        await sendWhatsApp(
          phone,
          "Aura - AI Companion. Send STOP to unsubscribe. For support visit aura.app/help or email help@aura.app"
        );
        return reply.send({ received: true });
      }

      // Find user
      const user = await server.prisma.user.findUnique({ where: { phone } });
      if (!user) {
        await sendWhatsApp(phone, "Welcome! Download Aura to get started: aura.app");
        return reply.send({ received: true });
      }

      // Check WhatsApp consent
      const consent = await server.prisma.consentRecord.findFirst({
        where: { userId: user.id, type: "WHATSAPP" },
        orderBy: { grantedAt: "desc" },
      });

      if (!consent?.granted) {
        await sendWhatsApp(phone, "Please enable WhatsApp in your Aura settings to chat.");
        return reply.send({ received: true });
      }

      // Process the message
      try {
        const result = await conversationService.sendMessage(
          user.id,
          user.plan,
          content,
          "WHATSAPP",
          request.ip
        );

        // Auto-track engagement for streaks + mark schedules completed
        try {
          await engagementService.recordEngagement(user.id, "WHATSAPP", "MESSAGE_RESPONSE");
          await engagementService.completeScheduleExecutions(user.id, "WHATSAPP");
        } catch (e) {
          server.log.warn(e, "Failed to record engagement");
        }

        const waContent = formatForWhatsApp(result.response.content);
        await sendWhatsApp(phone, waContent);
        return reply.send({ received: true });
      } catch (error) {
        server.log.error(error, "Failed to process inbound WhatsApp message");
        await sendWhatsApp(phone, "Sorry, I'm having trouble right now. I'll be back soon!");
        return reply.send({ received: true });
      }
    },
  });

  // POST /webhooks/twilio/voice/answer — Call answered
  server.post("/webhooks/twilio/voice/answer", {
    preHandler: validateTwilio,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        From: string;
        To: string;
        CallSid: string;
        AnsweredBy?: string;
      };

      // If machine/voicemail detected, hang up (but allow "human" and "unknown")
      if (body.AnsweredBy && body.AnsweredBy.startsWith("machine")) {
        return reply.type("text/xml").send(buildTwimlHangup());
      }

      // Outbound call: From=Twilio number, To=user's phone
      // Inbound call: From=user's phone, To=Twilio number
      // Try both to handle either direction
      const user =
        (await server.prisma.user.findUnique({
          where: { phone: body.To },
          include: { auraProfile: true },
        })) ??
        (await server.prisma.user.findUnique({
          where: { phone: body.From },
          include: { auraProfile: true },
        }));

      if (!user) {
        return reply.type("text/xml").send(buildTwimlHangup());
      }

      // Generate a greeting
      try {
        const result = await conversationService.generateProactiveMessage(
          user.id,
          "check_in",
          "VOICE"
        );

        // For now use Twilio's built-in TTS
        // TODO: integrate ElevenLabs audio URL when available
        return reply.type("text/xml").send(buildTwimlSay(result.content));
      } catch {
        return reply
          .type("text/xml")
          .send(buildTwimlSay("Hey! This is Aura. How are you doing today?"));
      }
    },
  });

  // POST /webhooks/twilio/voice/status — Call status updates
  server.post("/webhooks/twilio/voice/status", {
    preHandler: validateTwilio,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        CallSid: string;
        CallStatus: string;
        CallDuration?: string;
        From: string;
        To: string;
      };

      server.log.info(
        { callSid: body.CallSid, status: body.CallStatus, duration: body.CallDuration },
        "Voice call status update"
      );

      // Track call completion for usage metering
      if (body.CallStatus === "completed" && body.CallDuration) {
        // For outbound calls, From is the Twilio number and To is the user's phone.
        // For inbound calls, From is the user's phone. Try both to find the user.
        const user =
          (await server.prisma.user.findUnique({ where: { phone: body.To } })) ??
          (await server.prisma.user.findUnique({ where: { phone: body.From } }));

        if (user) {
          await audit({
            userId: user.id,
            action: "voice.call.completed",
            resource: "voice",
            metadata: {
              callSid: body.CallSid,
              duration: parseInt(body.CallDuration, 10),
            },
          });

          // Auto-track engagement for streaks + mark schedules completed
          try {
            await engagementService.recordEngagement(user.id, "VOICE", "VOICE_CALL_COMPLETED", {
              callSid: body.CallSid,
              duration: parseInt(body.CallDuration, 10),
            });
            await engagementService.completeScheduleExecutions(user.id, "VOICE");
          } catch (e) {
            server.log.warn(e, "Failed to record engagement");
          }
        }
      }

      return reply.send({ received: true });
    },
  });

  // POST /webhooks/stripe — Stripe webhook (signature verification FIRST, then idempotency)
  server.post("/webhooks/stripe", async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers["stripe-signature"] as string;
    if (!signature) {
      return reply.status(400).send({ error: "Missing Stripe signature" });
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      return reply.status(400).send({ error: "Missing raw body for signature verification" });
    }

    // Verify signature FIRST to prevent event poisoning via fabricated payloads
    const { StripeService } = await import("../services/stripe.service.js");
    const stripeService = new StripeService(server.prisma, audit);

    let verifiedEvent: { id: string; type: string; data: { object: Record<string, unknown> } };
    try {
      // handleWebhookEvent verifies signature internally — call it and let it throw on invalid sig
      // But we need the event ID for idempotency, so we pre-verify here
      verifiedEvent = stripeService.verifySignature(rawBody, signature);
    } catch (error) {
      server.log.error(error, "Stripe webhook signature verification failed");
      return reply.status(400).send({ error: "Invalid signature" });
    }

    // Idempotency check AFTER signature verification
    const idempotencyKey = `stripe:evt:${verifiedEvent.id}`;
    const isNew = await server.redis.set(idempotencyKey, "1", "EX", 86400, "NX");
    if (isNew === null) {
      // Already processed this event
      return reply.send({ received: true });
    }

    try {
      await stripeService.handleVerifiedEvent(verifiedEvent);
      return reply.send({ received: true });
    } catch (error) {
      // Remove idempotency key on failure so the event can be retried
      await server.redis.del(idempotencyKey);
      server.log.error(error, "Stripe webhook error");
      return reply.status(400).send({ error: "Webhook processing failed" });
    }
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
