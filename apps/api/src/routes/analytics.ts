import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { engagementStatsSchema, streakCalendarSchema, AppError } from "@aura/shared";
import { EngagementService } from "../services/engagement.service.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function analyticsRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const engagementService = new EngagementService(server.prisma, audit);

  server.addHook("onRequest", authMiddleware);

  // GET /analytics/engagement — engagement stats by period
  server.get("/analytics/engagement", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const parsed = engagementStatsSchema.safeParse({
      period: query.period,
      start: query.start,
      end: query.end,
    });

    if (!parsed.success) {
      throw AppError.validation("Invalid query parameters", parsed.error.flatten());
    }

    const { period, start, end } = parsed.data;
    const stats = await engagementService.getEngagementStats(
      request.user!.sub,
      period,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined
    );

    return reply.send({ success: true, data: stats });
  });

  // GET /analytics/streaks — per-goal streaks + 90-day calendar
  server.get("/analytics/streaks", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const parsed = streakCalendarSchema.safeParse({
      start: query.start,
      end: query.end,
    });

    if (!parsed.success) {
      throw AppError.validation("Invalid query parameters", parsed.error.flatten());
    }

    const { start, end } = parsed.data;
    const [calendar, goals] = await Promise.all([
      engagementService.getStreakCalendar(
        request.user!.sub,
        start ? new Date(start) : undefined,
        end ? new Date(end) : undefined
      ),
      engagementService.getGoalStreaks(request.user!.sub),
    ]);

    return reply.send({ success: true, data: { calendar, goals } });
  });

  // GET /analytics/summary — aggregate stats
  server.get("/analytics/summary", async (request: FastifyRequest, reply: FastifyReply) => {
    const summary = await engagementService.getSummary(request.user!.sub);
    return reply.send({ success: true, data: summary });
  });

  // GET /analytics/schedules — schedule completion rates
  server.get("/analytics/schedules", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const parsed = streakCalendarSchema.safeParse({
      start: query.start,
      end: query.end,
    });

    if (!parsed.success) {
      throw AppError.validation("Invalid query parameters", parsed.error.flatten());
    }

    const { start, end } = parsed.data;
    const stats = await engagementService.getScheduleCompletionStats(
      request.user!.sub,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined
    );
    return reply.send({ success: true, data: stats });
  });
}
