import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { AuditActions } from "@aura/shared";
import { getQueue, QUEUE_NAMES } from "@aura/queue";

export default async function adminRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);

  server.addHook("onRequest", authMiddleware);
  server.addHook("onRequest", adminMiddleware);

  // GET /admin/stats — Overview statistics
  server.get("/admin/stats", async (request: FastifyRequest, reply: FastifyReply) => {
    const [
      totalUsers,
      activeUsers,
      totalGoals,
      totalConversations,
      totalMessages,
      planDistribution,
    ] = await Promise.all([
      server.prisma.user.count(),
      server.prisma.user.count({ where: { status: "ACTIVE" } }),
      server.prisma.goal.count(),
      server.prisma.conversation.count(),
      server.prisma.message.count(),
      server.prisma.user.groupBy({
        by: ["plan"],
        _count: true,
      }),
    ]);

    // Recent signups (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentSignups = await server.prisma.user.count({
      where: { createdAt: { gte: weekAgo } },
    });

    return reply.send({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        recentSignups,
        totalGoals,
        totalConversations,
        totalMessages,
        planDistribution: planDistribution.map((p) => ({
          plan: p.plan,
          count: p._count,
        })),
      },
    });
  });

  // GET /admin/users — User management
  server.get("/admin/users", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      plan?: string;
      search?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "50", 10) || 50));

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.plan) where.plan = query.plan;
    if (query.search) {
      where.OR = [
        { phone: { contains: query.search } },
        { firstName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      server.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          plan: true,
          createdAt: true,
          lastActiveAt: true,
          _count: { select: { goals: true, conversations: true } },
        },
      }),
      server.prisma.user.count({ where }),
    ]);

    await audit({
      userId: request.user!.sub,
      action: AuditActions.ADMIN_USER_VIEWED,
      resource: "admin",
      metadata: { action: "list_users", count: users.length },
    });

    return reply.send({
      success: true,
      data: users,
      meta: { page, limit, total },
    });
  });

  // GET /admin/users/:id — User detail
  server.get("/admin/users/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const user = await server.prisma.user.findUnique({
      where: { id },
      include: {
        auraProfile: true,
        goals: { orderBy: { createdAt: "desc" }, take: 10 },
        subscription: true,
        _count: { select: { goals: true, conversations: true, schedules: true } },
      },
    });

    if (!user) {
      return reply
        .status(404)
        .send({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
    }

    await audit({
      userId: request.user!.sub,
      action: AuditActions.ADMIN_USER_VIEWED,
      resource: "user",
      resourceId: id,
    });

    return reply.send({ success: true, data: user });
  });

  // GET /admin/conversations/flagged — Flagged conversations (crisis/safety)
  server.get(
    "/admin/conversations/flagged",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { page?: string; limit?: string };
      const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "20", 10) || 20));

      // Find messages with crisis or safety metadata
      const flaggedMessages = await server.prisma.message.findMany({
        where: {
          metadata: {
            path: ["crisis"],
            equals: true,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          conversation: {
            select: { userId: true, channel: true },
          },
        },
      });

      await audit({
        userId: request.user!.sub,
        action: AuditActions.ADMIN_CONVERSATION_REVIEWED,
        resource: "admin",
        metadata: { action: "view_flagged" },
      });

      return reply.send({
        success: true,
        data: flaggedMessages,
        meta: { page, limit },
      });
    }
  );

  // GET /admin/queues — Queue health monitoring
  server.get("/admin/queues", async (request: FastifyRequest, reply: FastifyReply) => {
    const queueNames = Object.values(QUEUE_NAMES);
    const queueStats = await Promise.all(
      queueNames.map(async (name) => {
        try {
          const queue = getQueue(name);
          const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
          ]);
          return { name, waiting, active, completed, failed, delayed, status: "healthy" };
        } catch {
          return {
            name,
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            status: "error",
          };
        }
      })
    );

    return reply.send({ success: true, data: queueStats });
  });

  // GET /admin/audit — Audit log viewer
  server.get("/admin/audit", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      action?: string;
      userId?: string;
    };
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "50", 10) || 50));

    const where: Record<string, unknown> = {};
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    const [logs, total] = await Promise.all([
      server.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      server.prisma.auditLog.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: logs,
      meta: { page, limit, total },
    });
  });
}
