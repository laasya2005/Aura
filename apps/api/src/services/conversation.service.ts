import type { PrismaClient, Prisma } from "@aura/db";
import type { Redis } from "ioredis";
import {
  chat,
  buildSystemPrompt,
  buildConversationMessages,
  buildProactivePrompt,
  checkSafety,
  detectCrisis,
  SAFETY_DISCLAIMER,
  type AuraContext,
  type UserContext,
  type ChatMessage,
} from "@aura/ai";
import { AppError, ErrorCode, type AuditLogger, AuditActions, type Channel } from "@aura/shared";

const MESSAGE_RATE_LIMIT_KEY = "msg:rl:";
const MESSAGE_RATE_LIMIT_WINDOW = 60; // 1 minute
const MESSAGE_RATE_LIMITS: Record<string, number> = {
  FREE: 10,
  PRO: 30,
  ELITE: 60,
};

export class ConversationService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
    private audit: AuditLogger
  ) {}

  async sendMessage(
    userId: string,
    plan: string,
    content: string,
    channel: Channel = "WEB",
    ip?: string
  ): Promise<{
    message: { id: string; role: string; content: string; createdAt: Date };
    response: { id: string; role: string; content: string; createdAt: Date };
    conversationId: string;
  }> {
    // Rate limit messages per minute
    await this.checkRateLimit(userId, plan);

    // Safety check on user input (prompt injection defense)
    const inputSafety = checkSafety(content);
    if (!inputSafety.safe) {
      content = inputSafety.filtered ?? content;
    }

    // Crisis detection — overrides AI response
    const crisis = detectCrisis(content);
    if (crisis.detected && crisis.severity === "high") {
      const conversation = await this.getOrCreateConversation(userId, channel);
      const userMsg = await this.storeMessage(conversation.id, "USER", content, channel);

      const responseMsg = await this.storeMessage(
        conversation.id,
        "ASSISTANT",
        crisis.responseOverride!,
        channel,
        { crisis: true, severity: crisis.severity }
      );

      await this.audit({
        userId,
        action: "conversation.crisis.detected",
        resource: "conversation",
        resourceId: conversation.id,
        metadata: { severity: crisis.severity },
        ipAddress: ip,
      });

      return {
        message: userMsg,
        response: responseMsg,
        conversationId: conversation.id,
      };
    }

    // Get or create active conversation
    const conversation = await this.getOrCreateConversation(userId, channel);

    // Store user message
    const userMsg = await this.storeMessage(conversation.id, "USER", content, channel);

    // Load context for AI
    const { auraContext, userContext } = await this.loadContext(userId);

    // Get the most recent 20 messages (excluding the one we just stored),
    // then reverse to chronological order for the AI prompt
    const historyDesc = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        id: { not: userMsg.id },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { role: true, content: true },
    });
    const history = historyDesc.reverse();

    // Build prompt
    const systemPrompt = buildSystemPrompt(auraContext, userContext);
    const messages = buildConversationMessages(
      history.map((m) => ({ role: m.role as "USER" | "ASSISTANT" | "SYSTEM", content: m.content })),
      content
    );

    // Call Claude
    let aiResponse;
    try {
      aiResponse = await chat(messages, {
        systemPrompt,
        maxTokens: channel === "SMS" ? 320 : 1024,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[conversation] AI call failed:", detail);
      throw new AppError(ErrorCode.CLAUDE_ERROR, `Failed to generate response: ${detail}`, 502);
    }

    // Safety filter on output
    let responseContent = aiResponse.content;
    const safety = checkSafety(responseContent);
    if (!safety.safe) {
      responseContent = safety.filtered ?? SAFETY_DISCLAIMER;
    }

    // Low-severity crisis: append crisis resources to AI response
    if (crisis.detected && crisis.severity === "low") {
      responseContent = `${responseContent}\n\n${crisis.responseOverride}`;
    }

    // Store AI response
    const responseMsg = await this.storeMessage(
      conversation.id,
      "ASSISTANT",
      responseContent,
      channel,
      {
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        safetyFlags: safety.flags.length > 0 ? safety.flags : undefined,
      }
    );

    await this.audit({
      userId,
      action: AuditActions.MESSAGE_SENT,
      resource: "conversation",
      resourceId: conversation.id,
      ipAddress: ip,
    });

    return {
      message: userMsg,
      response: responseMsg,
      conversationId: conversation.id,
    };
  }

  async generateProactiveMessage(
    userId: string,
    type: "morning" | "check_in" | "evening",
    channel: Channel = "SMS",
    scheduleLabel?: string
  ): Promise<{ content: string; conversationId: string }> {
    const { auraContext, userContext } = await this.loadContext(userId);

    const { systemPrompt, messages } = buildProactivePrompt(
      type,
      auraContext,
      userContext,
      scheduleLabel
    );

    let aiResponse;
    try {
      aiResponse = await chat(messages, {
        systemPrompt,
        maxTokens: 320,
        temperature: 0.8,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[proactive] AI call failed: ${msg}`);
      throw new AppError(
        ErrorCode.CLAUDE_ERROR,
        `Failed to generate proactive message: ${msg}`,
        502
      );
    }

    let content = aiResponse.content;
    const safety = checkSafety(content);
    if (!safety.safe) {
      content =
        safety.filtered ??
        `Hey${userContext.firstName ? ` ${userContext.firstName}` : ""}! Hope you're having a great day. Remember, consistency is key to reaching your goals!`;
    }

    const conversation = await this.getOrCreateConversation(userId, channel);
    await this.storeMessage(conversation.id, "ASSISTANT", content, channel, {
      proactive: true,
      type,
    });

    return { content, conversationId: conversation.id };
  }

  async listConversations(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    conversations: Array<{
      id: string;
      channel: string;
      startedAt: Date;
      lastMessage?: { content: string; role: string; createdAt: Date };
    }>;
    total: number;
  }> {
    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true, role: true, createdAt: true },
          },
        },
      }),
      this.prisma.conversation.count({ where: { userId } }),
    ]);

    return {
      conversations: conversations.map((c) => ({
        id: c.id,
        channel: c.channel,
        startedAt: c.startedAt,
        lastMessage: c.messages[0]
          ? {
              content: c.messages[0].content.slice(0, 100),
              role: c.messages[0].role,
              createdAt: c.messages[0].createdAt,
            }
          : undefined,
      })),
      total,
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw AppError.notFound("Conversation");
    }

    return conversation;
  }

  async getMessages(
    userId: string,
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<{
    messages: Array<{
      id: string;
      role: string;
      content: string;
      channel: string;
      createdAt: Date;
    }>;
    total: number;
  }> {
    // Verify ownership
    await this.getConversation(userId, conversationId);

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          role: true,
          content: true,
          channel: true,
          createdAt: true,
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return { messages, total };
  }

  // --- Private helpers ---

  private async checkRateLimit(userId: string, plan: string): Promise<void> {
    const key = `${MESSAGE_RATE_LIMIT_KEY}${userId}`;
    const limit = MESSAGE_RATE_LIMITS[plan] ?? 10;
    const count = (await this.redis.eval(
      `local c = redis.call('incr', KEYS[1])
       if c == 1 then redis.call('expire', KEYS[1], ARGV[1]) end
       return c`,
      1,
      key,
      MESSAGE_RATE_LIMIT_WINDOW
    )) as number;
    if (count > limit) {
      throw AppError.rateLimited();
    }
  }

  private async getOrCreateConversation(userId: string, channel: Channel) {
    // Reuse an active conversation for the same channel from the last 4 hours
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const existing = await this.prisma.conversation.findFirst({
      where: {
        userId,
        channel,
        endedAt: null,
        startedAt: { gte: fourHoursAgo },
      },
      orderBy: { startedAt: "desc" },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { userId, channel },
    });
  }

  private async storeMessage(
    conversationId: string,
    role: "USER" | "ASSISTANT" | "SYSTEM",
    content: string,
    channel: Channel,
    metadata?: Record<string, unknown>
  ) {
    return this.prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        channel,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });
  }

  private async loadContext(userId: string): Promise<{
    auraContext: AuraContext;
    userContext: UserContext;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        auraProfile: true,
        goals: {
          where: { status: "ACTIVE" },
          take: 10,
          select: {
            title: true,
            category: true,
            currentStreak: true,
            status: true,
          },
        },
        memories: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { type: true, content: true },
        },
      },
    });

    if (!user) throw AppError.notFound("User");

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
      firstName: user.firstName,
      timezone: user.timezone,
      plan: user.plan,
      goals: user.goals.map((g) => ({
        title: g.title,
        category: g.category,
        currentStreak: g.currentStreak,
        status: g.status,
      })),
      memories: user.memories.map((m) => ({
        type: m.type,
        content: m.content,
      })),
    };

    return { auraContext, userContext };
  }
}
