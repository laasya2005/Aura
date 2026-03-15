import type { PrismaClient } from "@aura/db";

export interface TranscriptEntry {
  role: "USER" | "ASSISTANT";
  content: string;
  timestamp?: Date;
}

export async function saveTranscript(
  prisma: PrismaClient,
  userId: string,
  transcript: TranscriptEntry[]
): Promise<{ conversationId: string; messageCount: number }> {
  if (transcript.length === 0) {
    console.log(`[transcript] No transcript entries to save for ${userId}`);
    return { conversationId: "", messageCount: 0 };
  }

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      channel: "VOICE",
      endedAt: new Date(),
    },
  });

  const messages = transcript.map((entry) => ({
    conversationId: conversation.id,
    role: entry.role,
    content: entry.content,
    channel: "VOICE" as const,
    metadata: JSON.parse(JSON.stringify({ source: "livekit" })),
    createdAt: entry.timestamp ?? new Date(),
  }));

  await prisma.message.createMany({ data: messages });

  console.log(
    `[transcript] Saved ${messages.length} messages for user ${userId} (conversation: ${conversation.id})`
  );

  return { conversationId: conversation.id, messageCount: messages.length };
}
