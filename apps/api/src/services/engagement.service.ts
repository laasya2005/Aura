import type { PrismaClient, Prisma, EngagementType } from "@aura/db";
import type { AuditLogger } from "@aura/shared";
import { GoalService } from "./goal.service.js";

function toDateKey(d: Date, tz?: string): string {
  if (tz) {
    return d.toLocaleDateString("en-CA", { timeZone: tz });
  }
  return d.toISOString().split("T")[0]!;
}

export class EngagementService {
  private goalService: GoalService;

  constructor(
    private prisma: PrismaClient,
    audit: AuditLogger
  ) {
    this.goalService = new GoalService(prisma, audit);
  }

  /**
   * Record an engagement event and auto-track streaks for all active goals.
   */
  async recordEngagement(
    userId: string,
    type: EngagementType,
    metadata?: Record<string, unknown>
  ): Promise<{ milestones: Array<{ goalId: string; goalTitle: string; milestone: number }> }> {
    // Create engagement record
    await this.prisma.engagement.create({
      data: {
        userId,
        channel: "WEB",
        type,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });

    // Auto-track streaks for all active goals
    const activeGoals = await this.prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
    });

    const milestones: Array<{ goalId: string; goalTitle: string; milestone: number }> = [];

    for (const goal of activeGoals) {
      try {
        const result = await this.goalService.recordStreak(userId, goal.id);
        if (result.milestone) {
          milestones.push({
            goalId: goal.id,
            goalTitle: goal.title,
            milestone: result.milestone,
          });
        }
      } catch {
        // recordStreak throws if already recorded today — that's fine
      }
    }

    return { milestones };
  }

  /**
   * Mark recent SENT schedule executions as COMPLETED when user responds.
   * Looks for executions sent in the last 4 hours on the same channel.
   */
  async completeScheduleExecutions(userId: string): Promise<void> {
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

    // Mark matching recent executions as COMPLETED
    await this.prisma.scheduleExecution.updateMany({
      where: {
        userId,
        channel: "WEB",
        status: "SENT",
        firedAt: { gte: fourHoursAgo },
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Mark any stale SENT executions (older than 4 hours) as MISSED
    await this.prisma.scheduleExecution.updateMany({
      where: {
        userId,
        status: "SENT",
        firedAt: { lt: fourHoursAgo },
      },
      data: { status: "MISSED" },
    });
  }

  /**
   * Get check-in completion stats for analytics.
   * Uses engagement data: counts days the user engaged vs. days since they started
   * (or since their schedules were created). Also includes per-schedule breakdown
   * when schedule execution records exist.
   */
  async getScheduleCompletionStats(userId: string, start?: Date, end?: Date) {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const startDate = start ?? defaultStart;
    const endDate = end ?? now;

    // Get user's active schedules to know expected check-in days
    const activeSchedules = await this.prisma.schedule.findMany({
      where: { userId, enabled: true },
      select: { id: true, type: true, channel: true, metadata: true, createdAt: true },
    });

    // Get all engagements in range
    const engagements = await this.prisma.engagement.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, channel: true },
    });

    // Count unique engagement days
    const engagementDays = new Set(engagements.map((e) => toDateKey(e.createdAt)));

    // Calculate total expected days (days since start or schedule creation, whichever is later)
    const effectiveStart =
      activeSchedules.length > 0
        ? new Date(
            Math.max(
              startDate.getTime(),
              Math.min(...activeSchedules.map((s) => s.createdAt.getTime()))
            )
          )
        : startDate;

    const totalDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
    );

    const totalCompleted = engagementDays.size;
    const totalMissed = Math.max(0, totalDays - totalCompleted);
    const overallRate = Math.round((totalCompleted / totalDays) * 100);

    // Per-schedule breakdown from schedule_executions (if any exist)
    const executions = await this.prisma.scheduleExecution.findMany({
      where: {
        userId,
        firedAt: { gte: startDate, lte: endDate },
      },
      include: {
        schedule: {
          select: { type: true, channel: true, metadata: true },
        },
      },
      orderBy: { firedAt: "desc" },
    });

    // Treat SENT executions older than 4 hours as MISSED (read-only, no DB mutation)
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 4);
    for (const exec of executions) {
      if (exec.status === "SENT" && exec.firedAt < cutoff) {
        (exec as { status: string }).status = "MISSED";
      }
    }

    // Build per-schedule stats
    const schedules: Array<{
      scheduleId: string;
      type: string;
      channel: string;
      label: string | null;
      total: number;
      completed: number;
      missed: number;
      pending: number;
      completionRate: number;
    }> = [];

    if (executions.length > 0) {
      // Use actual execution records
      const bySchedule = new Map<
        string,
        {
          scheduleId: string;
          type: string;
          channel: string;
          label: string | null;
          total: number;
          completed: number;
          missed: number;
          pending: number;
        }
      >();

      for (const exec of executions) {
        if (!bySchedule.has(exec.scheduleId)) {
          const label = (exec.schedule.metadata as { label?: string } | null)?.label ?? null;
          bySchedule.set(exec.scheduleId, {
            scheduleId: exec.scheduleId,
            type: exec.schedule.type,
            channel: exec.schedule.channel,
            label,
            total: 0,
            completed: 0,
            missed: 0,
            pending: 0,
          });
        }
        const stats = bySchedule.get(exec.scheduleId)!;
        stats.total++;
        if (exec.status === "COMPLETED") stats.completed++;
        else if (exec.status === "MISSED") stats.missed++;
        else stats.pending++;
      }

      for (const s of bySchedule.values()) {
        schedules.push({
          ...s,
          completionRate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
        });
      }
    } else if (activeSchedules.length > 0) {
      // No execution records yet — derive from engagement data per schedule
      for (const sched of activeSchedules) {
        const label = (sched.metadata as { label?: string } | null)?.label ?? null;
        const schedDays = Math.max(
          1,
          Math.ceil(
            (endDate.getTime() - Math.max(sched.createdAt.getTime(), startDate.getTime())) /
              (1000 * 60 * 60 * 24)
          )
        );
        // Count engagement days on this schedule's channel
        const channelEngagements = engagements.filter((e) => e.channel === sched.channel);
        const channelDays = new Set(channelEngagements.map((e) => toDateKey(e.createdAt))).size;

        schedules.push({
          scheduleId: sched.id,
          type: sched.type,
          channel: sched.channel,
          label,
          total: schedDays,
          completed: channelDays,
          missed: Math.max(0, schedDays - channelDays),
          pending: 0,
          completionRate: Math.round((channelDays / schedDays) * 100),
        });
      }
    }

    return {
      overallRate,
      totalSent: totalDays,
      totalCompleted,
      totalMissed,
      schedules,
    };
  }

  /**
   * Get engagement stats grouped by period and channel.
   */
  async getEngagementStats(
    userId: string,
    period: "daily" | "weekly" | "monthly" = "daily",
    start?: Date,
    end?: Date
  ) {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 90);

    const startDate = start ?? defaultStart;
    const endDate = end ?? now;

    const engagements = await this.prisma.engagement.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    // Group by period
    const grouped = new Map<string, number>();

    for (const eng of engagements) {
      const key = this.periodKey(eng.createdAt, period);
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }

    return Array.from(grouped.entries()).map(([date, total]) => ({
      date,
      total,
    }));
  }

  /**
   * Get a streak calendar: which days had engagement, via which channels.
   */
  async getStreakCalendar(userId: string, start?: Date, end?: Date) {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 90);

    const startDate = start ?? defaultStart;
    const endDate = end ?? now;

    const engagements = await this.prisma.engagement.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: "asc" },
      select: { channel: true, createdAt: true },
    });

    const calendar = new Map<string, { count: number; channels: Set<string> }>();

    for (const eng of engagements) {
      const day = toDateKey(eng.createdAt);
      if (!calendar.has(day)) {
        calendar.set(day, { count: 0, channels: new Set() });
      }
      const entry = calendar.get(day)!;
      entry.count++;
      entry.channels.add(eng.channel);
    }

    return Array.from(calendar.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      channels: Array.from(data.channels),
    }));
  }

  /**
   * Get aggregate summary stats for a user.
   */
  async getSummary(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get user timezone for consistent date keys
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user?.timezone ?? "America/New_York";

    // Engagement days in last 30 days
    const recentEngagements = await this.prisma.engagement.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    const uniqueDays = new Set(recentEngagements.map((e) => toDateKey(e.createdAt, tz)));

    // Overall engagement streak (last 365 days max for performance)
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const allEngagements = await this.prisma.engagement.findMany({
      where: { userId, createdAt: { gte: oneYearAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const allDays = new Set(allEngagements.map((e) => toDateKey(e.createdAt, tz)));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate current streak from today backwards (timezone-aware)
    const todayKey = toDateKey(now, tz);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = toDateKey(yesterdayDate, tz);

    if (allDays.has(todayKey)) {
      currentStreak = 1;
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      while (allDays.has(toDateKey(d, tz))) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      }
    } else if (allDays.has(yesterdayKey)) {
      currentStreak = 1;
      const d = new Date(yesterdayDate);
      d.setDate(d.getDate() - 1);
      while (allDays.has(toDateKey(d, tz))) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      }
    }

    // Calculate longest streak
    const sortedDays = Array.from(allDays).sort();
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(sortedDays[i - 1]!);
        const curr = new Date(sortedDays[i]!);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        tempStreak = diff <= 1 ? tempStreak + 1 : 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Weekly average (engagement days per week over last 30 days)
    const weeklyAvg = Math.round((uniqueDays.size / 30) * 7 * 10) / 10;

    // Has engagement today? (todayKey already computed above with timezone)
    const engagedToday = allDays.has(todayKey);

    return {
      engagementDays30d: uniqueDays.size,
      currentStreak,
      longestStreak,
      weeklyAvg,
      engagedToday,
    };
  }

  /**
   * Get per-goal streak data for analytics.
   */
  async getGoalStreaks(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { currentStreak: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        currentStreak: true,
        longestStreak: true,
        lastStreakAt: true,
      },
    });
  }

  private periodKey(date: Date, period: "daily" | "weekly" | "monthly"): string {
    const d = new Date(date);
    if (period === "daily") {
      return toDateKey(d);
    }
    if (period === "weekly") {
      // ISO week start (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      return toDateKey(monday);
    }
    // monthly
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
}
