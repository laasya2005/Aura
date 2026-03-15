import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { updateUserSchema, consentSchema, AppError } from "@aura/shared";
import { UserService } from "../services/user.service.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function userRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const userService = new UserService(server.prisma, audit);

  // All user routes require auth
  server.addHook("onRequest", authMiddleware);

  // GET /users/me
  server.get("/users/me", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await userService.getMe(request.user!.sub);
    return reply.send({ success: true, data: user });
  });

  // PATCH /users/me
  server.patch("/users/me", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation("Invalid input", parsed.error.flatten());
    }

    const user = await userService.updateMe(request.user!.sub, parsed.data, request.ip);
    return reply.send({ success: true, data: user });
  });

  // DELETE /users/me
  server.delete("/users/me", async (request: FastifyRequest, reply: FastifyReply) => {
    await userService.deleteMe(request.user!.sub, request.ip);
    return reply.send({ success: true, data: { message: "Account deleted" } });
  });

  // POST /users/me/onboarding/complete
  server.post("/users/me/onboarding/complete", async (request: FastifyRequest, reply: FastifyReply) => {
    await userService.completeOnboarding(request.user!.sub, request.ip);
    return reply.send({ success: true, data: { message: "Onboarding complete" } });
  });

  // POST /users/me/consent
  server.post("/users/me/consent", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = consentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation("Invalid consent input", parsed.error.flatten());
    }

    await userService.addConsent(
      request.user!.sub,
      parsed.data,
      request.ip,
      request.headers["user-agent"]
    );

    return reply.send({ success: true, data: { message: "Consent recorded" } });
  });

  // GET /users/me/consent
  server.get("/users/me/consent", async (request: FastifyRequest, reply: FastifyReply) => {
    const consents = await userService.getConsents(request.user!.sub);
    return reply.send({ success: true, data: consents });
  });
}
