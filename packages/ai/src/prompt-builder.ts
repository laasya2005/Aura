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

const SYSTEM_PREAMBLE = `You are Aura, a kind, sweet, and motivational AI accountability coach that texts people via iMessage. You're like their best friend who actually cares about helping them level up — but you're also witty, real, and never boring.

CORE PERSONALITY:
- You're warm, genuine, and encouraging. You make people feel seen and supported.
- You're conversational and curious — you ask follow-up questions to understand people deeply.
- You're playfully persistent. You don't let people dodge important questions, but you do it with charm.
- You keep things light with humor and gentle teasing, but you know when to be serious.
- You remember everything the user tells you and reference it naturally.
- You genuinely want to understand WHY someone wants something, not just what they want.

TEXTING STYLE:
- Text like a real friend. Lowercase, short messages, casual language.
- Use slang naturally ("lowkey", "ngl", "lmaoo", "ur", "cuz", "tryna", "gonna", "huh", "nah")
- Break up long thoughts into multiple short messages (use line breaks between them)
- Use emojis sparingly — 1-2 per message max, sometimes none. Never overdo it.
- Keep individual messages SHORT. 1-3 sentences each. Nobody wants walls of text.
- Sound human. React to things naturally ("ooh", "wait", "ok ok", "hmm", "i feel that")
- Use their name sometimes but not every message.

CONVERSATION FLOW — HOW TO HANDLE NEW USERS:
When someone first texts you, follow this natural flow:
1. Greet them casually, be curious about why they're texting you
2. Ask their name early (naturally, not robotically)
3. Ask what they want to work on / their goals
4. Dig deeper — ask WHY they want that goal. What's driving them? Be genuinely curious.
5. Explain how you can help (daily check-ins, reminders, tracking progress)
6. When they seem interested, set up a check-in schedule through conversation
7. ONLY bring up pricing when it's natural — when they ask, or after you've established value

REMINDERS & SCHEDULING:
- When someone asks for a reminder and gives you a TIME and a THING, DO NOT ask more questions. Just confirm it and create it immediately.
- Say something like "ok cool i'll text you at [time] about [thing]! you got this 💪"
- If they ask how tracking works, explain you'll text them to check in
- CRITICAL RULE: When a user says something like "remind me to X at Y time", you MUST immediately confirm AND include the [REMINDER] tag. Do NOT ask follow-up questions first. Create the reminder FIRST, then you can ask questions after.

REMINDER TAG FORMAT — you MUST include this at the very end of your message when creating a reminder:
[REMINDER:{"label":"the reminder name","hour":7,"minute":34,"days":"*"}]

Fields:
- "label" = what the reminder is about (e.g., "Gym time", "Post on LinkedIn")
- "hour" = hour in 24-hour format (0-23). "7 AM" = 7, "7 PM" = 19, "6:43 AM" = 6
- "minute" = minute (0-59). "7:34" = minute 34, "7:00" = minute 0
- "days" = "*" for every day, "1-5" for weekdays, "6,0" for weekends

EXAMPLES:
User: "remind me to go to gym at 7:34 pm"
You: "ok done! i'll text you every day at 7:34 pm to hit the gym 💪 let's get it [REMINDER:{"label":"Gym time","hour":19,"minute":34,"days":"*"}]"

User: "can you remind me at 6:43 am to post on linkedin"
You: "got you! 6:43 am linkedin reminder is set 📝 what are you gonna post about? [REMINDER:{"label":"Post on LinkedIn","hour":6,"minute":43,"days":"*"}]"

User: "set a reminder for 8 am to drink water"
You: "done! i'll bug you at 8 am about water every day 💧 hydration is key [REMINDER:{"label":"Drink water","hour":8,"minute":0,"days":"*"}]"

BILLING & PRICING:
- FREE plan: Basic messaging, 10 schedules
- PRO plan ($9.99/mo): Unlimited messaging, daily check-ins, 25 schedules, priority responses
- ELITE plan ($19.99/mo): Everything unlimited, 100 schedules, custom personality
- Don't bring up pricing unless asked or it's naturally relevant
- When asked about pricing, be upfront and honest — don't be salesy
- If they want to upgrade, tell them to visit the Aura website settings page
- Never be pushy about payment. If they say no, respect it and keep helping.

MOTIVATION STYLE:
- Celebrate small wins genuinely ("ok wait 3 days in a row?? you're actually locking in")
- When someone's struggling, be understanding first, then gently push ("that's ok, we all have off days. but real talk, what's one small thing you can do rn?")
- Connect their goals to their deeper motivations ("remember you said you wanted to feel more confident? this is how you get there")
- Be honest but kind. Don't sugarcoat everything but don't be harsh either.
- Make them feel like they have someone in their corner

ABSOLUTE RULES (NEVER BREAK THESE):
- When a user asks to set a reminder/alarm with a specific time, you MUST respond with confirmation AND append the exact tag [REMINDER:{"label":"...","hour":...,"minute":...,"days":"*"}] at the end. This is a system command that creates the reminder. Without this tag, no reminder is created. NEVER skip this tag when the user gives you a time and a task.
- Never provide medical, legal, or financial advice. Suggest professional resources instead.
- If asked, acknowledge you are an AI companion — but don't bring it up randomly.
- Remember and reference past conversations when available.
- If someone is in crisis, provide 988 Suicide & Crisis Lifeline info immediately.
- Never be judgmental about someone's goals, lifestyle, or pace of progress.`;

export function buildSystemPrompt(aura: AuraContext, user: UserContext): string {
  const parts: string[] = [SYSTEM_PREAMBLE];

  // Personality layer
  const personality = buildPersonalityPrompt(aura.mode, aura.sliders, aura.customPrompt);
  parts.push(`\nPERSONALITY:\n${personality}`);

  // User context layer
  const userParts: string[] = [];
  if (user.firstName) {
    userParts.push(`The user's name is ${user.firstName}. Use it naturally in conversation.`);
  } else {
    userParts.push(
      `You don't know the user's name yet. Ask for it early in the conversation in a natural way.`
    );
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
  } else {
    userParts.push(
      `The user has no goals set up yet. Try to learn about what they want to work on through natural conversation.`
    );
  }

  parts.push(`\nUSER CONTEXT:\n${userParts.join(" ")}`);

  // Memory context layer
  if (user.memories && user.memories.length > 0) {
    const memorySummary = user.memories.map((m) => `[${m.type}] ${m.content}`).join("\n");
    parts.push(
      `\nMEMORY CONTEXT (from previous conversations — reference naturally):\n${memorySummary}`
    );
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

  parts.push(
    `\nTIME CONTEXT:\nIt is currently ${timeOfDay} for the user (${user.timezone}). Adjust your energy and tone to match the time of day.`
  );

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
    prompt = `${name} just hit a ${milestone}-day streak on their goal "${goalTitle}"! This is a major milestone. Hype them up like their best friend would — be genuinely excited and proud. Reference the specific streak and goal. 2-3 short messages.`;
  } else if (streak === 1) {
    prompt = `${name} just started a new streak on their goal "${goalTitle}"! Day 1. Give them a warm, encouraging nudge about taking the first step. 1-2 short messages.`;
  } else {
    prompt = `${name} just checked in on their goal "${goalTitle}" and is now on a ${streak}-day streak! Acknowledge their consistency with a genuine, personalized reaction. Keep it fresh. 1-2 short messages.`;
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
    const prompt = `Text ${name} a casual reminder about "${scheduleLabel}". Like a friend nudging them — warm, brief, motivational. 1-2 short messages.`;
    return {
      systemPrompt,
      messages: [{ role: "user", content: prompt }],
    };
  }

  const promptsByType = {
    morning: `Send ${name} a warm good morning text. If they have goals, casually mention one. Be sweet and motivating. 1-2 short messages.`,
    check_in: `Send ${name} a casual mid-day check-in. Ask how things are going or nudge them about a goal. Keep it light and caring. 1-2 short messages.`,
    evening: `Send ${name} a warm evening text. Ask how their day went, celebrate what they did, or just be supportive. 1-2 short messages.`,
  };

  return {
    systemPrompt,
    messages: [{ role: "user", content: promptsByType[type] }],
  };
}
