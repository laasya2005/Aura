import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createScheduleSchema, updateScheduleSchema, AppError } from "@aura/shared";
import { ScheduleService } from "../services/schedule.service.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function scheduleRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const scheduleService = new ScheduleService(server.prisma, audit);

  server.addHook("onRequest", authMiddleware);

  // GET /schedules
  server.get("/schedules", async (request: FastifyRequest, reply: FastifyReply) => {
    const schedules = await scheduleService.list(request.user!.sub);
    return reply.send({ success: true, data: schedules });
  });

  // POST /schedules
  server.post("/schedules", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createScheduleSchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation("Invalid schedule data", parsed.error.flatten());
    }

    const schedule = await scheduleService.create(
      request.user!.sub,
      request.user!.plan,
      parsed.data,
      request.ip
    );
    return reply.status(201).send({ success: true, data: schedule });
  });

  // GET /schedules/:id
  server.get("/schedules/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const schedule = await scheduleService.getById(request.user!.sub, id);
    return reply.send({ success: true, data: schedule });
  });

  // PATCH /schedules/:id
  server.patch("/schedules/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = updateScheduleSchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation("Invalid schedule data", parsed.error.flatten());
    }

    const schedule = await scheduleService.update(request.user!.sub, id, parsed.data, request.ip);
    return reply.send({ success: true, data: schedule });
  });

  // DELETE /schedules/:id
  server.delete("/schedules/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await scheduleService.delete(request.user!.sub, id, request.ip);
    return reply.send({ success: true, data: { message: "Schedule deleted" } });
  });
}
