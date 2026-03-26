import type { PrismaClient } from "@aura/db";
import { addScheduleJob } from "@aura/queue";

const DEFAULT_SCHEDULES = [
  { type: "MORNING_TEXT" as const, cronExpr: "0 8 * * *" },
  { type: "CHECK_IN" as const, cronExpr: "0 13 * * *" },
  { type: "EVENING_RECAP" as const, cronExpr: "0 20 * * *" },
];

/**
 * Create default morning/check-in/evening schedules for a user.
 * Idempotent — skips any schedule type the user already has.
 */
export async function createDefaultSchedules(
  prisma: PrismaClient,
  userId: string,
  timezone: string
): Promise<number> {
  const existing = await prisma.schedule.findMany({
    where: { userId },
    select: { type: true },
  });
  const existingTypes = new Set(existing.map((s) => s.type));

  let created = 0;
  for (const def of DEFAULT_SCHEDULES) {
    if (existingTypes.has(def.type)) continue;

    const schedule = await prisma.schedule.create({
      data: {
        userId,
        type: def.type,
        channel: "SMS",
        cronExpr: def.cronExpr,
        timezone,
        enabled: true,
      },
    });

    await addScheduleJob(schedule.id, userId, def.type, def.cronExpr, timezone).catch((err) => {
      console.error(`[schedule-defaults] Failed to register ${def.type} job:`, err);
    });

    created++;
  }

  if (created > 0) {
    console.log(`[schedule-defaults] Created ${created} default schedules for user ${userId} (${timezone})`);
  }

  return created;
}
