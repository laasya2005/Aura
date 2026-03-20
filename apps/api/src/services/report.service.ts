import type { PrismaClient } from "@aura/db";
import {
  chat,
  buildWeeklyReportPrompt,
  buildMonthlyReportPrompt,
  type AuraContext,
  type UserContext,
  type WeeklyReportData,
  type MonthlyReportData,
} from "@aura/ai";
import { addProgressReportJob } from "@aura/queue";

export class ReportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Fan out weekly report jobs to all PRO and ELITE users with a phone number.
   */
  async dispatchWeeklyReports(): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: {
        status: "ACTIVE",
        plan: { in: ["PRO", "ELITE"] },
        phone: { not: null },
      },
      select: { id: true, timezone: true },
    });

    for (let i = 0; i < users.length; i++) {
      const user = users[i]!;
      // Stagger jobs by 2 seconds each to avoid burst
      const delayMs = i * 2000;
      await addProgressReportJob(user.id, "weekly", delayMs);
    }

    console.log(`[report] Dispatched weekly reports for ${users.length} users`);
    return users.length;
  }

  /**
   * Fan out monthly report jobs to ELITE users with a phone number.
   */
  async dispatchMonthlyReports(): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: {
        status: "ACTIVE",
        plan: "ELITE",
        phone: { not: null },
      },
      select: { id: true, timezone: true },
    });

    for (let i = 0; i < users.length; i++) {
      const user = users[i]!;
      const delayMs = i * 2000;
      await addProgressReportJob(user.id, "monthly", delayMs);
    }

    console.log(`[report] Dispatched monthly reports for ${users.length} users`);
    return users.length;
  }

  /**
   * Generate the weekly report content for a single user.
   */
  async generateWeeklyReport(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        timezone: true,
        plan: true,
        status: true,
        phone: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new Error(`User ${userId} not found or inactive`);
    }

    // Re-check plan — user may have downgraded since dispatch
    if (user.plan === "FREE") {
      throw new Error(`User ${userId} is on FREE plan, skipping weekly report`);
    }

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const reportData = await this.gatherReportData(userId, weekAgo, now, user.timezone);
    const { auraContext, userContext } = await this.buildContexts(user, reportData.goals);

    const weeklyData: WeeklyReportData = {
      goals: reportData.goals,
      engagementDays: reportData.engagementDays,
      totalDays: 7,
      completionRate: reportData.completionRate,
      streakHighlights: reportData.streakHighlights,
    };

    const prompt = buildWeeklyReportPrompt(auraContext, userContext, weeklyData);
    const response = await chat(prompt.messages, { systemPrompt: prompt.systemPrompt });
    return response.content;
  }

  /**
   * Generate the monthly report content for a single user.
   */
  async generateMonthlyReport(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        timezone: true,
        plan: true,
        status: true,
        phone: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new Error(`User ${userId} not found or inactive`);
    }

    if (user.plan !== "ELITE") {
      throw new Error(`User ${userId} is not on ELITE plan, skipping monthly report`);
    }

    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    const currentData = await this.gatherReportData(userId, monthAgo, now, user.timezone);
    const previousData = await this.gatherReportData(userId, twoMonthsAgo, monthAgo, user.timezone);
    const { auraContext, userContext } = await this.buildContexts(user, currentData.goals);

    // Identify milestones — goals that crossed streak thresholds this month
    const milestones: Array<{ goalTitle: string; milestone: string }> = [];
    for (const goal of currentData.goals) {
      if (goal.currentStreak >= 30) {
        milestones.push({ goalTitle: goal.title, milestone: "30-day streak" });
      } else if (goal.currentStreak >= 14) {
        milestones.push({ goalTitle: goal.title, milestone: "2-week streak" });
      } else if (goal.currentStreak >= 7) {
        milestones.push({ goalTitle: goal.title, milestone: "1-week streak" });
      }
    }

    const monthlyData: MonthlyReportData = {
      goals: currentData.goals,
      engagementDays: currentData.engagementDays,
      totalDays: 30,
      completionRate: currentData.completionRate,
      streakHighlights: currentData.streakHighlights,
      previousEngagementDays: previousData.engagementDays,
      previousCompletionRate: previousData.completionRate,
      milestones,
    };

    const prompt = buildMonthlyReportPrompt(auraContext, userContext, monthlyData);
    const response = await chat(prompt.messages, { systemPrompt: prompt.systemPrompt });
    return response.content;
  }

  private async gatherReportData(
    userId: string,
    start: Date,
    end: Date,
    timezone: string
  ): Promise<{
    goals: Array<{ title: string; category: string; currentStreak: number; status: string }>;
    engagementDays: number;
    completionRate: number;
    streakHighlights: Array<{ goalTitle: string; streak: number }>;
  }> {
    // Get active goals with streak data
    const goals = await this.prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      select: {
        title: true,
        category: true,
        currentStreak: true,
        status: true,
      },
    });

    // Get engagement days in the period (exclusive upper bound to avoid double-counting)
    const engagements = await this.prisma.engagement.findMany({
      where: {
        userId,
        createdAt: { gte: start, lt: end },
      },
      select: { createdAt: true },
    });

    // Use timezone-aware date bucketing, consistent with EngagementService
    const uniqueDays = new Set(
      engagements.map((e) =>
        e.createdAt.toLocaleDateString("en-CA", { timeZone: timezone })
      )
    );
    const engagementDays = uniqueDays.size;

    // Get schedule execution completion rate (exclusive upper bound)
    const executions = await this.prisma.scheduleExecution.findMany({
      where: {
        userId,
        firedAt: { gte: start, lt: end },
      },
      select: { status: true },
    });

    const totalExecs = executions.length;
    const completedExecs = executions.filter((e) => e.status === "COMPLETED").length;
    const completionRate = totalExecs > 0 ? Math.round((completedExecs / totalExecs) * 100) : 0;

    // Notable streaks (>= 3 days)
    const streakHighlights = goals
      .filter((g) => g.currentStreak >= 3)
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 5)
      .map((g) => ({ goalTitle: g.title, streak: g.currentStreak }));

    return {
      goals: goals.map((g) => ({
        title: g.title,
        category: g.category,
        currentStreak: g.currentStreak,
        status: g.status,
      })),
      engagementDays,
      completionRate,
      streakHighlights,
    };
  }

  private async buildContexts(
    user: {
      id: string;
      firstName: string | null;
      timezone: string;
      plan: string;
    },
    goals: Array<{ title: string; category: string; currentStreak: number; status: string }>
  ): Promise<{ auraContext: AuraContext; userContext: UserContext }> {
    const [auraProfile, memories] = await Promise.all([
      this.prisma.auraProfile.findUnique({
        where: { userId: user.id },
      }),
      this.prisma.memorySummary.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { type: true, content: true },
      }),
    ]);

    const auraContext: AuraContext = {
      mode: (auraProfile?.mode as AuraContext["mode"]) ?? "GLOW",
      sliders: auraProfile
        ? {
            warmth: auraProfile.warmth,
            humor: auraProfile.humor,
            directness: auraProfile.directness,
            energy: auraProfile.energy,
          }
        : undefined,
      customPrompt: auraProfile?.customPrompt,
    };

    const userContext: UserContext = {
      userId: user.id,
      firstName: user.firstName,
      timezone: user.timezone,
      plan: user.plan,
      goals,
      memories,
    };

    return { auraContext, userContext };
  }
}
