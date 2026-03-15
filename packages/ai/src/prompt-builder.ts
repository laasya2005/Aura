import type { ChatMessage } from "./claude.js";
import { buildPersonalityPrompt, type PersonalitySliders } from "./personality.js";
import type { AuraMode } from "@aura/shared";

export interface UserContext {
  firstName?: string | null;
  timezone: string;
  plan: string;
  goals?: Array<{
    title: string;
    category: string;
    currentStreak: number;
    status: string;
  }>;
  memories?: Array<{
    type: string;
    content: string;
  }>;
}

export interface AuraContext {
  mode: AuraMode;
  sliders?: Partial<PersonalitySliders>;
  customPrompt?: string | null;
}

export interface PromptParts {
  systemPrompt: string;
  messages: ChatMessage[];
}

const SYSTEM_PREAMBLE = `You are Aura, the user's close friend and accountability buddy. You text them like a real friend would — casual, warm, and natural.

VOICE & TONE:
- Talk like a Gen Z best friend texting. Use lowercase, short sentences, casual language.
- Use slang naturally (e.g., "lowkey", "ngl", "ur crushing it", "let's gooo", "no cap").
- Drop emojis sparingly and naturally — don't overdo it. One or two per message max.
- Be genuine and real. No corporate motivational speaker vibes. No "I hope this message finds you well."
- Sound like you actually care, not like a bot reading a script.
- Match the energy — hype them up when they're winning, be chill and supportive when they're struggling.
- Keep it SHORT. 1-2 sentences for check-ins. Nobody wants a paragraph from a friend.
- Use their name sometimes but not every single message — that feels weird.
- It's okay to be playful, tease gently, or use humor.

EXAMPLES OF GOOD MESSAGES:
- "yooo did you get that run in today? 🏃"
- "just checking in — how's the water intake going lol"
- "3 day streak omg ur actually locked in rn"
- "hey no pressure but remember that meditation thing? even 5 min counts"
- "ngl im proud of you for showing up consistently"

EXAMPLES OF BAD MESSAGES (never do this):
- "Hello! I hope you're having a wonderful day. I wanted to remind you about your hydration goal."
- "Great job on maintaining your streak! Keep up the excellent work!"
- "It's time for your scheduled check-in. How are you progressing toward your goals?"

RULES:
- Never provide medical, legal, or financial advice. Suggest professional resources instead.
- If asked, acknowledge you are an AI companion — but don't bring it up randomly.
- Remember and reference past conversations when available.`;

export function buildSystemPrompt(aura: AuraContext, user: UserContext): string {
  const parts: string[] = [SYSTEM_PREAMBLE];

  // Personality layer
  const personality = buildPersonalityPrompt(aura.mode, aura.sliders, aura.customPrompt);
  parts.push(`\nPERSONALITY:\n${personality}`);

  // User context layer
  const userParts: string[] = [];
  if (user.firstName) {
    userParts.push(`The user's name is ${user.firstName}.`);
  }
  userParts.push(`Their timezone is ${user.timezone}.`);
  userParts.push(`Their plan tier is ${user.plan}.`);

  if (user.goals && user.goals.length > 0) {
    const goalSummaries = user.goals
      .filter((g) => g.status === "ACTIVE")
      .map((g) => `- ${g.title} (${g.category}, ${g.currentStreak}-day streak)`)
      .join("\n");
    if (goalSummaries) {
      userParts.push(`\nActive goals:\n${goalSummaries}`);
    }
  }

  parts.push(`\nUSER CONTEXT:\n${userParts.join(" ")}`);

  // Memory context layer
  if (user.memories && user.memories.length > 0) {
    const memorySummary = user.memories.map((m) => `[${m.type}] ${m.content}`).join("\n");
    parts.push(`\nMEMORY CONTEXT (from previous conversations):\n${memorySummary}`);
  }

  // Time context layer
  const now = new Date();
  const hour = parseInt(
    now.toLocaleString("en-US", {
      timeZone: user.timezone,
      hour: "numeric",
      hour12: false,
    })
  );

  let timeOfDay: string;
  if (hour >= 5 && hour < 12) timeOfDay = "morning";
  else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
  else if (hour >= 17 && hour < 21) timeOfDay = "evening";
  else timeOfDay = "night";

  parts.push(`\nTIME CONTEXT:\nIt is currently ${timeOfDay} for the user (${user.timezone}).`);

  return parts.join("\n");
}

export function buildConversationMessages(
  history: Array<{ role: "USER" | "ASSISTANT" | "SYSTEM"; content: string }>,
  newMessage: string,
  maxHistory = 20
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // Include recent history (most recent N messages)
  const recentHistory = history.slice(-maxHistory);
  for (const msg of recentHistory) {
    if (msg.role === "USER") {
      messages.push({ role: "user", content: msg.content });
    } else if (msg.role === "ASSISTANT") {
      messages.push({ role: "assistant", content: msg.content });
    }
    // SYSTEM messages are folded into the system prompt, not the conversation
  }

  // Add the new user message
  messages.push({ role: "user", content: newMessage });

  return messages;
}

export function buildStreakCompliment(
  aura: AuraContext,
  user: UserContext,
  goalTitle: string,
  streak: number,
  milestone: number | null
): PromptParts {
  const systemPrompt = buildSystemPrompt(aura, user);
  const name = user.firstName ?? "the user";

  let prompt: string;
  if (milestone) {
    prompt = `${name} just hit a ${milestone}-day streak on their goal "${goalTitle}"! This is a major milestone. Give them a personalized, heartfelt compliment celebrating this achievement. Mention the specific streak number and goal. Be genuinely excited and proud. 2-3 sentences max.`;
  } else if (streak === 1) {
    prompt = `${name} just started a new streak on their goal "${goalTitle}"! Day 1. Give them an encouraging, motivating compliment about taking the first step. 1-2 sentences max.`;
  } else {
    prompt = `${name} just checked in on their goal "${goalTitle}" and is now on a ${streak}-day streak! Give them a short, personalized compliment acknowledging their consistency. Keep it fresh and specific to the goal. 1-2 sentences max.`;
  }

  return {
    systemPrompt,
    messages: [{ role: "user", content: prompt }],
  };
}

export function buildProactivePrompt(
  type: "morning" | "check_in" | "evening",
  aura: AuraContext,
  user: UserContext,
  scheduleLabel?: string
): PromptParts {
  const systemPrompt = buildSystemPrompt(aura, user);
  const name = user.firstName ?? "the user";

  // If we have a schedule label, make the message about that specific topic
  if (scheduleLabel) {
    const prompt = `Text ${name} a quick casual reminder about "${scheduleLabel}". Like a friend nudging them. 1-2 sentences max, keep it real.`;
    return {
      systemPrompt,
      messages: [{ role: "user", content: prompt }],
    };
  }

  const promptsByType = {
    morning: `Send ${name} a quick good morning text like a friend would. If they have goals, casually mention one. 1-2 sentences, keep it chill.`,
    check_in: `Send ${name} a casual mid-day check-in. Ask how their day's going or nudge them about a goal. 1 sentence, like a quick text from a friend.`,
    evening: `Send ${name} a chill evening text. Maybe ask how their day went or hype them up for what they accomplished. 1-2 sentences, keep it warm.`,
  };

  return {
    systemPrompt,
    messages: [{ role: "user", content: promptsByType[type] }],
  };
}
