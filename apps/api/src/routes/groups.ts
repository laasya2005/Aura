import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "@aura/shared";
import { GroupService } from "../services/group.service.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function groupRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const groupService = new GroupService(server.prisma, audit);

  server.addHook("onRequest", authMiddleware);

  // GET /groups
  server.get("/groups", async (request: FastifyRequest, reply: FastifyReply) => {
    const groups = await groupService.listUserGroups(request.user!.sub);
    return reply.send({ success: true, data: groups });
  });

  // POST /groups
  server.post("/groups", async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, description } = request.body as { name?: string; description?: string };
    if (!name?.trim()) throw AppError.validation("Group name is required");

    const group = await groupService.createGroup(
      request.user!.sub,
      request.user!.plan,
      name.trim(),
      description
    );
    return reply.status(201).send({ success: true, data: group });
  });

  // POST /groups/join
  server.post("/groups/join", async (request: FastifyRequest, reply: FastifyReply) => {
    const { inviteCode } = request.body as { inviteCode?: string };
    if (!inviteCode?.trim()) throw AppError.validation("Invite code is required");

    const result = await groupService.joinGroup(request.user!.sub, inviteCode.trim());
    return reply.send({ success: true, data: result });
  });

  // GET /groups/:id
  server.get("/groups/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const group = await groupService.getGroup(request.user!.sub, id);
    return reply.send({ success: true, data: group });
  });

  // GET /groups/:id/leaderboard
  server.get("/groups/:id/leaderboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const leaderboard = await groupService.getLeaderboard(request.user!.sub, id);
    return reply.send({ success: true, data: leaderboard });
  });

  // POST /groups/:id/leave
  server.post("/groups/:id/leave", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await groupService.leaveGroup(request.user!.sub, id);
    return reply.send({ success: true, data: { message: "Left group" } });
  });
}
