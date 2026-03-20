import type { PrismaClient, Goal } from "@aura/db";
import {
  AppError,
  type AuditLogger,
  AuditActions,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "@aura/shared";

const PLAN_GOAL_LIMITS: Record<string, number> = {
  FREE: 5,
  PRO: 25,
  ELITE: 100,
};

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90, 100, 365] as const;

export class GoalService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditLogger
  ) {}

  async list(userId: string, status?: string): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      where: {
        userId,
        ...(status ? { status: status as Goal["status"] } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(userId: string, goalId: string): Promise<Goal> {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
    });
    if (!goal) throw AppError.notFound("Goal");
    return goal;
  }

  async create(
    userId: string,
    userPlan: string,
    input: CreateGoalInput,
    ip?: string
  ): Promise<Goal> {
    // Check plan limit
    const activeCount = await this.prisma.goal.count({
      where: { userId, status: "ACTIVE" },
    });
    const limit = PLAN_GOAL_LIMITS[userPlan] ?? 2;
    if (activeCount >= limit) {
      throw AppError.planLimit(`${userPlan} plan allows ${limit} active goals. Upgrade for more.`);
    }

    const goal = await this.prisma.goal.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        category: input.category,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      },
    });

    await this.audit({
      userId,
      action: AuditActions.GOAL_CREATED,
      resource: "goal",
      resourceId: goal.id,
      metadata: { title: goal.title, category: goal.category },
      ipAddress: ip,
    });

    return goal;
  }

  async update(userId: string, goalId: string, input: UpdateGoalInput, ip?: string): Promise<Goal> {
    const existing = await this.prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!existing) throw AppError.notFound("Goal");

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.category !== undefined) data.category = input.category;
    if (input.status !== undefined) data.status = input.status;
    if (input.targetDate !== undefined) data.targetDate = new Date(input.targetDate);

    const goal = await this.prisma.goal.update({ where: { id: goalId }, data });

    const action =
      input.status === "COMPLETED" ? AuditActions.GOAL_COMPLETED : AuditActions.GOAL_UPDATED;
    await this.audit({
      userId,
      action,
      resource: "goal",
      resourceId: goalId,
      metadata: { fields: Object.keys(data) },
      ipAddress: ip,
    });

    return goal;
  }

  async delete(userId: string, goalId: string, ip?: string): Promise<void> {
    const existing = await this.prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!existing) throw AppError.notFound("Goal");

    await this.prisma.goal.delete({ where: { id: goalId } });

    await this.audit({
      userId,
      action: "goal.deleted",
      resource: "goal",
      resourceId: goalId,
      ipAddress: ip,
    });
  }

  async recordStreak(
    userId: string,
    goalId: string,
    ip?: string
  ): Promise<{
    goal: Goal;
    milestone: number | null;
  }> {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId, status: "ACTIVE" },
    });
    if (!goal) throw AppError.notFound("Goal");

    // Check if streak already recorded today
    const now = new Date();
    if (goal.lastStreakAt) {
      const lastDate = new Date(goal.lastStreakAt);
      const sameDay =
        lastDate.getFullYear() === now.getFullYear() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getDate() === now.getDate();

      if (sameDay) {
        return { goal, milestone: null }; // Already recorded today
      }

      // Check if streak should reset (more than 1 day gap)
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 2) {
        // Reset streak (gap too large)
        const resetGoal = await this.prisma.goal.update({
          where: { id: goalId },
          data: { currentStreak: 1, lastStreakAt: now },
        });
        return { goal: resetGoal, milestone: null };
      }
    }

    const newStreak = goal.currentStreak + 1;
    const newLongest = Math.max(goal.longestStreak, newStreak);

    const updated = await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastStreakAt: now,
      },
    });

    // Check milestones
    const milestone = STREAK_MILESTONES.find((m) => m === newStreak) ?? null;

    await this.audit({
      userId,
      action: "goal.streak.recorded",
      resource: "goal",
      resourceId: goalId,
      metadata: { streak: newStreak, milestone },
      ipAddress: ip,
    });

    return { goal: updated, milestone };
  }
}
