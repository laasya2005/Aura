if (process.env.NODE_ENV !== "production") {
  const { config } = await import("dotenv");
  const { resolve, dirname } = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  config({ path: resolve(__dirname, "../../..", ".env") });
}

import { PrismaClient } from "@aura/db";
import Redis from "ioredis";
import {
  createMorningTextWorker,
  createCheckInWorker,
  createEveningRecapWorker,
  createMemorySummaryWorker,
  createStreakUpdateWorker,
  setupSystemJobs,
  rehydrateSchedules,
} from "@aura/queue";
import { ConversationService } from "./services/conversation.service.js";
import { buildAuditLogger } from "./services/audit.service.js";

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const audit = buildAuditLogger(prisma);
const conversationService = new ConversationService(prisma, redis, audit);

async function recordScheduleSent(userId: string, scheduleId: string): Promise<void> {
  try {
    await prisma.scheduleExecution.create({
      data: {
        userId,
        scheduleId,
        channel: "WEB",
        status: "SENT",
      },
    });
  } catch (e) {
    console.warn("[worker] Failed to record schedule execution:", e);
  }
}

console.log("[worker] Starting Aura workers...");

/**
 * Get the schedule label from metadata for context-aware messages.
 */
async function getScheduleLabel(scheduleId?: string): Promise<string | undefined> {
  if (!scheduleId) return undefined;
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    select: { metadata: true },
  });
  return (schedule?.metadata as { label?: string } | null)?.label ?? undefined;
}

/**
 * Generate a proactive AI message, store it, and send via iMessage if the user has a phone.
 */
async function generateAndStoreMessage(
  tag: string,
  userId: string,
  scheduleId: string,
  type: "morning" | "check_in" | "evening"
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, phone: true },
  });
  if (!user || user.status === "DELETED" || user.status === "PAUSED") {
    console.log(`[${tag}] BLOCKED: user not found or inactive`);
    return;
  }

  const label = await getScheduleLabel(scheduleId);
  const channel = user.phone ? "SMS" : "WEB";
  console.log(`[${tag}] Generating message... label="${label}" channel=${channel}`);

  const { content } = await conversationService.generateProactiveMessage(
    userId,
    type,
    channel as "WEB" | "SMS",
    label
  );

  await recordScheduleSent(userId, scheduleId);

  // Send via iMessage if user has a phone number and Sendblue is configured
  if (user.phone && process.env.SENDBLUE_API_KEY) {
    try {
      const { SendblueService } = await import("./services/sendblue.service.js");
      const sendblue = new SendblueService(prisma);
      await sendblue.sendMessage(user.phone, content);
      console.log(`[${tag}] iMessage sent to ***${user.phone.slice(-4)}`);
    } catch (err) {
      console.error(`[${tag}] Failed to send iMessage:`, err);
    }
  }

  console.log(`[${tag}] Message stored. content="${content.slice(0, 60)}..."`);
}

// --- Morning Text Worker ---
const morningWorker = createMorningTextWorker(async (data) => {
  console.log(`[morning-text] Job fired for userId=${data.userId} scheduleId=${data.scheduleId}`);
  await generateAndStoreMessage("morning-text", data.userId, data.scheduleId, "morning");
});

// --- Check-In Worker ---
const checkInWorker = createCheckInWorker(async (data) => {
  console.log(`[check-in] Job fired for userId=${data.userId} scheduleId=${data.scheduleId}`);
  await generateAndStoreMessage("check-in", data.userId, data.scheduleId, "check_in");
});

// --- Evening Recap Worker ---
const eveningWorker = createEveningRecapWorker(async (data) => {
  console.log(`[evening-recap] Job fired for userId=${data.userId} scheduleId=${data.scheduleId}`);
  await generateAndStoreMessage("evening-recap", data.userId, data.scheduleId, "evening");
});

// --- Memory Summary Worker ---
const memoryWorker = createMemorySummaryWorker(async (data) => {
  if (data.userId === "__system__") {
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    console.log(`[memory-summary] Running ${data.type} summary for ${users.length} users`);
    return;
  }

  console.log(`[memory-summary] ${data.type} summary for ${data.userId}`);
});

// --- Streak Update Worker ---
const streakWorker = createStreakUpdateWorker(async (data) => {
  const goal = await prisma.goal.findUnique({
    where: { id: data.goalId },
    select: { currentStreak: true, longestStreak: true, lastStreakAt: true, userId: true },
  });
  if (!goal) return;

  const user = await prisma.user.findUnique({
    where: { id: goal.userId },
    select: { timezone: true },
  });
  const tz = user?.timezone ?? "America/New_York";

  const nowInTz = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const lastActivity = goal.lastStreakAt;
  const lastInTz = lastActivity ? lastActivity.toLocaleDateString("en-CA", { timeZone: tz }) : null;

  if (lastInTz === nowInTz) {
    return;
  }

  const nowDate = new Date(nowInTz + "T12:00:00");
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
const workers = [morningWorker, checkInWorker, eveningWorker, memoryWorker, streakWorker];

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
