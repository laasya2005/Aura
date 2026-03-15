import type { PrismaClient } from "@aura/db";
import { AppError, ErrorCode, type AuditLogger } from "@aura/shared";
import { randomBytes } from "crypto";

interface GroupInfo {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  memberCount: number;
  members: Array<{
    userId: string;
    firstName?: string | null;
    role: string;
    activeGoals: number;
    totalStreak: number;
  }>;
}

export class GroupService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditLogger
  ) {}

  async createGroup(
    userId: string,
    userPlan: string,
    name: string,
    description?: string
  ): Promise<{ id: string; inviteCode: string }> {
    if (userPlan !== "ELITE") {
      throw new AppError(ErrorCode.UPGRADE_REQUIRED, "Group Auras are an ELITE feature", 403);
    }

    const inviteCode = randomBytes(4).toString("hex");

    const group = await this.prisma.group.create({
      data: {
        name,
        description,
        inviteCode,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });

    await this.audit({
      userId,
      action: "group.created",
      resource: "group",
      resourceId: group.id,
    });

    return { id: group.id, inviteCode: group.inviteCode };
  }

  async joinGroup(userId: string, inviteCode: string): Promise<{ groupId: string }> {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
      include: { members: true },
    });

    if (!group) throw AppError.notFound("Group");

    if (group.members.some((m) => m.userId === userId)) {
      throw AppError.conflict("You are already a member of this group");
    }

    if (group.members.length >= 20) {
      throw new AppError(ErrorCode.PLAN_LIMIT_REACHED, "Group is full (max 20 members)", 403);
    }

    await this.prisma.groupMember.create({
      data: { groupId: group.id, userId, role: "MEMBER" },
    });

    await this.audit({
      userId,
      action: "group.joined",
      resource: "group",
      resourceId: group.id,
    });

    return { groupId: group.id };
  }

  async getGroup(userId: string, groupId: string): Promise<GroupInfo> {
    // Verify membership
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership) throw AppError.notFound("Group");

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                goals: {
                  where: { status: "ACTIVE" },
                  select: { currentStreak: true },
                },
              },
            },
          },
        },
      },
    });

    if (!group) throw AppError.notFound("Group");

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      inviteCode: group.inviteCode,
      memberCount: group.members.length,
      members: group.members.map((m) => ({
        userId: m.user.id,
        firstName: m.user.firstName,
        role: m.role,
        activeGoals: m.user.goals.length,
        totalStreak: m.user.goals.reduce((sum, g) => sum + g.currentStreak, 0),
      })),
    };
  }

  async listUserGroups(
    userId: string
  ): Promise<Array<{ id: string; name: string; memberCount: number; role: string }>> {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: { _count: { select: { members: true } } },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      memberCount: m.group._count.members,
      role: m.role,
    }));
  }

  async leaveGroup(userId: string, groupId: string): Promise<void> {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership) throw AppError.notFound("Group membership");

    if (membership.role === "OWNER") {
      // Transfer ownership or delete group
      const otherMembers = await this.prisma.groupMember.findMany({
        where: { groupId, NOT: { userId } },
        orderBy: { joinedAt: "asc" },
      });

      if (otherMembers.length > 0) {
        await this.prisma.groupMember.update({
          where: { id: otherMembers[0]!.id },
          data: { role: "OWNER" },
        });
      } else {
        // Last member — delete group
        await this.prisma.group.delete({ where: { id: groupId } });
        return;
      }
    }

    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    await this.audit({
      userId,
      action: "group.left",
      resource: "group",
      resourceId: groupId,
    });
  }

  // Get leaderboard (privacy: only streaks and activity, never conversations)
  async getLeaderboard(
    userId: string,
    groupId: string
  ): Promise<
    Array<{
      rank: number;
      firstName: string | null;
      totalStreak: number;
      activeGoals: number;
    }>
  > {
    const group = await this.getGroup(userId, groupId);

    return group.members
      .sort((a, b) => b.totalStreak - a.totalStreak)
      .map((m, i) => ({
        rank: i + 1,
        firstName: m.firstName ?? null,
        totalStreak: m.totalStreak,
        activeGoals: m.activeGoals,
      }));
  }
}
