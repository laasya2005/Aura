import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "@aura/shared";
import { StripeService } from "../services/stripe.service.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function billingRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const stripeService = new StripeService(server.prisma, audit);

  server.addHook("onRequest", authMiddleware);

  // POST /billing/checkout
  server.post("/billing/checkout", async (request: FastifyRequest, reply: FastifyReply) => {
    const { plan } = request.body as { plan?: string };

    if (!plan || (plan !== "PRO" && plan !== "ELITE")) {
      throw AppError.validation("Plan must be PRO or ELITE");
    }

    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
    const result = await stripeService.createCheckoutSession(
      request.user!.sub,
      plan as "PRO" | "ELITE",
      `${webUrl}/settings?billing=success`,
      `${webUrl}/settings?billing=canceled`
    );

    return reply.send({ success: true, data: result });
  });

  // POST /billing/confirm — Confirm checkout session and apply plan upgrade
  server.post("/billing/confirm", async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.body as { sessionId?: string };

    if (!sessionId) {
      throw AppError.validation("Missing session ID");
    }

    const result = await stripeService.confirmCheckoutSession(request.user!.sub, sessionId);
    return reply.send({ success: true, data: result });
  });

  // POST /billing/portal
  server.post("/billing/portal", async (request: FastifyRequest, reply: FastifyReply) => {
    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
    const result = await stripeService.createPortalSession(request.user!.sub, `${webUrl}/settings`);

    return reply.send({ success: true, data: result });
  });
}
