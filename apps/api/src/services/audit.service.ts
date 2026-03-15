import type { PrismaClient, Prisma } from "@aura/db";
import { createAuditLogger, type AuditLogger } from "@aura/shared";

export function buildAuditLogger(prisma: PrismaClient): AuditLogger {
  return createAuditLogger(async (entry) => {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        metadata: (entry.metadata as Prisma.InputJsonValue) ?? undefined,
        ipAddress: entry.ipAddress,
      },
    });
  });
}
