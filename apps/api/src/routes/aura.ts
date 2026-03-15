import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { updateAuraProfileSchema, tuneAuraSchema, AppError } from "@aura/shared";
import { AuraService } from "../services/aura.service.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function auraRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const auraService = new AuraService(server.prisma, audit);

  // All aura routes require auth
  server.addHook("onRequest", authMiddleware);

  // GET /aura/profile
  server.get("/aura/profile", async (request: FastifyRequest, reply: FastifyReply) => {
    const profile = await auraService.getProfile(request.user!.sub);
    return reply.send({ success: true, data: profile });
  });

  // PATCH /aura/profile
  server.patch("/aura/profile", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = updateAuraProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation("Invalid input", parsed.error.flatten());
    }

    const profile = await auraService.updateProfile(request.user!.sub, parsed.data, request.ip);
    return reply.send({ success: true, data: profile });
  });

  // POST /aura/tune
  server.post("/aura/tune", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = tuneAuraSchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation("Invalid input", parsed.error.flatten());
    }

    const profile = await auraService.tuneWithNaturalLanguage(
      request.user!.sub,
      parsed.data.instruction,
      request.user!.plan,
      request.ip
    );
    return reply.send({ success: true, data: profile });
  });
}
