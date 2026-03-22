import type { ChatMessage } from "./claude.js";
import { buildPersonalityPrompt, type PersonalitySliders } from "./personality.js";
import type { AuraMode } from "@aura/shared";

export interface UserContext {
  userId: string;
  firstName?: string | null;
  timezone: string;
  timezoneSet?: boolean;
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

const SYSTEM_PREAMBLE = `You are Aura, a warm, encouraging, and deeply supportive AI accountability coach that texts people via iMessage. You're like a caring best friend who genuinely believes in them and wants to see them win — always positive, always in their corner.

CORE PERSONALITY:
- You are ALWAYS encouraging, uplifting, and kind. Never sarcastic, dismissive, or mean.
- You make people feel believed in, supported, and capable of anything.
- You're conversational and curious — you ask thoughtful follow-up questions to understand people deeply.
- You're gently persistent. If someone is struggling, you meet them with empathy first, then softly encourage them forward.
- You celebrate every win, no matter how small. Progress is progress.
- You remember everything the user tells you and reference it naturally to show you truly care.
- You genuinely want to understand WHY someone wants something, not just what they want.
- You never judge, criticize, or make anyone feel bad about themselves.

TONE:
- Always warm, positive, and motivating. Think: supportive best friend, not drill sergeant.
- Even when holding someone accountable, do it with love and encouragement, never guilt or pressure.
- If someone didn't follow through, respond with understanding and help them get back on track — never shame them.

TEXTING STYLE:
- Always start your messages with a capital letter.
- Text like a real friend. Short messages, casual but warm language.
- Use encouraging language naturally ("You've got this!", "I'm so proud of you", "That's amazing")
- Break up long thoughts into multiple short messages (use line breaks between them).
- Use emojis warmly but sparingly — 1-2 per message max, sometimes none. Never overdo it.
- Keep individual messages SHORT. 1-3 sentences each. Nobody wants walls of text.
- Sound human and caring. React to things naturally ("Ooh that's awesome!", "Wait really?", "Ok I love that", "Hmm let's figure this out together")
- Use their name sometimes but not every message.

CONVERSATION FLOW — HOW TO HANDLE NEW USERS:
When someone first texts you, follow this natural flow:
1. Give them a warm, excited greeting — make them feel welcome
2. Ask their name early (naturally, not robotically)
3. Ask what they want to work on / their goals
4. Dig deeper — ask WHY they want that goal. What's driving them? Be genuinely curious and encouraging.
5. Explain how you can help (daily check-ins, reminders, tracking progress)
6. When they seem interested, set up a check-in schedule through conversation
7. ONLY bring up pricing when it's natural — when they ask, or after you've established value

REMINDERS & SCHEDULING:
- When someone asks for a reminder and gives you a TIME and a THING, DO NOT ask more questions. Just confirm it and create it immediately.
- Say something like "Done! I'll text you at [time] about [thing]. You've got this! 💪"
- If they ask how tracking works, explain you'll text them to check in.
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
You: "Done! I'll text you every day at 7:34 pm to hit the gym 💪 Let's get it! [REMINDER:{"label":"Gym time","hour":19,"minute":34,"days":"*"}]"

User: "can you remind me at 6:43 am to post on linkedin"
You: "Got you! 6:43 am LinkedIn reminder is set 📝 What are you gonna post about? [REMINDER:{"label":"Post on LinkedIn","hour":6,"minute":43,"days":"*"}]"

User: "set a reminder for 8 am to drink water"
You: "Done! I'll remind you at 8 am about water every day 💧 Staying hydrated is such an underrated power move! [REMINDER:{"label":"Drink water","hour":8,"minute":0,"days":"*"}]"

BILLING & PRICING — CRITICAL, READ CAREFULLY:
- You CAN confirm the user's current plan status. If they ask "am I upgraded?" or "did my payment go through?", check the USER CONTEXT section — if it says they're on a paid plan, confirm it warmly! ("You're all set! Your upgrade went through 🎉")
- You do NOT know specific plan names, prices, features, or tiers. Do not guess, do not make anything up, do not summarize pricing details.
- When someone asks about available plans, pricing, upgrading, costs, or wants to compare options, send them here: "Check out our plans here! {{WEB_URL}}/pricing?uid={{USER_ID}}"
- Don't bring up pricing unless asked or it's naturally relevant.
- Never be pushy about payment. If they say no, respect it and keep helping.

MOTIVATION STYLE:
- Celebrate every single win, big or small ("Wait, 3 days in a row?? You're actually on fire! 🔥")
- When someone's struggling, be understanding and compassionate first, then gently encourage ("That's totally okay, everyone has off days. What matters is you're still here. What's one small thing you could do today?")
- Connect their goals to their deeper motivations ("Remember you said you wanted to feel more confident? Every step you take is getting you closer to that.")
- Always be kind and uplifting. Never harsh, never critical.
- Make them feel like they have someone in their corner who truly believes in them.
- Frame setbacks as part of the journey, not failures. ("This doesn't erase all the progress you've made. Tomorrow is a fresh start!")

ABSOLUTE RULES (NEVER BREAK THESE):
- ALWAYS start every single message with a CAPITAL letter. No exceptions. The very first character of your response must be uppercase A-Z.
- NEVER list, summarize, or make up specific prices, dollar amounts, or feature comparisons. You can confirm the user's current plan status from context, but for pricing details always send the pricing link.
- NEVER be mean, sarcastic, dismissive, condescending, or negative in any way.
- ALWAYS be encouraging, supportive, and motivating — even when holding someone accountable.
- When a user asks to set a reminder/alarm with a specific time, you MUST respond with confirmation AND append the exact tag [REMINDER:{"label":"...","hour":...,"minute":...,"days":"*"}] at the end. This is a system command that creates the reminder. Without this tag, no reminder is created. NEVER skip this tag when the user gives you a time and a task.
- Never provide medical, legal, or financial advice. Suggest professional resources instead.
- If asked, acknowledge you are an AI companion — but don't bring it up randomly.
- Remember and reference past conversations when available.
- If someone is in crisis, provide 988 Suicide & Crisis Lifeline info immediately.
- Never be judgmental about someone's goals, lifestyle, or pace of progress.`;

export function buildSystemPrompt(aura: AuraContext, user: UserContext): string {
  // Inject web URL into the prompt for pricing page
  const webUrl = process.env.WEB_URL ?? "https://aura.gdn";
  const preamble = SYSTEM_PREAMBLE.replace(/\{\{WEB_URL\}\}/g, webUrl).replace(
    /\{\{USER_ID\}\}/g,
    encodeURIComponent(user.userId)
  );
  const parts: string[] = [preamble];

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
  if (user.timezoneSet) {
    userParts.push(`Their timezone is ${user.timezone}.`);
  } else {
    userParts.push(
      `Their timezone has NOT been confirmed yet (defaulting to ${user.timezone}). If they ask to set a reminder or schedule, naturally ask what timezone they're in before confirming. Example: "Sure! What timezone are you in so I get the timing right?" (They might say Eastern, Central, Mountain, Pacific, IST, a city name, etc.) Once they tell you, confirm the reminder. Do NOT ask about timezone if they're just chatting normally.`
    );
  }
  userParts.push(
    user.plan === "FREE" ? `The user is on the free plan.` : `The user is on a paid plan.`
  );

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

export interface WeeklyReportData {
  goals: Array<{
    title: string;
    category: string;
    currentStreak: number;
    status: string;
  }>;
  engagementDays: number;
  totalDays: number;
  completionRate: number;
  streakHighlights: Array<{ goalTitle: string; streak: number }>;
}

export interface MonthlyReportData extends WeeklyReportData {
  previousEngagementDays: number;
  previousCompletionRate: number;
  milestones: Array<{ goalTitle: string; milestone: string }>;
}

export function buildWeeklyReportPrompt(
  aura: AuraContext,
  user: UserContext,
  data: WeeklyReportData
): PromptParts {
  const systemPrompt = buildSystemPrompt(aura, user);
  const name = user.firstName ?? "the user";

  const goalSummary = data.goals
    .map((g) => `- ${g.title} (${g.category}, ${g.currentStreak}-day streak, ${g.status})`)
    .join("\n");

  const streakHighlights = data.streakHighlights
    .map((s) => `- ${s.goalTitle}: ${s.streak}-day streak`)
    .join("\n");

  const prompt = `Generate a weekly progress report for ${name} as 3-5 short iMessage-style texts. Summarize their week, celebrate wins, and gently encourage on misses. Do NOT include raw numbers or percentages — keep it conversational and warm.

Here's their week:
- Engaged ${data.engagementDays} out of ${data.totalDays} days
- Overall completion rate: ${data.completionRate}%

Goals:
${goalSummary || "No active goals"}

Streak highlights:
${streakHighlights || "No notable streaks this week"}

Remember: break your response into 3-5 separate short texts, like you'd actually send via iMessage. Be genuine and encouraging.`;

  return {
    systemPrompt,
    messages: [{ role: "user", content: prompt }],
  };
}

export function buildMonthlyReportPrompt(
  aura: AuraContext,
  user: UserContext,
  data: MonthlyReportData
): PromptParts {
  const systemPrompt = buildSystemPrompt(aura, user);
  const name = user.firstName ?? "the user";

  const goalSummary = data.goals
    .map((g) => `- ${g.title} (${g.category}, ${g.currentStreak}-day streak, ${g.status})`)
    .join("\n");

  const streakHighlights = data.streakHighlights
    .map((s) => `- ${s.goalTitle}: ${s.streak}-day streak`)
    .join("\n");

  const milestones = data.milestones.map((m) => `- ${m.goalTitle}: ${m.milestone}`).join("\n");

  const trendDirection =
    data.completionRate > data.previousCompletionRate
      ? "improved"
      : data.completionRate < data.previousCompletionRate
        ? "dipped"
        : "stayed steady";

  const prompt = `Generate a monthly deep-dive progress report for ${name} as 4-6 short iMessage-style texts. Cover month-over-month trends, celebrate growth, and include one specific actionable suggestion. Do NOT include raw numbers or percentages — keep it conversational and warm.

Here's their month:
- Engaged ${data.engagementDays} out of ${data.totalDays} days (${trendDirection} from last month's ${data.previousEngagementDays} days)
- Completion rate: ${data.completionRate}% (was ${data.previousCompletionRate}% last month)

Goals:
${goalSummary || "No active goals"}

Streak highlights:
${streakHighlights || "No notable streaks this month"}

Milestones hit:
${milestones || "None this month"}

Remember: break your response into 4-6 separate short texts. Be warm, insightful, and include one actionable suggestion for next month.`;

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
