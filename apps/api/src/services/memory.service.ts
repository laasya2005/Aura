import type { PrismaClient } from "@aura/db";
import { generateEmbedding, cosineSimilarity, summarizeConversation } from "@aura/ai";
import type { AuditLogger } from "@aura/shared";

export class MemoryService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditLogger
  ) {}

  async storeMemory(
    userId: string,
    type: "DAILY_SUMMARY" | "WEEKLY_SUMMARY" | "KEY_FACT" | "PREFERENCE" | "MILESTONE",
    content: string
  ): Promise<{ id: string }> {
    const embedding = await generateEmbedding(content);

    const memory = await this.prisma.memorySummary.create({
      data: {
        userId,
        type,
        content,
        embedding,
      },
    });

    return { id: memory.id };
  }

  async searchMemories(
    userId: string,
    query: string,
    limit = 5,
    minSimilarity = 0.3
  ): Promise<
    Array<{ id: string; type: string; content: string; similarity: number; createdAt: Date }>
  > {
    const queryEmbedding = await generateEmbedding(query);

    // Fetch all memories for user (in production, use pgvector for efficient search)
    const memories = await this.prisma.memorySummary.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Compute similarity and rank
    const scored = memories
      .map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        createdAt: m.createdAt,
        similarity: cosineSimilarity(queryEmbedding, m.embedding),
      }))
      .filter((m) => m.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored;
  }

  async getRecentMemories(
    userId: string,
    limit = 5
  ): Promise<Array<{ type: string; content: string; createdAt: Date }>> {
    return this.prisma.memorySummary.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { type: true, content: true, createdAt: true },
    });
  }

  async summarizeDailyConversations(userId: string): Promise<string | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const conversations = await this.prisma.conversation.findMany({
      where: {
        userId,
        startedAt: { gte: today },
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
        },
      },
    });

    const allMessages = conversations.flatMap((c) => c.messages);
    if (allMessages.length < 3) return null;

    const summary = await summarizeConversation(allMessages);
    if (!summary) return null;

    await this.storeMemory(userId, "DAILY_SUMMARY", summary);

    await this.audit({
      userId,
      action: "memory.daily_summary.created",
      resource: "memory",
    });

    return summary;
  }

  async summarizeWeeklyConversations(userId: string): Promise<string | null> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get daily summaries from the past week
    const dailySummaries = await this.prisma.memorySummary.findMany({
      where: {
        userId,
        type: "DAILY_SUMMARY",
        createdAt: { gte: weekAgo },
      },
      orderBy: { createdAt: "asc" },
    });

    if (dailySummaries.length < 2) return null;

    const summary = await summarizeConversation(
      dailySummaries.map((s) => ({
        role: "SYSTEM",
        content: `[${s.createdAt.toDateString()}] ${s.content}`,
      }))
    );

    if (!summary) return null;

    await this.storeMemory(userId, "WEEKLY_SUMMARY", summary);

    await this.audit({
      userId,
      action: "memory.weekly_summary.created",
      resource: "memory",
    });

    return summary;
  }
}
