import { getQueue, QUEUE_NAMES, type QueueName } from "./queues.js";

// Map schedule types to queue names
const SCHEDULE_TYPE_TO_QUEUE: Record<string, QueueName> = {
  MORNING_TEXT: QUEUE_NAMES.MORNING_TEXT,
  CHECK_IN: QUEUE_NAMES.CHECK_IN,
  EVENING_RECAP: QUEUE_NAMES.EVENING_RECAP,
  CUSTOM: QUEUE_NAMES.CHECK_IN,
};

export async function addScheduleJob(
  scheduleId: string,
  userId: string,
  scheduleType: string,
  cronExpr: string,
  timezone: string
): Promise<string | undefined> {
  const queueName = SCHEDULE_TYPE_TO_QUEUE[scheduleType];
  if (!queueName) return undefined;

  const queue = getQueue(queueName);

  // Remove existing job if any
  await removeScheduleJob(scheduleId, scheduleType);

  const jobName = `${scheduleType}:${scheduleId}`;

  const job = await queue.add(
    jobName,
    { userId, scheduleId },
    {
      repeat: {
        pattern: cronExpr,
        tz: timezone,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  return job.id;
}

export async function removeScheduleJob(scheduleId: string, scheduleType: string): Promise<void> {
  const queueNames = new Set<QueueName>();
  const primary = SCHEDULE_TYPE_TO_QUEUE[scheduleType];
  if (primary) queueNames.add(primary);
  // CUSTOM type routes to CHECK_IN
  if (scheduleType === "CUSTOM") {
    queueNames.add(QUEUE_NAMES.CHECK_IN);
  }

  for (const queueName of queueNames) {
    const queue = getQueue(queueName);
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name?.includes(scheduleId)) {
        await queue.removeRepeatableByKey(job.key);
      }
    }
  }
}

export async function addMemorySummaryJob(
  userId: string,
  type: "daily" | "weekly",
  conversationId?: string
): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.MEMORY_SUMMARY);
  await queue.add(
    `memory-${type}`,
    { userId, conversationId, type },
    {
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
      delay: type === "daily" ? 0 : undefined,
    }
  );
}

export async function addStreakUpdateJob(userId: string, goalId: string): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.STREAK_UPDATE);
  await queue.add(
    "streak-update",
    { userId, goalId },
    {
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 50 },
      jobId: `streak:${goalId}:${new Date().toISOString().slice(0, 13)}`,
    }
  );
}

/**
 * Re-register all enabled schedules from the database into BullMQ.
 * Call on worker startup so jobs survive Redis restarts.
 */
export async function rehydrateSchedules(prisma: {
  schedule: {
    findMany: (args: {
      where: { enabled: boolean };
      select: { id: true; userId: true; type: true; cronExpr: true; timezone: true };
    }) => Promise<
      Array<{
        id: string;
        userId: string;
        type: string;
        cronExpr: string;
        timezone: string;
      }>
    >;
  };
}): Promise<number> {
  const schedules = await prisma.schedule.findMany({
    where: { enabled: true },
    select: { id: true, userId: true, type: true, cronExpr: true, timezone: true },
  });

  let registered = 0;
  for (const s of schedules) {
    try {
      await addScheduleJob(s.id, s.userId, s.type, s.cronExpr, s.timezone);
      registered++;
    } catch (err) {
      console.error(`[scheduler] Failed to rehydrate schedule ${s.id}:`, err);
    }
  }

  return registered;
}

// Setup recurring system-level jobs
export async function setupSystemJobs(): Promise<void> {
  const memoryQueue = getQueue(QUEUE_NAMES.MEMORY_SUMMARY);

  // Daily memory summarization — runs at 3am UTC
  await memoryQueue.add(
    "system-daily-summary",
    { userId: "__system__", type: "daily" as const },
    {
      repeat: {
        pattern: "0 3 * * *",
        tz: "UTC",
      },
      removeOnComplete: { count: 10 },
    }
  );

  // Weekly memory summarization — runs Sunday 4am UTC
  await memoryQueue.add(
    "system-weekly-summary",
    { userId: "__system__", type: "weekly" as const },
    {
      repeat: {
        pattern: "0 4 * * 0",
        tz: "UTC",
      },
      removeOnComplete: { count: 10 },
    }
  );
}
