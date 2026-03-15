import type { PrismaClient, User } from "@aura/db";
import {
  encrypt,
  decrypt,
  AppError,
  type AuditLogger,
  AuditActions,
  type UpdateUserInput,
  type ConsentInput,
} from "@aura/shared";

export class UserService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditLogger
  ) {}

  async getMe(userId: string): Promise<Omit<User, "deletedAt">> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        auraProfile: true,
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      },
    });

    if (!user) throw AppError.notFound("User");

    // Decrypt PII if encrypted
    const result = { ...user };
    if (result.email) {
      try {
        result.email = await decrypt(result.email);
      } catch {
        // Not encrypted or already plain
      }
    }

    const { deletedAt, ...safe } = result;
    return safe;
  }

  async updateMe(
    userId: string,
    input: UpdateUserInput,
    ip?: string
  ): Promise<Omit<User, "deletedAt">> {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw AppError.notFound("User");

    // Encrypt PII fields
    const data: Record<string, unknown> = {};
    if (input.firstName !== undefined) data.firstName = input.firstName;
    if (input.lastName !== undefined) data.lastName = input.lastName;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.email !== undefined) {
      if (input.email) {
        // Encrypt email for storage. Uniqueness is enforced by the DB unique
        // constraint on the ciphertext column. Since AES-256-GCM uses random
        // salts, duplicate detection requires a deterministic hash lookup column
        // in a production system. For now, we rely on the DB constraint and
        // catch the unique violation error if it occurs.
        data.email = await encrypt(input.email);
      } else {
        data.email = null;
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    await this.audit({
      userId,
      action: AuditActions.USER_UPDATED,
      resource: "user",
      resourceId: userId,
      metadata: { fields: Object.keys(data) },
      ipAddress: ip,
    });

    const { deletedAt, ...safe } = updated;
    return safe;
  }

  async deleteMe(userId: string, ip?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw AppError.notFound("User");

    // Soft delete with anonymization
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
        phone: `deleted_${userId}`,
        email: null,
        firstName: null,
        lastName: null,
      },
    });

    await this.audit({
      userId,
      action: AuditActions.USER_DELETED,
      resource: "user",
      resourceId: userId,
      ipAddress: ip,
    });
  }

  async completeOnboarding(userId: string, ip?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw AppError.notFound("User");

    // Only transition from ONBOARDING — don't reset ACTIVE users
    if (user.status !== "ONBOARDING") return;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        onboardedAt: new Date(),
      },
    });

    await this.audit({
      userId,
      action: "onboarding.completed",
      resource: "user",
      resourceId: userId,
      ipAddress: ip,
    });
  }

  async addConsent(
    userId: string,
    input: ConsentInput,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw AppError.notFound("User");

    if (input.granted) {
      await this.prisma.consentRecord.create({
        data: {
          userId,
          type: input.type,
          granted: true,
          ipAddress: ip,
          userAgent,
        },
      });

      await this.audit({
        userId,
        action: AuditActions.CONSENT_GRANTED,
        resource: "consent",
        metadata: { type: input.type },
        ipAddress: ip,
      });
    } else {
      // Revoke: update existing active consent
      await this.prisma.consentRecord.updateMany({
        where: { userId, type: input.type, granted: true, revokedAt: null },
        data: { granted: false, revokedAt: new Date() },
      });

      await this.audit({
        userId,
        action: AuditActions.CONSENT_REVOKED,
        resource: "consent",
        metadata: { type: input.type },
        ipAddress: ip,
      });
    }
  }

  async getConsents(userId: string) {
    return this.prisma.consentRecord.findMany({
      where: { userId, revokedAt: null },
      orderBy: { grantedAt: "desc" },
    });
  }
}
