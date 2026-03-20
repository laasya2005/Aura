import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createGoalSchema, updateGoalSchema, AppError } from "@aura/shared";
import { chat, buildStreakCompliment, type AuraContext, type UserContext } from "@aura/ai";
import { GoalService } from "../services/goal.service.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function goalRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const goalService = new GoalService(server.prisma, audit);

  server.addHook("onRequest", authMiddleware);

  // GET /goals
  server.get("/goals", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { status?: string };
    const goals = await goalService.list(request.user!.sub, query.status);
    return reply.send({ success: true, data: goals });
  });

  // POST /goals
  server.post("/goals", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createGoalSchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation("Invalid goal data", parsed.error.flatten());
    }

    const goal = await goalService.create(
      request.user!.sub,
      request.user!.plan,
      parsed.data,
      request.ip
    );
    return reply.status(201).send({ success: true, data: goal });
  });

  // GET /goals/:id
  server.get("/goals/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const goal = await goalService.getById(request.user!.sub, id);
    return reply.send({ success: true, data: goal });
  });

  // PATCH /goals/:id
  server.patch("/goals/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = updateGoalSchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation("Invalid goal data", parsed.error.flatten());
    }

    const goal = await goalService.update(request.user!.sub, id, parsed.data, request.ip);
    return reply.send({ success: true, data: goal });
  });

  // DELETE /goals/:id
  server.delete("/goals/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await goalService.delete(request.user!.sub, id, request.ip);
    return reply.send({ success: true, data: { message: "Goal deleted" } });
  });

  // POST /goals/:id/streak
  server.post("/goals/:id/streak", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.sub;
    const result = await goalService.recordStreak(userId, id, request.ip);

    // Generate AI compliment (non-blocking on failure)
    let compliment: string | null = null;
    try {
      const user = await server.prisma.user.findUnique({
        where: { id: userId },
        include: { auraProfile: true, goals: { where: { status: "ACTIVE" }, take: 10 } },
      });

      if (user) {
        const auraContext: AuraContext = {
          mode: (user.auraProfile?.mode ?? "GLOW") as AuraContext["mode"],
          sliders: user.auraProfile
            ? {
                warmth: user.auraProfile.warmth,
                humor: user.auraProfile.humor,
                directness: user.auraProfile.directness,
                energy: user.auraProfile.energy,
              }
            : undefined,
          customPrompt: user.auraProfile?.customPrompt,
        };

        const userContext: UserContext = {
          userId,
          firstName: user.firstName,
          timezone: user.timezone,
          plan: user.plan,
          goals: user.goals.map((g) => ({
            title: g.title,
            category: g.category,
            currentStreak: g.currentStreak,
            status: g.status,
          })),
        };

        const prompt = buildStreakCompliment(
          auraContext,
          userContext,
          result.goal.title,
          result.goal.currentStreak,
          result.milestone
        );

        const aiResponse = await chat(prompt.messages, {
          systemPrompt: prompt.systemPrompt,
          maxTokens: 256,
          temperature: 0.8,
        });

        compliment = aiResponse.content;
      }
    } catch {
      // AI failure is non-fatal — still return the streak data
    }

    return reply.send({
      success: true,
      data: {
        goal: result.goal,
        milestone: result.milestone,
        compliment,
      },
    });
  });
}
