import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../..", ".env") });

import { PrismaClient, type ConsentType } from "@aura/db";
import Redis from "ioredis";
import {
  createMorningTextWorker,
  createCheckInWorker,
  createEveningRecapWorker,
  createVoiceCallWorker,
  createMemorySummaryWorker,
  createStreakUpdateWorker,
  setupSystemJobs,
  rehydrateSchedules,
} from "@aura/queue";
import {
  sendSms,
  formatForSms,
  trySendWhatsApp,
  formatForWhatsApp,
  isQuietHours,
  initiateCall,
  MONTHLY_CALL_LIMITS,
  createRoom,
  dialUserViaSip,
} from "@aura/comms";
import { ConversationService } from "./services/conversation.service.js";
import { buildAuditLogger } from "./services/audit.service.js";

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const audit = buildAuditLogger(prisma);
const conversationService = new ConversationService(prisma, redis, audit);

const apiUrl = process.env.API_BASE_URL ?? process.env.API_URL ?? "http://localhost:3001";

console.log("[worker] Starting Aura workers...");

// Helper: check if user should receive messages
async function hasActiveConsent(userId: string, type: ConsentType): Promise<boolean> {
  const consent = await prisma.consentRecord.findFirst({
    where: { userId, type, granted: true, revokedAt: null },
    orderBy: { grantedAt: "desc" },
  });
  return !!consent;
}

function maskPhone(phone: string): string {
  return `***${phone.slice(-4)}`;
}

/**
 * Get the schedule label from metadata for context-aware messages.
 */
async function getScheduleInfo(scheduleId?: string): Promise<{ label?: string; channel?: string }> {
  if (!scheduleId) return {};
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    select: { metadata: true, channel: true },
  });
  if (!schedule) return {};
  const label = (schedule.metadata as { label?: string } | null)?.label ?? undefined;
  return { label, channel: schedule.channel };
}

/**
 * Send a message via WhatsApp first. If WhatsApp fails (e.g., outside 24hr window),
 * automatically falls back to SMS.
 */
async function sendWithFallback(tag: string, phone: string, content: string): Promise<void> {
  // Try WhatsApp first
  const waBody = formatForWhatsApp(content);
  const wa = await trySendWhatsApp(phone, waBody);
  if (wa.success) {
    console.log(`[${tag}] WhatsApp sent to ${maskPhone(phone)} sid=${wa.result!.sid}`);
    return;
  }

  // WhatsApp failed — fall back to SMS
  console.log(`[${tag}] WhatsApp failed (${wa.error}), falling back to SMS`);
  const smsBody = formatForSms(content);
  const result = await sendSms(phone, smsBody);
  console.log(`[${tag}] SMS fallback sent to ${maskPhone(phone)} sid=${result.sid}`);
}

// --- Morning Text Worker ---
const morningWorker = createMorningTextWorker(async (data) => {
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { phone: true, timezone: true, status: true },
  });
  if (!user || user.status === "DELETED" || user.status === "PAUSED") return;

  if (isQuietHours(user.timezone ?? "America/New_York")) {
    console.log(`[morning-text] Skipping for ${data.userId} — quiet hours`);
    return;
  }

  const { label, channel } = await getScheduleInfo(data.scheduleId);

  // WEB channel: generate and store message in conversation (user sees it in chat)
  if (channel === "WEB") {
    await conversationService.generateProactiveMessage(data.userId, "morning", "WEB", label);
    console.log(`[morning-text] WEB message stored for ${data.userId}`);
    return;
  }

  // WhatsApp/SMS channel
  const hasWA = await hasActiveConsent(data.userId, "WHATSAPP");
  const hasSMS = await hasActiveConsent(data.userId, "SMS");
  if (!hasWA && !hasSMS) {
    console.log(`[morning-text] Skipping for ${data.userId} — no messaging consent`);
    return;
  }

  const { content } = await conversationService.generateProactiveMessage(
    data.userId,
    "morning",
    hasWA ? "WHATSAPP" : "SMS",
    label
  );

  await sendWithFallback("morning-text", user.phone, content);
});

// --- Check-In Worker ---
const checkInWorker = createCheckInWorker(async (data) => {
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { phone: true, timezone: true, status: true },
  });
  if (!user || user.status === "DELETED" || user.status === "PAUSED") return;

  if (isQuietHours(user.timezone ?? "America/New_York")) {
    console.log(`[check-in] Skipping for ${data.userId} — quiet hours`);
    return;
  }

  const { label, channel } = await getScheduleInfo(data.scheduleId);

  // WEB channel: generate and store message in conversation
  if (channel === "WEB") {
    await conversationService.generateProactiveMessage(data.userId, "check_in", "WEB", label);
    console.log(`[check-in] WEB message stored for ${data.userId}`);
    return;
  }

  // WhatsApp/SMS channel
  const hasWA = await hasActiveConsent(data.userId, "WHATSAPP");
  const hasSMS = await hasActiveConsent(data.userId, "SMS");
  if (!hasWA && !hasSMS) {
    console.log(`[check-in] Skipping for ${data.userId} — no messaging consent`);
    return;
  }

  const { content } = await conversationService.generateProactiveMessage(
    data.userId,
    "check_in",
    hasWA ? "WHATSAPP" : "SMS",
    label
  );

  await sendWithFallback("check-in", user.phone, content);
});

// --- Evening Recap Worker ---
const eveningWorker = createEveningRecapWorker(async (data) => {
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { phone: true, timezone: true, status: true },
  });
  if (!user || user.status === "DELETED" || user.status === "PAUSED") return;

  if (isQuietHours(user.timezone ?? "America/New_York")) {
    console.log(`[evening-recap] Skipping for ${data.userId} — quiet hours`);
    return;
  }

  const { label, channel } = await getScheduleInfo(data.scheduleId);

  // WEB channel: generate and store message in conversation
  if (channel === "WEB") {
    await conversationService.generateProactiveMessage(data.userId, "evening", "WEB", label);
    console.log(`[evening-recap] WEB message stored for ${data.userId}`);
    return;
  }

  // WhatsApp/SMS channel
  const hasWA = await hasActiveConsent(data.userId, "WHATSAPP");
  const hasSMS = await hasActiveConsent(data.userId, "SMS");
  if (!hasWA && !hasSMS) {
    console.log(`[evening-recap] Skipping for ${data.userId} — no messaging consent`);
    return;
  }

  const { content } = await conversationService.generateProactiveMessage(
    data.userId,
    "evening",
    hasWA ? "WHATSAPP" : "SMS",
    label
  );

  await sendWithFallback("evening-recap", user.phone, content);
});

// --- Voice Call Worker ---
const voiceEngine = process.env.VOICE_ENGINE ?? "twilio";

const voiceWorker = createVoiceCallWorker(async (data) => {
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { phone: true, timezone: true, status: true, plan: true },
  });
  if (!user || user.status === "DELETED" || user.status === "PAUSED") return;

  if (!(await hasActiveConsent(data.userId, "VOICE"))) {
    console.log(`[voice-call] Skipping for ${data.userId} — no VOICE consent`);
    return;
  }

  // Check monthly call limit
  const limit = MONTHLY_CALL_LIMITS[user.plan] ?? 0;
  if (limit === 0) {
    console.log(`[voice-call] Skipping for ${data.userId} — plan doesn't include calls`);
    return;
  }

  // Count calls this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const callCount = await prisma.message.count({
    where: {
      conversation: { userId: data.userId },
      channel: "VOICE",
      createdAt: { gte: monthStart },
    },
  });
  if (callCount >= limit) {
    console.log(
      `[voice-call] Skipping for ${data.userId} — monthly limit reached (${callCount}/${limit})`
    );
    return;
  }

  if (voiceEngine === "livekit") {
    // Get schedule label and user name for the voice agent greeting
    const { label: scheduleLabel } = await getScheduleInfo(data.scheduleId);
    const userInfo = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { firstName: true },
    });

    const roomName = `aura-voice-${data.userId}-${Date.now()}`;
    const metadata = JSON.stringify({
      userId: data.userId,
      firstName: userInfo?.firstName || null,
      scheduleLabel: scheduleLabel || null,
      scheduleId: data.scheduleId || null,
    });

    await createRoom(roomName, metadata);
    console.log(`[voice-call] LiveKit room created: ${roomName}`);

    // Dispatch the voice agent to the room
    const { AgentDispatchClient } = await import("livekit-server-sdk");
    const agentClient = new AgentDispatchClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );
    await agentClient.createDispatch(roomName, "aura-voice");
    console.log(`[voice-call] Agent dispatched to ${roomName}`);

    // Dial the user via SIP outbound trunk
    const sipTrunkId = process.env.LIVEKIT_SIP_TRUNK_ID;
    if (!sipTrunkId) throw new Error("LIVEKIT_SIP_TRUNK_ID must be set");

    await dialUserViaSip(roomName, user.phone, `phone-${data.userId}`);
    console.log(`[voice-call] LiveKit SIP dial initiated for ${data.userId}`);
  } else {
    // Twilio fallback: existing TwiML-based flow
    await initiateCall(
      user.phone,
      `${apiUrl}/webhooks/twilio/voice/answer`,
      `${apiUrl}/webhooks/twilio/voice/status`
    );
    console.log(`[voice-call] Twilio call initiated for ${data.userId}`);
  }
});

// --- Memory Summary Worker ---
const memoryWorker = createMemorySummaryWorker(async (data) => {
  if (data.userId === "__system__") {
    // System-level: summarize conversations for all active users
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    console.log(`[memory-summary] Running ${data.type} summary for ${users.length} users`);
    // In production, this would batch-enqueue individual summarization jobs.
    // For now, just log.
    return;
  }

  // Individual user summary
  console.log(`[memory-summary] ${data.type} summary for ${data.userId}`);
});

// --- Streak Update Worker ---
const streakWorker = createStreakUpdateWorker(async (data) => {
  const goal = await prisma.goal.findUnique({
    where: { id: data.goalId },
    select: { currentStreak: true, longestStreak: true, lastStreakAt: true, userId: true },
  });
  if (!goal) return;

  // Use user's timezone for date comparisons
  const user = await prisma.user.findUnique({
    where: { id: goal.userId },
    select: { timezone: true },
  });
  const tz = user?.timezone ?? "America/New_York";

  // Get today's date string in user's timezone
  const nowInTz = new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
  const lastActivity = goal.lastStreakAt;
  const lastInTz = lastActivity ? lastActivity.toLocaleDateString("en-CA", { timeZone: tz }) : null;

  // If last activity was today, streak is already counted
  if (lastInTz === nowInTz) {
    return;
  }

  // Calculate yesterday's date in user's timezone
  const nowDate = new Date(nowInTz + "T12:00:00"); // noon to avoid DST edge cases
  const yesterdayDate = new Date(nowDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  const now = new Date();
  if (lastInTz === yesterdayStr) {
    const newStreak = goal.currentStreak + 1;
    await prisma.goal.update({
      where: { id: data.goalId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, goal.longestStreak),
        lastStreakAt: now,
      },
    });
    console.log(`[streak-update] ${data.goalId} streak: ${newStreak}`);
  } else {
    // Streak broken — reset to 1
    await prisma.goal.update({
      where: { id: data.goalId },
      data: {
        currentStreak: 1,
        lastStreakAt: now,
      },
    });
    console.log(`[streak-update] ${data.goalId} streak reset to 1`);
  }
});

// --- Setup system recurring jobs ---
const workers = [
  morningWorker,
  checkInWorker,
  eveningWorker,
  voiceWorker,
  memoryWorker,
  streakWorker,
];

setupSystemJobs()
  .then(async () => {
    console.log("[worker] System jobs scheduled");
    const count = await rehydrateSchedules(prisma);
    console.log(`[worker] Rehydrated ${count} user schedules from database`);
    console.log("[worker] All workers running. Waiting for jobs...");
  })
  .catch((err) => {
    console.error("[worker] Failed to setup system jobs:", err);
  });

// --- Graceful shutdown ---
const shutdown = async () => {
  console.log("[worker] Shutting down...");
  await Promise.all(workers.map((w) => w.close()));
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
