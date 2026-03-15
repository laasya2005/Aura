import type { FastifyRequest, FastifyReply } from "fastify";

function getAdminUserIds(): Set<string> {
  return new Set((process.env.ADMIN_USER_IDS ?? "").split(",").filter(Boolean));
}

export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = request.user?.sub;

  if (!userId || !getAdminUserIds().has(userId)) {
    return reply.status(403).send({
      success: false,
      error: { code: "FORBIDDEN", message: "Admin access required" },
    });
  }
}
