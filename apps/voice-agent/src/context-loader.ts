import type { PrismaClient } from "@aura/db";

// Voice IDs available on ElevenLabs free tier
const MODE_VOICE_MAP: Record<string, string> = {
  GLOW: "cgSgspJ2msm6clMCkdW9",  // Jessica - Playful, Bright, Warm
  FLAME: "IKne3meq5aSn9XLyUdCD",  // Charlie - Deep, Confident, Energetic
  MIRROR: "pNInz6obpgDQGcFmaJgB",  // Adam - Dominant, Firm
  TIDE: "EXAVITQu4vr4xnSDxMaL",   // Sarah - Mature, Reassuring
  VOLT: "TX3LPaxmHKxFdv7VOQHJ",   // Liam - Energetic, Social Media Creator
};
const DEFAULT_VOICE_ID = "cgSgspJ2msm6clMCkdW9"; // Jessica

interface AuraContext {
  mode: string;
  sliders?: { warmth: number; humor: number; directness: number; energy: number };
  customPrompt?: string | null;
}

interface UserContext {
  firstName?: string | null;
  timezone: string;
  plan: string;
  goals?: Array<{ title: string; category: string; currentStreak: number; status: string }>;
  memories?: Array<{ type: string; content: string }>;
}

export async function loadVoiceContext(
  prisma: PrismaClient,
  userId: string
): Promise<{ auraContext: AuraContext; userContext: UserContext }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      auraProfile: true,
      goals: {
        where: { status: "ACTIVE" },
        take: 10,
        select: { title: true, category: true, currentStreak: true, status: true },
      },
      memories: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { type: true, content: true },
      },
    },
  });

  if (!user) throw new Error(`User not found: ${userId}`);

  const auraContext: AuraContext = {
    mode: user.auraProfile?.mode ?? "GLOW",
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
    goals: user.goals.map((g: { title: string; category: string; currentStreak: number; status: string }) => ({
      title: g.title,
      category: g.category,
      currentStreak: g.currentStreak,
      status: g.status,
    })),
    memories: user.memories.map((m: { type: string; content: string }) => ({ type: m.type, content: m.content })),
  };

  return { auraContext, userContext };
}

const VOICE_RULES = `

VOICE-SPECIFIC RULES:
- You are speaking out loud on a phone call, not texting.
- Never use emojis, markdown, bullet points, or any text formatting.
- Keep responses short — 1 to 3 sentences. This is a real-time conversation.
- Use natural spoken language. Say "about" not "approx", "two" not "2".
- Don't spell out URLs, emails, or complex technical terms.
- Use filler words sparingly to sound natural (e.g., "well", "so", "you know").
- If you don't understand something, ask them to repeat it.
- Pause naturally between thoughts. Don't rush.`;

export async function buildVoiceSystemPrompt(
  prisma: PrismaClient,
  userId: string
): Promise<string> {
  const { auraContext, userContext } = await loadVoiceContext(prisma, userId);

  // Dynamic import to avoid ESM/CJS mismatch
  const { buildSystemPrompt } = await import("@aura/ai");
  const basePrompt = buildSystemPrompt(auraContext as Parameters<typeof buildSystemPrompt>[0], userContext);
  return basePrompt + VOICE_RULES;
}

export async function getVoiceIdForUser(
  prisma: PrismaClient,
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { auraProfile: true },
  });

  const mode = user?.auraProfile?.mode ?? "GLOW";
  const customVoiceId = user?.auraProfile?.voiceId ?? null;
  if (customVoiceId) return customVoiceId;
  return MODE_VOICE_MAP[mode] ?? DEFAULT_VOICE_ID;
}
