import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { sendMessageSchema, AppError } from "@aura/shared";
import { ConversationService } from "../services/conversation.service.js";
import { SentimentTracker } from "../services/sentiment.service.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function conversationRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const conversationService = new ConversationService(server.prisma, server.redis, audit);
  const sentimentTracker = new SentimentTracker(server.prisma);

  server.addHook("onRequest", authMiddleware);

  // POST /conversations/message
  server.post("/conversations/message", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = sendMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation("Invalid message data", parsed.error.flatten());
    }

    const result = await conversationService.sendMessage(
      request.user!.sub,
      request.user!.plan,
      parsed.data.content,
      "WEB",
      request.ip
    );

    // Track sentiment in background (non-blocking)
    sentimentTracker
      .trackMessageSentiment(request.user!.sub, result.conversationId, parsed.data.content)
      .catch(() => {});

    return reply.send({ success: true, data: result });
  });

  // GET /conversations
  server.get("/conversations", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "20", 10) || 20));

    const result = await conversationService.listConversations(request.user!.sub, page, limit);
    return reply.send({
      success: true,
      data: result.conversations,
      meta: { page, limit, total: result.total },
    });
  });

  // GET /conversations/:id
  server.get("/conversations/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const conversation = await conversationService.getConversation(request.user!.sub, id);
    return reply.send({ success: true, data: conversation });
  });

  // GET /conversations/:id/messages
  server.get(
    "/conversations/:id/messages",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const query = request.query as { page?: string; limit?: string };
      const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "50", 10) || 50));

      const result = await conversationService.getMessages(request.user!.sub, id, page, limit);
      return reply.send({
        success: true,
        data: result.messages,
        meta: { page, limit, total: result.total },
      });
    }
  );
}
