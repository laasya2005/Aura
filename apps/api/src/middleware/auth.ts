import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken, type TokenPayload } from "@aura/shared";

const BLACKLIST_PREFIX = "bl:token:";

declare module "fastify" {
  interface FastifyRequest {
    user?: TokenPayload & { iat?: number; exp?: number };
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header" },
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);

    // Check if token has been revoked
    if (payload.jti) {
      const revoked = await request.server.redis.get(`${BLACKLIST_PREFIX}${payload.jti}`);
      if (revoked !== null) {
        return reply.status(401).send({
          success: false,
          error: { code: "TOKEN_REVOKED", message: "Token has been revoked" },
        });
      }
    }

    request.user = payload;
  } catch {
    return reply.status(401).send({
      success: false,
      error: { code: "TOKEN_EXPIRED", message: "Token is invalid or expired" },
    });
  }
}
