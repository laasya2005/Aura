import type { FastifyRequest, FastifyReply } from "fastify";
import type { Redis } from "ioredis";
import { checkRateLimit, RATE_LIMITS, type RateLimitConfig } from "@aura/shared";

export function createRateLimitMiddleware(redis: Redis, config: RateLimitConfig) {
  return async function rateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const key = request.user?.sub ?? request.ip;
    const result = await checkRateLimit(redis, key, config);

    reply.header("X-RateLimit-Limit", config.maxRequests);
    reply.header("X-RateLimit-Remaining", result.remaining);
    reply.header("X-RateLimit-Reset", result.resetAt.toISOString());

    if (!result.allowed) {
      reply.header("Retry-After", Math.ceil(result.retryAfterMs / 1000));
      return reply.status(429).send({
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
      });
    }
  };
}

export { RATE_LIMITS };
