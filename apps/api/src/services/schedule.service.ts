import type { PrismaClient, Schedule, Prisma, ConsentType } from "@aura/db";
import {
  AppError,
  type AuditLogger,
  type CreateScheduleInput,
  type UpdateScheduleInput,
} from "@aura/shared";
import { addScheduleJob, removeScheduleJob } from "@aura/queue";

// Map schedule channels to the consent type needed
const CHANNEL_CONSENT_MAP: Record<string, ConsentType> = {
  VOICE: "VOICE",
  WHATSAPP: "WHATSAPP",
  SMS: "SMS",
};

const PLAN_SCHEDULE_LIMITS: Record<string, number> = {
  FREE: 10,
  PRO: 25,
  ELITE: 100,
};

export class ScheduleService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditLogger
  ) {}

  async list(userId: string): Promise<Schedule[]> {
    return this.prisma.schedule.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(userId: string, scheduleId: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
    });
    if (!schedule) throw AppError.notFound("Schedule");
    return schedule;
  }

  async create(
    userId: string,
    userPlan: string,
    input: CreateScheduleInput,
    ip?: string
  ): Promise<Schedule> {
    // Check plan limit
    const count = await this.prisma.schedule.count({ where: { userId } });
    const limit = PLAN_SCHEDULE_LIMITS[userPlan] ?? 2;
    if (count >= limit) {
      throw AppError.planLimit(`${userPlan} plan allows ${limit} schedules. Upgrade for more.`);
    }

    // Get user timezone as default
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    const schedule = await this.prisma.schedule.create({
      data: {
        userId,
        type: input.type,
        channel: input.channel,
        cronExpr: input.cronExpr,
        timezone: input.timezone ?? user?.timezone ?? "America/New_York",
        enabled: input.enabled ?? true,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });

    await this.audit({
      userId,
      action: "schedule.created",
      resource: "schedule",
      resourceId: schedule.id,
      metadata: { type: schedule.type, channel: schedule.channel },
      ipAddress: ip,
    });

    // Auto-grant consent for the channel if not already granted (skip if user previously revoked)
    const consentType = CHANNEL_CONSENT_MAP[schedule.channel];
    if (consentType) {
      const existing = await this.prisma.consentRecord.findFirst({
        where: { userId, type: consentType },
        orderBy: { grantedAt: "desc" },
      });
      if (!existing) {
        await this.prisma.consentRecord.create({
          data: { userId, type: consentType, granted: true },
        });
      }
    }

    // Create BullMQ repeatable job
    if (schedule.enabled) {
      await addScheduleJob(
        schedule.id,
        userId,
        schedule.type,
        schedule.cronExpr,
        schedule.timezone,
        schedule.channel
      ).catch(() => {}); // Non-fatal: log failure but don't block
    }

    return schedule;
  }

  async update(
    userId: string,
    scheduleId: string,
    input: UpdateScheduleInput,
    ip?: string
  ): Promise<Schedule> {
    const existing = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
    });
    if (!existing) throw AppError.notFound("Schedule");

    const data: Record<string, unknown> = {};
    if (input.type !== undefined) data.type = input.type;
    if (input.channel !== undefined) data.channel = input.channel;
    if (input.cronExpr !== undefined) data.cronExpr = input.cronExpr;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    const schedule = await this.prisma.schedule.update({
      where: { id: scheduleId },
      data,
    });

    await this.audit({
      userId,
      action: "schedule.updated",
      resource: "schedule",
      resourceId: scheduleId,
      metadata: { fields: Object.keys(data) },
      ipAddress: ip,
    });

    // Update BullMQ job
    if (schedule.enabled) {
      await addScheduleJob(
        schedule.id,
        userId,
        schedule.type,
        schedule.cronExpr,
        schedule.timezone,
        schedule.channel
      ).catch(() => {});
    } else {
      await removeScheduleJob(schedule.id, schedule.type, schedule.channel).catch(() => {});
    }

    return schedule;
  }

  async delete(userId: string, scheduleId: string, ip?: string): Promise<void> {
    const existing = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
    });
    if (!existing) throw AppError.notFound("Schedule");

    await this.prisma.schedule.delete({ where: { id: scheduleId } });

    await this.audit({
      userId,
      action: "schedule.deleted",
      resource: "schedule",
      resourceId: scheduleId,
      ipAddress: ip,
    });

    // Remove BullMQ job
    await removeScheduleJob(scheduleId, existing.type, existing.channel).catch(() => {});
  }
}
