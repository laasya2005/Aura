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

const voiceEngine = process.env.VOICE_ENGINE ?? "twilio";

/**
 * Initiate a voice call. Shared by all workers when channel is VOICE.
 */
async function initiateVoiceCall(
  tag: string,
  userId: string,
  phone: string,
  plan: string,
  scheduleId?: string
): Promise<void> {
  console.log(`[${tag}] VOICE call flow started for ${userId}`);

  if (!(await hasActiveConsent(userId, "VOICE"))) {
    console.log(`[${tag}] BLOCKED: no VOICE consent for ${userId}`);
    return;
  }
  console.log(`[${tag}] VOICE consent OK`);

  const limit = MONTHLY_CALL_LIMITS[plan] ?? 0;
  if (limit === 0) {
    console.log(`[${tag}] BLOCKED: plan "${plan}" doesn't include calls`);
    return;
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const callCount = await prisma.message.count({
    where: { conversation: { userId }, channel: "VOICE", createdAt: { gte: monthStart } },
  });
  if (callCount >= limit) {
    console.log(`[${tag}] BLOCKED: monthly limit reached (${callCount}/${limit})`);
    return;
  }
  console.log(`[${tag}] Monthly limit OK (${callCount}/${limit})`);

  if (voiceEngine === "livekit") {
    const { label: scheduleLabel } = await getScheduleInfo(scheduleId);
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true },
    });

    const roomName = `aura-voice-${userId}-${Date.now()}`;
    const metadata = JSON.stringify({
      userId,
      firstName: userInfo?.firstName || null,
      scheduleLabel: scheduleLabel || null,
      scheduleId: scheduleId || null,
    });

    await createRoom(roomName, metadata);
    console.log(`[${tag}] LiveKit room created: ${roomName}`);

    const { AgentDispatchClient } = await import("livekit-server-sdk");
    const agentClient = new AgentDispatchClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );
    await agentClient.createDispatch(roomName, "aura-voice");
    console.log(`[${tag}] Agent dispatched`);

    await dialUserViaSip(roomName, phone, `phone-${userId}`);
    console.log(`[${tag}] SIP dial initiated to ${maskPhone(phone)}`);
  } else {
    await initiateCall(
      phone,
      `${apiUrl}/webhooks/twilio/voice/answer`,
      `${apiUrl}/webhooks/twilio/voice/status`
    );
    console.log(`[${tag}] Twilio call initiated to ${maskPhone(phone)}`);
  }
}

// --- Morning Text Worker ---
const morningWorker = createMorningTextWorker(async (data) => {
  console.log(`[morning-text] Job fired for userId=${data.userId} scheduleId=${data.scheduleId}`);
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { phone: true, status: true, plan: true },
  });
  if (!user || user.status === "DELETED" || user.status === "PAUSED") {
    console.log(`[morning-text] BLOCKED: user not found or inactive`);
    return;
  }

  const { label, channel } = await getScheduleInfo(data.scheduleId);
  console.log(`[morning-text] channel=${channel} label="${label}"`);

  if (channel === "VOICE") {
    await initiateVoiceCall("morning-text", data.userId, user.phone, user.plan, data.scheduleId);
    return;
  }

  if (channel === "WEB") {
    await conversationService.generateProactiveMessage(data.userId, "morning", "WEB", label);
    console.log(`[morning-text] WEB message stored`);
    return;
  }

  const hasWA = await hasActiveConsent(data.userId, "WHATSAPP");
  const hasSMS = await hasActiveConsent(data.userId, "SMS");
  console.log(`[morning-text] consent: WHATSAPP=${hasWA} SMS=${hasSMS}`);
  if (!hasWA && !hasSMS) {
    console.log(`[morning-text] BLOCKED: no messaging consent`);
    return;
  }

  console.log(`[morning-text] Generating message...`);
  const { content } = await conversationService.generateProactiveMessage(
    data.userId,
    "morning",
    hasWA ? "WHATSAPP" : "SMS",
    label
  );

  console.log(`[morning-text] Sending to ${maskPhone(user.phone)}...`);
  await sendWithFallback("morning-text", user.phone, content);
  console.log(`[morning-text] DONE`);
});

// --- Check-In Worker ---
const checkInWorker = createCheckInWorker(async (data) => {
  console.log(`[check-in] Job fired for userId=${data.userId} scheduleId=${data.scheduleId}`);
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { phone: true, status: true, plan: true },
  });
  if (!user || user.status === "DELETED" || user.status === "PAUSED") {
    console.log(`[check-in] BLOCKED: user not found or inactive`);
    return;
  }

  const { label, channel } = await getScheduleInfo(data.scheduleId);
  console.log(`[check-in] channel=${channel} label="${label}"`);

  if (channel === "VOICE") {
    await initiateVoiceCall("check-in", data.userId, user.phone, user.plan, data.scheduleId);
    return;
  }

  if (channel === "WEB") {
    await conversationService.generateProactiveMessage(data.userId, "check_in", "WEB", label);
    console.log(`[check-in] WEB message stored`);
    return;
  }

  const hasWA = await hasActiveConsent(data.userId, "WHATSAPP");
  const hasSMS = await hasActiveConsent(data.userId, "SMS");
  console.log(`[check-in] consent: WHATSAPP=${hasWA} SMS=${hasSMS}`);
  if (!hasWA && !hasSMS) {
    console.log(`[check-in] BLOCKED: no messaging consent`);
    return;
  }

  console.log(`[check-in] Generating message...`);
  const { content } = await conversationService.generateProactiveMessage(
    data.userId,
    "check_in",
    hasWA ? "WHATSAPP" : "SMS",
    label
  );

  console.log(`[check-in] Sending to ${maskPhone(user.phone)}...`);
  await sendWithFallback("check-in", user.phone, content);
  console.log(`[check-in] DONE`);
});

// --- Evening Recap Worker ---
const eveningWorker = createEveningRecapWorker(async (data) => {
  console.log(`[evening-recap] Job fired for userId=${data.userId} scheduleId=${data.scheduleId}`);
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { phone: true, status: true, plan: true },
  });
  if (!user || user.status === "DELETED" || user.status === "PAUSED") {
    console.log(`[evening-recap] BLOCKED: user not found or inactive`);
    return;
  }

  const { label, channel } = await getScheduleInfo(data.scheduleId);
  console.log(`[evening-recap] channel=${channel} label="${label}"`);

  if (channel === "VOICE") {
    await initiateVoiceCall("evening-recap", data.userId, user.phone, user.plan, data.scheduleId);
    return;
  }

  if (channel === "WEB") {
    await conversationService.generateProactiveMessage(data.userId, "evening", "WEB", label);
    console.log(`[evening-recap] WEB message stored`);
    return;
  }

  const hasWA = await hasActiveConsent(data.userId, "WHATSAPP");
  const hasSMS = await hasActiveConsent(data.userId, "SMS");
  console.log(`[evening-recap] consent: WHATSAPP=${hasWA} SMS=${hasSMS}`);
  if (!hasWA && !hasSMS) {
    console.log(`[evening-recap] BLOCKED: no messaging consent`);
    return;
  }

  console.log(`[evening-recap] Generating message...`);
  const { content } = await conversationService.generateProactiveMessage(
    data.userId,
    "evening",
    hasWA ? "WHATSAPP" : "SMS",
    label
  );

  console.log(`[evening-recap] Sending to ${maskPhone(user.phone)}...`);
  await sendWithFallback("evening-recap", user.phone, content);
  console.log(`[evening-recap] DONE`);
});

// --- Voice Call Worker ---
const voiceWorker = createVoiceCallWorker(async (data) => {
  console.log(`[voice-call] Job fired for userId=${data.userId} scheduleId=${data.scheduleId}`);
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { phone: true, status: true, plan: true },
  });
  if (!user || user.status === "DELETED" || user.status === "PAUSED") {
    console.log(`[voice-call] BLOCKED: user not found or inactive`);
    return;
  }

  await initiateVoiceCall("voice-call", data.userId, user.phone, user.plan, data.scheduleId);
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
